import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { problemDescription, solutionDescription, defectType } = await req.json();
    
    if (!problemDescription || !solutionDescription) {
      return Response.json({ 
        error: 'Problem and solution descriptions are required' 
      }, { status: 400 });
    }

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a 3D printing expert helping users document their solutions clearly.

Problem: ${problemDescription}
Solution Applied: ${solutionDescription}
${defectType ? `Defect Type: ${defectType}` : ''}

Format this solution into clear, numbered steps that other users can follow.
Make it concise, actionable, and specific. Include any relevant settings, measurements, or timing.

Also provide:
1. Troubleshooting notes: Common issues people may encounter when following these steps
2. Common pitfalls: Mistakes to avoid
3. Suggested printer models: 3-5 printer model names that commonly face this issue and would benefit from this solution
4. Suggested materials: 2-4 filament material types that are most relevant to this problem/solution

Return a JSON object with:
- "formatted_steps": array of clear, actionable step strings
- "key_actions": array of 2-3 main actions (short phrases like "Increase temperature", "Clean nozzle")
- "difficulty": "easy", "moderate", or "advanced"
- "estimated_time": estimated time in minutes (number)
- "troubleshooting_notes": array of strings describing issues people may encounter while following the steps (optional, 1-3 items)
- "common_pitfalls": array of strings describing mistakes to avoid (optional, 1-3 items)
- "suggested_printer_models": array of printer model name strings (e.g. "Creality Ender 3", "Bambu Lab P1S")
- "suggested_materials": array of material name strings (e.g. "PLA", "PETG", "ABS")

Be practical and specific.`,
      response_json_schema: {
        type: "object",
        properties: {
          formatted_steps: { type: "array", items: { type: "string" } },
          key_actions: { type: "array", items: { type: "string" } },
          difficulty: { type: "string", enum: ["easy", "moderate", "advanced"] },
          estimated_time: { type: "number" },
          troubleshooting_notes: { type: "array", items: { type: "string" } },
          common_pitfalls: { type: "array", items: { type: "string" } },
          suggested_printer_models: { type: "array", items: { type: "string" } },
          suggested_materials: { type: "array", items: { type: "string" } }
        },
        required: ["formatted_steps", "key_actions", "difficulty", "suggested_printer_models", "suggested_materials"]
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});