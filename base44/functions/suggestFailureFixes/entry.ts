import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const { event, data } = body;

  // Only process failure outcomes
  if (data?.outcome !== 'failure') {
    return Response.json({ skipped: true });
  }

  const journalEntry = data;
  const entryId = event?.entity_id;

  // Gather context: linked PrintAnalysis if available
  let analysisDefects = [];
  if (journalEntry.analysis_id) {
    const analysis = await base44.asServiceRole.entities.PrintAnalysis.filter({ id: journalEntry.analysis_id });
    if (analysis?.[0]?.defects?.length) {
      analysisDefects = analysis[0].defects;
    }
  }

  // Also pull recent analyses from the same user to find recurring defects
  const recentAnalyses = await base44.asServiceRole.entities.PrintAnalysis.filter(
    { created_by: journalEntry.created_by },
    '-created_date',
    5
  );
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

  const prompt = `You are an expert FDM 3D printing troubleshooter. A user has marked a print as FAILED.

Print settings:
${printContext || 'Not provided'}

${defectContext}

Generate a concise, actionable list of troubleshooting steps specifically tailored to this failure. 
Focus on the most likely root causes given the settings and defects above.
Return 4-6 steps, each with a short title and a 1-sentence explanation.`;

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
              category: { type: 'string', enum: ['temperature', 'adhesion', 'speed', 'hardware', 'material', 'calibration', 'environment'] }
            }
          }
        }
      }
    }
  });

  // Store the suggestion linked to the journal entry
  await base44.asServiceRole.entities.FailureSuggestion.create({
    journal_entry_id: entryId,
    print_title: journalEntry.title || 'Untitled print',
    created_by_user: journalEntry.created_by,
    summary: result.summary,
    steps: result.steps,
    is_read: false,
    printer_model: journalEntry.printer_model || '',
    filament_material: journalEntry.filament_material || '',
  });

  return Response.json({ success: true, steps: result.steps?.length });
});