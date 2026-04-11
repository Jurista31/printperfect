import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { entry_id } = await req.json();
  if (!entry_id) return Response.json({ error: 'entry_id required' }, { status: 400 });

  // Fetch the journal entry
  const entries = await base44.entities.PrintJournalEntry.filter({ id: entry_id });
  const entry = entries?.[0];
  if (!entry) return Response.json({ error: 'Entry not found' }, { status: 404 });
  if (entry.created_by !== user.email) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Build a descriptive prompt from the model filename + print settings
  const filename = entry.model_filename || entry.title || 'unknown model';
  const material = entry.filament_material || 'PLA';
  const color = entry.filament_color || 'white';
  const printer = entry.printer_model || '3D printer';

  // Infer shape/object type from filename
  const nameHint = filename
    .replace(/\.(stl|3mf|obj)$/i, '')
    .replace(/[-_]/g, ' ')
    .toLowerCase();

  const prompt = `A clean, photorealistic 3D render of a freshly printed FDM 3D model: "${nameHint}". 
Printed in ${color} ${material} filament on a ${printer}. 
The object sits on a dark slate surface with soft studio lighting. 
The render shows fine layer lines typical of FDM printing, slight matte texture. 
No background clutter — just the object centered, slightly angled top-down perspective. 
Professional product photography style, sharp focus.`;

  const { url: thumbnail_url } = await base44.integrations.Core.GenerateImage({ prompt });

  // Save thumbnail back to the journal entry
  await base44.entities.PrintJournalEntry.update(entry_id, {
    model_thumbnail_url: thumbnail_url,
  });

  return Response.json({ thumbnail_url });
});