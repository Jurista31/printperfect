import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const { event, data, automation, args } = body;

  // Verify shared secret when configured — set AUTOMATION_SECRET env var and
  // set the same value as function_args.secret on the automation to enable this.
  const expectedSecret = Deno.env.get('AUTOMATION_SECRET');
  if (!expectedSecret) {
    return Response.json({ error: 'Server misconfiguration: AUTOMATION_SECRET is not set' }, { status: 500 });
  }
  if (args?.secret !== expectedSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate this request originates from a platform entity automation
  if (!automation?.id || !event?.entity_id || event?.entity_name !== 'PrintJournalEntry') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch the journal entry directly from DB via service role — never trust payload data alone
  const entries = await base44.asServiceRole.entities.PrintJournalEntry.filter({ id: event.entity_id });
  const journalEntry = entries?.[0];

  if (!journalEntry) {
    return Response.json({ error: 'Journal entry not found' }, { status: 404 });
  }

  // Only process failure outcomes
  if (journalEntry.outcome !== 'failure') {
    return Response.json({ skipped: true });
  }

  const entryId = event.entity_id;

  // Fetch linked analysis and recent analyses in parallel
  const [linkedAnalysisArr, recentAnalyses] = await Promise.all([
    journalEntry.analysis_id
      ? base44.asServiceRole.entities.PrintAnalysis.filter({ id: journalEntry.analysis_id })
      : Promise.resolve([]),
    base44.asServiceRole.entities.PrintAnalysis.filter(
      { created_by: journalEntry.created_by },
      '-created_date',
      5
    )
  ]);

  let analysisDefects = [];
  if (linkedAnalysisArr?.[0]?.defects?.length) {
    analysisDefects = linkedAnalysisArr[0].defects;
  }
  const recentDefects = recentAnalyses.flatMap(a => a.defects || []);

  // Build prompt context
  const defectContext = analysisDefects.length > 0
    ? `Defects from linked analysis:\n${analysisDefects.map(d => `- ${d.name} (${d.severity}): ${d.description}`).join('\n')}`
    : recentDefects.length > 0
    ? `Recent defects from this user's history:\n${[...new Set(recentDefects.map(d => d.name))].slice(0, 5).map(n => `- ${n}`).join('\n')}`
    : 'No specific defect data available.';

  const printContext = [
    journalEntry.printer_model && `Printer: ${journalEntry.printer_model}`,
    journalEntry.filament_material && `Material: ${journalEntry.filament_material}`,
    journalEntry.filament_brand && `Brand: ${journalEntry.filament_brand}`,
    journalEntry.nozzle_temp && `Nozzle: ${journalEntry.nozzle_temp}°C`,
    journalEntry.bed_temp && `Bed: ${journalEntry.bed_temp}°C`,
    journalEntry.print_speed && `Speed: ${journalEntry.print_speed}mm/s`,
    journalEntry.layer_height && `Layer height: ${journalEntry.layer_height}mm`,
    journalEntry.ambient_temp && `Room temp: ${journalEntry.ambient_temp}°C`,
    journalEntry.ambient_humidity && `Humidity: ${journalEntry.ambient_humidity}%`,
    journalEntry.notes && `Notes: ${journalEntry.notes}`,
  ].filter(Boolean).join('\n');

  // Pull defect solutions/causes from the linked analysis for richer context
  const defectDetails = analysisDefects.length > 0
    ? analysisDefects.map(d =>
        `- [${d.severity?.toUpperCase()}] ${d.name}: ${d.description}\n  Root causes: ${(d.causes || []).slice(0, 3).join('; ')}\n  Known fixes: ${(d.solutions || []).slice(0, 3).join('; ')}`
      ).join('\n')
    : recentDefects.length > 0
    ? [...new Set(recentDefects.map(d => d.name))].slice(0, 5).map(n => `- ${n}`).join('\n')
    : 'No specific defect data available.';

  const prompt = `You are an expert FDM 3D printing troubleshooter. A user has marked a print as FAILED.

=== PRINT SETTINGS ===
${printContext || 'Not provided'}

=== DETECTED DEFECTS (from linked AI analysis) ===
${defectDetails}

Generate 4-6 highly specific, actionable troubleshooting steps tailored to these exact defects and settings.

For EACH step:
- Reference the specific defect it addresses (if applicable)
- Specify which JournalForm setting field to adjust: one of [nozzle_temp, bed_temp, print_speed, layer_height, infill_percent, ambient_temp, ambient_humidity, filament_brand, filament_material, notes]
- Specify a material property to investigate if relevant (e.g. "moisture content", "glass transition temp", "print temp range")
- Give the recommended change direction and magnitude (e.g. "increase nozzle_temp by 5-10°C")
- Assign a priority: critical | important | minor

Return a one-sentence diagnosis summary and the step list.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'One sentence diagnosis summary' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              detail: { type: 'string' },
              category: { type: 'string', enum: ['temperature', 'adhesion', 'speed', 'hardware', 'material', 'calibration', 'environment'] },
              defect_link: { type: 'string', description: 'Name of the specific defect this step addresses' },
              setting_to_adjust: { type: 'string', description: 'JournalForm field name to adjust' },
              setting_change: { type: 'string', description: 'Human-readable recommended change, e.g. +5-10°C' },
              material_property: { type: 'string', description: 'Material property to investigate if relevant' },
              priority: { type: 'string', enum: ['critical', 'important', 'minor'] }
            }
          }
        }
      }
    }
  });

  // Store suggestion + send email in parallel
  const printTitle = journalEntry.title || 'Untitled print';
  const stepsList = (result.steps || [])
    .map((s, i) => `${i + 1}. <strong>${s.title}</strong> — ${s.detail}`)
    .join('<br/>');

  const savePromise = base44.asServiceRole.entities.FailureSuggestion.create({
    journal_entry_id: entryId,
    print_title: printTitle,
    created_by_user: journalEntry.created_by,
    summary: result.summary,
    steps: result.steps,
    is_read: false,
    printer_model: journalEntry.printer_model || '',
    filament_material: journalEntry.filament_material || '',
  });

  const emailPromise = journalEntry.created_by
    ? base44.asServiceRole.integrations.Core.SendEmail({
        to: journalEntry.created_by,
        subject: `🔧 Troubleshooting tips ready for: ${printTitle}`,
        body: `<div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#e2e8f0;padding:28px;border-radius:12px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
    <div style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#6366f1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">🖨️</div>
    <span style="font-size:18px;font-weight:700;color:#fff">PrintDoc</span>
  </div>
  <h2 style="color:#fff;font-size:16px;margin-bottom:6px">Troubleshooting tips ready</h2>
  <p style="color:#94a3b8;font-size:13px;margin-bottom:16px">Your print <strong style="color:#e2e8f0">${printTitle}</strong> was marked as a failure. The AI has generated ${result.steps?.length || 0} targeted fix suggestions for you.</p>
  ${result.summary ? `<div style="background:#1e293b;border-left:3px solid #ef4444;padding:12px 14px;border-radius:6px;margin-bottom:20px;font-size:13px;color:#fca5a5">${result.summary}</div>` : ''}
  <div style="margin-bottom:20px">
    <p style="font-size:13px;font-weight:600;color:#cbd5e1;margin-bottom:10px">Suggested steps to try:</p>
    <div style="font-size:13px;line-height:1.8;color:#94a3b8">${stepsList}</div>
  </div>
  <a href="${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#4f46e5);color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none">Open Print Journal →</a>
  <p style="font-size:11px;color:#475569;margin-top:24px">You're receiving this because you logged a failed print in PrintDoc.</p>
</div>`,
      })
    : Promise.resolve();

  await Promise.all([savePromise, emailPromise]);

  return Response.json({ success: true, steps: result.steps?.length });
});