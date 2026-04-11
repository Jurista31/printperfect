import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { entry_id_a, entry_id_b } = await req.json();
  if (!entry_id_a || !entry_id_b) return Response.json({ error: 'Both entry IDs required' }, { status: 400 });

  // Fetch both entries + their linked analyses in parallel
  const [entriesA, entriesB] = await Promise.all([
    base44.entities.PrintJournalEntry.filter({ id: entry_id_a }),
    base44.entities.PrintJournalEntry.filter({ id: entry_id_b }),
  ]);

  const entryA = entriesA?.[0];
  const entryB = entriesB?.[0];
  if (!entryA || !entryB) return Response.json({ error: 'Entry not found' }, { status: 404 });

  // Fetch linked analyses in parallel (if any)
  const [analysisAArr, analysisBArr] = await Promise.all([
    entryA.analysis_id ? base44.entities.PrintAnalysis.filter({ id: entryA.analysis_id }) : Promise.resolve([]),
    entryB.analysis_id ? base44.entities.PrintAnalysis.filter({ id: entryB.analysis_id }) : Promise.resolve([]),
  ]);
  const analysisA = analysisAArr?.[0] || null;
  const analysisB = analysisBArr?.[0] || null;

  const formatEntry = (e, analysis) => `
Title: ${e.title}
Outcome: ${e.outcome}
Date: ${e.print_date || 'unknown'}
Printer: ${e.printer_model || '—'}
Material: ${e.filament_material || '—'} ${e.filament_brand ? `(${e.filament_brand})` : ''}
Nozzle Temp: ${e.nozzle_temp != null ? e.nozzle_temp + '°C' : '—'}
Bed Temp: ${e.bed_temp != null ? e.bed_temp + '°C' : '—'}
Print Speed: ${e.print_speed != null ? e.print_speed + 'mm/s' : '—'}
Layer Height: ${e.layer_height != null ? e.layer_height + 'mm' : '—'}
Infill: ${e.infill_percent != null ? e.infill_percent + '%' : '—'}
Ambient Temp: ${e.ambient_temp != null ? e.ambient_temp + '°C' : '—'}
Ambient Humidity: ${e.ambient_humidity != null ? e.ambient_humidity + '%' : '—'}
Duration: ${e.duration_minutes != null ? e.duration_minutes + 'min' : '—'}
Notes: ${e.notes || 'none'}
${analysis ? `AI-Detected Defects: ${(analysis.defects || []).map(d => `${d.name} (${d.severity})`).join(', ') || 'none'}
AI Quality Rating: ${analysis.overall_quality || '—'}` : 'No linked analysis'}
`.trim();

  const prompt = `You are an expert FDM 3D printing engineer. Compare these two prints and explain why one succeeded and the other did not (or why their outcomes differ). Be specific, practical, and reference the exact settings.

=== PRINT A ===
${formatEntry(entryA, analysisA)}

=== PRINT B ===
${formatEntry(entryB, analysisB)}

Provide:
1. A 2-3 sentence executive summary explaining the key difference in outcomes
2. The top 3 root causes (ranked by likely impact) — specific settings or conditions that likely drove the difference
3. 2-3 concrete actionable recommendations to replicate the better print's success
4. A confidence rating: how confident are you in this analysis given the available data?`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        root_causes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              explanation: { type: 'string' },
              setting_key: { type: 'string' },
              impact: { type: 'string', enum: ['high', 'medium', 'low'] }
            }
          }
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' }
        },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        confidence_reason: { type: 'string' }
      }
    }
  });

  return Response.json(result);
});