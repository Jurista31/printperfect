import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch journal entries and linked analyses in parallel
  const [entries, analyses] = await Promise.all([
    base44.entities.PrintJournalEntry.list('-print_date', 300),
    base44.entities.PrintAnalysis.list('-created_date', 200),
  ]);

  if (entries.length < 3) {
    return Response.json({ error: 'Not enough data', message: 'Log at least 3 prints to run diagnostics.' }, { status: 422 });
  }

  // Build a compact summary of prints for the LLM (avoid token bloat)
  const printSummary = entries.slice(0, 100).map(e => ({
    outcome: e.outcome,
    material: e.filament_material,
    printer: e.printer_model,
    nozzle_temp: e.nozzle_temp,
    bed_temp: e.bed_temp,
    print_speed: e.print_speed,
    layer_height: e.layer_height,
    infill: e.infill_percent,
    ambient_temp: e.ambient_temp,
    humidity: e.ambient_humidity,
    duration_min: e.duration_minutes,
    tags: e.tags?.join(','),
    notes: e.notes?.slice(0, 80),
    date: e.print_date,
  }));

  // Collect defect names from linked analyses
  const defectFreq = {};
  analyses.forEach(a => {
    (a.defects || []).forEach(d => {
      defectFreq[d.name] = (defectFreq[d.name] || 0) + 1;
    });
  });
  const topDefects = Object.entries(defectFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const stats = {
    total: entries.length,
    failures: entries.filter(e => e.outcome === 'failure').length,
    partials: entries.filter(e => e.outcome === 'partial').length,
    topDefects,
  };

  const prompt = `You are an expert FDM 3D printing engineer analyzing a user's print history to find failure patterns and suggest fixes.

PRINT STATISTICS:
- Total prints: ${stats.total}
- Failures: ${stats.failures} (${Math.round(stats.failures/stats.total*100)}%)
- Partials: ${stats.partials}
- Most common AI-detected defects: ${JSON.stringify(stats.topDefects)}

RECENT PRINT DATA (up to 100 prints, each row = one print):
${JSON.stringify(printSummary, null, 1)}

Analyze this data deeply and return a diagnostics report with:
1. 3-5 identified failure patterns (correlate defect types with environmental or slicer conditions)
2. For each pattern: what conditions trigger it, which specific setting changes fix it
3. An "optimal settings profile" for their most-used material/printer combo
4. 3 highest-priority actionable fixes to implement right now
5. Environmental risk factors (humidity/temp ranges that correlate with failures)

Be specific with numbers (e.g. "reduce print speed from 60 to 45 mm/s", "keep humidity below 55%").`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    model: 'claude_sonnet_4_6',
    response_json_schema: {
      type: 'object',
      properties: {
        failure_patterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              frequency: { type: 'string' },
              trigger_conditions: { type: 'array', items: { type: 'string' } },
              correlated_settings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    setting: { type: 'string' },
                    problem_value: { type: 'string' },
                    recommended_value: { type: 'string' },
                  }
                }
              },
              severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            }
          }
        },
        optimal_profile: {
          type: 'object',
          properties: {
            material: { type: 'string' },
            printer: { type: 'string' },
            settings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  parameter: { type: 'string' },
                  value: { type: 'string' },
                  rationale: { type: 'string' },
                }
              }
            }
          }
        },
        priority_fixes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              detail: { type: 'string' },
              impact: { type: 'string', enum: ['high', 'medium', 'low'] },
              category: { type: 'string' },
            }
          }
        },
        environmental_risks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              factor: { type: 'string' },
              risk_range: { type: 'string' },
              safe_range: { type: 'string' },
              effect: { type: 'string' },
            }
          }
        },
        overall_health_score: { type: 'number' },
        health_summary: { type: 'string' },
      }
    }
  });

  return Response.json({ ...result, stats });
});