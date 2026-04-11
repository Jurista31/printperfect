import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Parse body — automation runs send { automation, args }; frontend calls send nothing or {}.
  let body = {};
  try { body = await req.json(); } catch (_) { /* no body */ }

  const expectedSecret = Deno.env.get('AUTOMATION_SECRET');
  const providedSecret = body?.args?.secret;

  let targetUsers = [];

  if (expectedSecret && providedSecret === expectedSecret) {
    // Verified scheduled automation — safe to run for all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    targetUsers = allUsers;
  } else {
    // Regular call — authenticate the requesting user only
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    targetUsers = [user];
  }

  const now = new Date();
  const recent30Start = new Date(now - 30 * 86400000);
  const prior30Start  = new Date(now - 60 * 86400000);
  const allResults = [];

  for (const user of targetUsers) {
    const entries = await base44.asServiceRole.entities.PrintJournalEntry.filter(
      { created_by: user.email },
      '-print_date',
      500
    );

    if (entries.length < 5) continue;

    // Group by printer_model + material
    const groups = {};
    for (const e of entries) {
      const key = `${e.printer_model || 'Unknown'}|||${e.filament_material || 'Unknown'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }

    const analysisInputs = [];

    for (const [key, groupEntries] of Object.entries(groups)) {
      const [printer, material] = key.split('|||');
      if (groupEntries.length < 4) continue;

      const recent = groupEntries.filter(e => e.print_date && new Date(e.print_date) >= recent30Start);
      const prior  = groupEntries.filter(e => e.print_date && new Date(e.print_date) >= prior30Start && new Date(e.print_date) < recent30Start);

      if (recent.length < 2) continue;

      const recentFailRate = recent.filter(e => e.outcome === 'failure' || e.outcome === 'partial').length / recent.length;
      const priorFailRate  = prior.length > 0
        ? prior.filter(e => e.outcome === 'failure' || e.outcome === 'partial').length / prior.length
        : null;

      // Aggregate defect hints from tags + notes
      const recentTags = recent.flatMap(e => e.tags || []).join(', ');
      const recentNotes = recent.filter(e => e.notes).map(e => e.notes).slice(0, 5).join(' | ');

      analysisInputs.push({
        printer,
        material,
        recentFailRate: Math.round(recentFailRate * 100),
        priorFailRate: priorFailRate !== null ? Math.round(priorFailRate * 100) : null,
        recentCount: recent.length,
        priorCount: prior.length,
        totalCount: groupEntries.length,
        recentTags,
        recentNotes: recentNotes.slice(0, 400),
      });
    }

    if (analysisInputs.length === 0) continue;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a 3D printing failure analyst. Analyze this data and identify statistically concerning trends.

Data per printer+material combination:
${JSON.stringify(analysisInputs, null, 2)}

For each combo where there is a NOTABLE rising trend or persistent problem (recent failure rate >= 40%, OR failure rate rose by >= 20 percentage points from prior period, OR tags/notes suggest a repeating specific defect like stringing/warping/adhesion):
- Identify the specific defect type if discernible from tags/notes
- Rate severity: "info" (mild trend), "warning" (notable), "critical" (>60% failure rate or sharp spike)
- Give a concise 1-sentence message and a 2-3 sentence explanation
- Give one concrete recommended action

Return ONLY a JSON array (can be empty []) of alerts:
[{
  "printer_model": string,
  "material": string,
  "defect_type": string (stringing|bed_adhesion|warping|layer_shift|under_extrusion|blobs|general_failure),
  "severity": "info"|"warning"|"critical",
  "message": string (max 80 chars),
  "details": string,
  "recommended_action": string,
  "failure_rate_recent": number,
  "failure_rate_prior": number|null,
  "sample_size": number
}]`,
      response_json_schema: {
        type: 'object',
        properties: {
          alerts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                printer_model: { type: 'string' },
                material: { type: 'string' },
                defect_type: { type: 'string' },
                severity: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'string' },
                recommended_action: { type: 'string' },
                failure_rate_recent: { type: 'number' },
                failure_rate_prior: { type: 'number' },
                sample_size: { type: 'number' },
              }
            }
          }
        }
      }
    });

    const alerts = aiResponse?.alerts || [];

    // Delete stale unread alerts + prepare new ones — run deletes in parallel
    const existing = await base44.asServiceRole.entities.TrendAlert.filter({ user_email: user.email });
    const toDelete = existing.filter(a => !a.is_read && !a.is_dismissed);
    await Promise.all(toDelete.map(old => base44.asServiceRole.entities.TrendAlert.delete(old.id)));

    // Save new alerts in parallel
    const periodLabel = `${recent30Start.toISOString().slice(0, 10)} – ${now.toISOString().slice(0, 10)}`;
    await Promise.all(alerts.map(alert => base44.asServiceRole.entities.TrendAlert.create({
      ...alert,
      user_email: user.email,
      is_read: false,
      is_dismissed: false,
      period_analyzed: periodLabel,
    })));

    allResults.push({ user: user.email, alertsCreated: alerts.length });
  }

  return Response.json({ ok: true, results: allResults });
});