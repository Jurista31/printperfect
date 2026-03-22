import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Use AI to format the solution into clear, actionable steps
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a 3D printing expert helping users document their solutions clearly.

Problem: ${problemDescription}
Solution Applied: ${solutionDescription}
${defectType ? `Defect Type: ${defectType}` : ''}

Format this solution into clear, numbered steps that other users can follow. 
Make it concise, actionable, and specific. Include any relevant settings, measurements, or timing.

Return a JSON object with:
- "formatted_steps": array of clear, actionable step strings
- "key_actions": array of 2-3 main actions (short phrases like "Increase temperature", "Clean nozzle")
- "difficulty": "easy", "moderate", or "advanced"
- "estimated_time": estimated time in minutes

Be practical and specific.`,
      response_json_schema: {
        type: "object",
        properties: {
          formatted_steps: {
            type: "array",
            items: { type: "string" }
          },
          key_actions: {
            type: "array",
            items: { type: "string" }
          },
          difficulty: {
            type: "string",
            enum: ["easy", "moderate", "advanced"]
          },
          estimated_time: {
            type: "number"
          }
        },
        required: ["formatted_steps", "key_actions", "difficulty"]
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});