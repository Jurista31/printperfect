import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { gcode, filename } = await req.json();
  if (!gcode) return Response.json({ error: 'No G-code provided' }, { status: 400 });

  // Quick parse to extract basic metrics before sending to LLM
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

  const prompt = `You are an expert FDM 3D printing engineer. Analyze the following G-code file (${filename || 'unknown'}) and provide a detailed assessment.

Pre-parsed metrics:
- Detected layer changes: ~${layerCount}
- Nozzle temp commands: ${nozzleTemp ? nozzleTemp + '°C' : 'not found'}
- Bed temp commands: ${bedTemp ? bedTemp + '°C' : 'not found'}
- Travel moves (G0): ${travelMoves}
- Retraction events: ${retractCount}

G-code content:
\`\`\`
${gcode}
\`\`\`

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