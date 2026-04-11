import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Auth + body + printer profile all in parallel
  const [user, body, profiles] = await Promise.all([
    base44.auth.me(),
    req.json(),
    base44.entities.PrinterProfile.filter({ is_active: true }, '-created_date', 1).catch(() => []),
  ]);

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { gcode, filename, settings = {} } = body;
  const depth = settings.depth || 'standard';
  const checkTravelMoves = settings.checkTravelMoves !== false;
  const checkLayerHeight = settings.checkLayerHeight !== false;
  const checkTemperature = settings.checkTemperature !== false;
  const optimizeSettings = settings.optimizeSettings !== false;
  if (!gcode) return Response.json({ error: 'No G-code provided' }, { status: 400 });

  // Build printer context from pre-fetched profile
  let printerContext = '';
  if (profiles?.length > 0) {
    const p = profiles[0];
    printerContext = `\n\n=== USER'S ACTIVE PRINTER PROFILE ===\nModel: ${p.printer_model}\nNozzle: ${p.nozzle_size || 'unknown'}\nFirmware: ${p.firmware_version || 'unknown'}\nCommon Materials: ${(p.common_materials || []).join(', ')}\nDefault Material: ${p.default_material || 'unknown'}\n${p.default_nozzle_temp ? `Typical Nozzle Temp: ${p.default_nozzle_temp}°C` : ''}\n${p.default_bed_temp ? `Typical Bed Temp: ${p.default_bed_temp}°C` : ''}\n${p.default_print_speed ? `Typical Speed: ${p.default_print_speed}mm/s` : ''}\n${p.default_layer_height ? `Typical Layer Height: ${p.default_layer_height}mm` : ''}\n${p.notes ? `Printer Notes: ${p.notes}` : ''}\n\nIMPORTANT: Tailor all speed/temperature recommendations specifically to this printer. Reference firmware-specific G-code quirks if relevant (e.g. Klipper uses SET_VELOCITY_LIMIT, Marlin uses M203/M204). Suggest values within this printer's typical operating range.`;
  }

  // Quick parse to extract basic metrics
  const lines = gcode.split('\n');
  let layerCount = 0;
  let nozzleTemp = null;
  let bedTemp = null;
  let printSpeed = null;
  let travelMoves = 0;
  let retractCount = 0;

  for (const line of lines) {
    const l = line.trim().toUpperCase();
    if (l.startsWith(';LAYER_COUNT:') || l.includes(';LAYER:')) layerCount++;
    if (l.startsWith('M104 S') || l.startsWith('M109 S')) {
      const m = l.match(/S(\d+)/);
      if (m) nozzleTemp = parseInt(m[1]);
    }
    if (l.startsWith('M140 S') || l.startsWith('M190 S')) {
      const m = l.match(/S(\d+)/);
      if (m) bedTemp = parseInt(m[1]);
    }
    if (l.startsWith('G1') && l.includes('F') && !l.includes('X') && !l.includes('Y')) {
      const m = l.match(/F(\d+)/);
      if (m && !printSpeed) printSpeed = Math.round(parseInt(m[1]) / 60);
    }
    if (l.startsWith('G0')) travelMoves++;
    if (l.startsWith('G1') && l.includes('E-')) retractCount++;
  }

  const depthInstruction = depth === 'quick'
    ? 'QUICK SCAN MODE: Identify only the top 3 most critical issues. Keep suggestions brief.'
    : depth === 'deep'
    ? 'DEEP DIVE MODE: Be exhaustive. Check every aspect in detail. Report all issues no matter how minor.'
    : 'STANDARD MODE: Balanced analysis covering key issues and suggestions.';

  const checksInstruction = [
    !checkTravelMoves && 'SKIP travel move analysis.',
    !checkLayerHeight && 'SKIP layer height consistency checks.',
    !checkTemperature && 'SKIP temperature command analysis.',
    !optimizeSettings && 'SKIP optimized settings suggestions (return empty array).',
  ].filter(Boolean).join(' ');

  const prompt = `You are an expert FDM 3D printing engineer. Analyze the following G-code file (${filename || 'unknown'}) and provide a detailed assessment.

${depthInstruction}${checksInstruction ? '\n' + checksInstruction : ''}

G-code content (first 6000 chars):
\`\`\`
${gcode.slice(0, 6000)}
\`\`\`
${printerContext}

Analyze and return a JSON report with:
1. Estimated print time (string like "2h 15m")
2. Layer count (number)
3. Print speed in mm/s (number)
4. Nozzle temp (number, °C)
5. Summary — 2-3 sentence overall assessment of the print job and model geometry complexity
6. Geometry description — describe the model type detected from the G-code patterns (e.g. "flat base with tall vertical walls", "complex organic shape", "hollow shell with supports")
7. Issues — list of problems: layer height inconsistencies, long travel moves without retraction, missing temp changes, unsafe speed ramps, etc.
8. Optimized settings — list of suggested setting improvements based on the geometry

For issues, include:
- title, description, severity (high/medium/low), fix suggestion, optional line_number, optional gcode_snippet

For optimized_settings, include:
- setting name, current value (string), recommended value (string), reason`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        estimated_print_time: { type: 'string' },
        layer_count: { type: 'number' },
        nozzle_temp: { type: 'number' },
        print_speed: { type: 'number' },
        summary: { type: 'string' },
        geometry: { type: 'string' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              severity: { type: 'string', enum: ['high', 'medium', 'low'] },
              fix: { type: 'string' },
              line_number: { type: 'number' },
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