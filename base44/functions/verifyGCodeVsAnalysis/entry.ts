import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { gcode, filename, defects = [], printer_settings_suggestions = [], overall_quality } = await req.json();
  if (!gcode) return Response.json({ error: 'No G-code provided' }, { status: 400 });

  // Quick parse of key parameters
  const lines = gcode.split('\n');
  let nozzleTemp = null, bedTemp = null, printSpeed = null, retraction = null, fanSpeed = null, layerHeight = null;

  for (const line of lines) {
    const l = line.trim().toUpperCase();
    if ((l.startsWith('M104 S') || l.startsWith('M109 S')) && nozzleTemp === null) {
      const m = l.match(/S(\d+)/); if (m) nozzleTemp = parseInt(m[1]);
    }
    if ((l.startsWith('M140 S') || l.startsWith('M190 S')) && bedTemp === null) {
      const m = l.match(/S(\d+)/); if (m) bedTemp = parseInt(m[1]);
    }
    if (l.startsWith('G1') && l.includes('F') && (l.includes('X') || l.includes('Y')) && printSpeed === null) {
      const m = l.match(/F(\d+)/); if (m) printSpeed = Math.round(parseInt(m[1]) / 60);
    }
    if (l.startsWith('G1') && l.includes('E-') && retraction === null) {
      const m = l.match(/E-([\d.]+)/); if (m) retraction = parseFloat(m[1]);
    }
    if ((l.startsWith('M106 S') || l.startsWith('M106')) && fanSpeed === null) {
      const m = l.match(/S(\d+)/); fanSpeed = m ? Math.round((parseInt(m[1]) / 255) * 100) : 100;
    }
    if (l.startsWith(';LAYER_HEIGHT:') && layerHeight === null) {
      const m = l.match(/:([\d.]+)/); if (m) layerHeight = parseFloat(m[1]);
    }
  }

  // Get printer profile for context
  let printerCtx = '';
  try {
    const profiles = await base44.entities.PrinterProfile.filter({ is_active: true }, '-created_date', 1);
    if (profiles?.length > 0) {
      const p = profiles[0];
      printerCtx = `\nActive Printer: ${p.printer_model} | Nozzle: ${p.nozzle_size || 'unknown'} | Firmware: ${p.firmware_version || 'unknown'} | Default Material: ${p.default_material || 'unknown'}\nTypical settings: nozzle ${p.default_nozzle_temp || '?'}°C, bed ${p.default_bed_temp || '?'}°C, speed ${p.default_print_speed || '?'}mm/s, layer ${p.default_layer_height || '?'}mm`;
    }
  } catch (_) {}

  const defectSummary = defects.length > 0
    ? defects.map(d => `- ${d.name} (${d.severity}): ${d.description || ''}`).join('\n')
    : 'No defects detected in the print analysis.';

  const suggestionSummary = printer_settings_suggestions.length > 0
    ? printer_settings_suggestions.join('\n- ')
    : 'None';

  const parsedParams = [
    nozzleTemp != null && `Nozzle Temp: ${nozzleTemp}°C`,
    bedTemp != null && `Bed Temp: ${bedTemp}°C`,
    printSpeed != null && `Print Speed: ${printSpeed}mm/s`,
    retraction != null && `Retraction: ${retraction}mm`,
    fanSpeed != null && `Fan Speed: ${fanSpeed}%`,
    layerHeight != null && `Layer Height: ${layerHeight}mm`,
  ].filter(Boolean).join(', ');

  const prompt = `You are an expert FDM 3D printing engineer. A user has a print analysis result and is now uploading their G-code file to verify if the slicer settings align with the detected issues.

=== PRINT ANALYSIS RESULTS ===
Overall Quality: ${overall_quality || 'unknown'}
Detected Defects:
${defectSummary}

Existing Suggestions: ${suggestionSummary}

=== G-CODE FILE: ${filename || 'unknown'} ===
Parsed Parameters: ${parsedParams || 'unable to parse'}

Full G-code (first 8000 chars):
\`\`\`
${gcode.slice(0, 8000)}
\`\`\`
${printerCtx}

=== YOUR TASK ===
1. Compare the G-code settings to the detected print defects. Did the slicer settings likely CAUSE or CONTRIBUTE to those defects?
2. Identify any problematic G-code patterns (missing retractions, aggressive speeds, temperature inconsistencies, etc.)
3. Suggest SPECIFIC setting changes in the slicer to fix the detected issues, tailored to the active printer.

Return a JSON with:
- summary: 2-3 sentences assessing whether the G-code settings match/caused the detected issues
- nozzle_temp, bed_temp, print_speed (mm/s), retraction_distance (mm), fan_speed (%), layer_height (mm) — parsed numeric values (null if not found)
- issues: array of problems found in the G-code (with title, description, severity, fix, optional gcode_snippet)
- optimized_settings: array of {setting, current, recommended, reason} — specific slicer changes to address the defects`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        nozzle_temp: { type: 'number' },
        bed_temp: { type: 'number' },
        print_speed: { type: 'number' },
        retraction_distance: { type: 'number' },
        fan_speed: { type: 'number' },
        layer_height: { type: 'number' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              severity: { type: 'string', enum: ['high', 'medium', 'low'] },
              fix: { type: 'string' },
              gcode_snippet: { type: 'string' }
            }
          }
        },
        optimized_settings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              setting: { type: 'string' },
              current: { type: 'string' },
              recommended: { type: 'string' },
              reason: { type: 'string' }
            }
          }
        }
      }
    }
  });

  return Response.json(result);
});