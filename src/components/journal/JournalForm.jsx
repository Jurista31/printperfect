import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Check, Upload, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Other'];
const OUTCOMES = [
  { value: 'success', label: '✅ Success', bg: 'bg-green-500/20 border-green-500/50 text-green-300' },
  { value: 'partial', label: '⚠️ Partial', bg: 'bg-amber-500/20 border-amber-500/50 text-amber-300' },
  { value: 'failure', label: '❌ Failure', bg: 'bg-red-500/20 border-red-500/50 text-red-300' },
];

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const Input = ({ className, ...props }) => (
  <input
    className={cn(
      "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors",
      className
    )}
    {...props}
  />
);

export default function JournalForm({ initialEntry, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    title: '',
    outcome: 'success',
    print_date: today,
    printer_model: '',
    filament_brand: '',
    filament_material: 'PLA',
    filament_color: '',
    nozzle_temp: '',
    bed_temp: '',
    print_speed: '',
    layer_height: '',
    infill_percent: '',
    ambient_temp: '',
    ambient_humidity: '',
    duration_minutes: '',
    notes: '',
    analysis_id: '',
    image_url: '',
    tags: [],
    ...initialEntry,
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses-for-journal'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 30),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['printer-profiles-journal'],
    queryFn: () => base44.entities.PrinterProfile.list('-created_date', 20),
  });

  const { data: filamentProfiles = [] } = useQuery({
    queryKey: ['filament-profiles-journal'],
    queryFn: () => base44.entities.FilamentProfile.list('-created_date', 100),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleBrandChange = (brand) => {
    set('filament_brand', brand);
    // Find matching filament profile and auto-fill
    const match = filamentProfiles.find(
      fp => fp.brand.toLowerCase() === brand.toLowerCase() && fp.material === form.filament_material
    ) || filamentProfiles.find(
      fp => fp.brand.toLowerCase() === brand.toLowerCase()
    );
    if (match) {
      setForm(f => ({
        ...f,
        filament_brand: brand,
        filament_material: match.material || f.filament_material,
        ...(match.nozzle_temp   && { nozzle_temp:   match.nozzle_temp }),
        ...(match.bed_temp      && { bed_temp:       match.bed_temp }),
        ...(match.print_speed   && { print_speed:    match.print_speed }),
        ...(match.layer_height  && { layer_height:   match.layer_height }),
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('image_url', file_url);
    setUploading(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set('tags', [...form.tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (t) => set('tags', form.tags.filter(x => x !== t));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    // Convert numeric strings
    ['nozzle_temp','bed_temp','print_speed','layer_height','infill_percent','ambient_temp','ambient_humidity','duration_minutes'].forEach(k => {
      if (payload[k] !== '' && payload[k] != null) payload[k] = Number(payload[k]);
      else delete payload[k];
    });
    if (!payload.analysis_id) delete payload.analysis_id;
    if (!payload.image_url) delete payload.image_url;

    if (initialEntry?.id) {
      await base44.entities.PrintJournalEntry.update(initialEntry.id, payload);
    } else {
      await base44.entities.PrintJournalEntry.create(payload);
    }
    setSaving(false);
    onSave();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h2 className="text-base font-semibold text-white">{initialEntry?.id ? 'Edit Entry' : 'Log a Print'}</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Core */}
        <div className="space-y-3">
          <Field label="Print Title *">
            <Input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Benchy v3, Cable Clip…" />
          </Field>

          <Field label="Outcome *">
            <div className="flex gap-2">
              {OUTCOMES.map(o => (
                <button key={o.value} type="button"
                  onClick={() => set('outcome', o.value)}
                  className={cn("flex-1 py-2 rounded-lg border text-xs font-medium transition-all", form.outcome === o.value ? o.bg : 'bg-slate-800 border-slate-700 text-slate-500')}
                >{o.label}</button>
              ))}
            </div>
          </Field>

          <Field label="Print Date *">
            <Input required type="date" value={form.print_date} onChange={e => set('print_date', e.target.value)} />
          </Field>
        </div>

        {/* Link to analysis */}
        {analyses.length > 0 && (
          <Field label="Link to Saved Analysis (optional)">
            <select
              value={form.analysis_id}
              onChange={e => set('analysis_id', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60"
            >
              <option value="">— None —</option>
              {analyses.map(a => (
                <option key={a.id} value={a.id}>
                  {a.overall_quality ? `[${a.overall_quality}] ` : ''}{a.summary?.slice(0, 50) || a.id.slice(0, 12)} · {a.created_date?.slice(0,10)}
                </option>
              ))}
            </select>
          </Field>
        )}

        {/* Printer */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Printer</p>
          <div className="space-y-3">
            <Field label="Printer Model">
              {profiles.length > 0 ? (
                <select
                  value={form.printer_model}
                  onChange={e => set('printer_model', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60"
                >
                  <option value="">Select or type below…</option>
                  {profiles.map(p => <option key={p.id} value={p.printer_model}>{p.name} ({p.printer_model})</option>)}
                </select>
              ) : (
                <Input value={form.printer_model} onChange={e => set('printer_model', e.target.value)} placeholder="e.g. Ender 3 Pro" />
              )}
            </Field>
          </div>
        </div>

        {/* Filament */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Filament</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Material">
              <select
                value={form.filament_material}
                onChange={e => set('filament_material', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60"
              >
                {MATERIALS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Brand">
              <div className="relative">
                <Input
                  list="filament-brands-list"
                  value={form.filament_brand}
                  onChange={e => handleBrandChange(e.target.value)}
                  placeholder="e.g. Hatchbox"
                />
                {filamentProfiles.length > 0 && (
                  <datalist id="filament-brands-list">
                    {Array.from(new Set(filamentProfiles.map(fp => fp.brand))).map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                )}
              </div>
              {filamentProfiles.some(fp => fp.brand.toLowerCase() === form.filament_brand.toLowerCase()) && (
                <p className="mt-1 flex items-center gap-1 text-xs text-cyan-400">
                  <Sparkles className="w-3 h-3" /> Settings auto-filled from your library
                </p>
              )}
            </Field>
            <Field label="Color">
              <Input value={form.filament_color} onChange={e => set('filament_color', e.target.value)} placeholder="e.g. Black" />
            </Field>
          </div>
        </div>

        {/* Print Settings */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Print Settings</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nozzle Temp (°C)">
              <Input type="number" value={form.nozzle_temp} onChange={e => set('nozzle_temp', e.target.value)} placeholder="210" />
            </Field>
            <Field label="Bed Temp (°C)">
              <Input type="number" value={form.bed_temp} onChange={e => set('bed_temp', e.target.value)} placeholder="60" />
            </Field>
            <Field label="Print Speed (mm/s)">
              <Input type="number" value={form.print_speed} onChange={e => set('print_speed', e.target.value)} placeholder="50" />
            </Field>
            <Field label="Layer Height (mm)">
              <Input type="number" step="0.01" value={form.layer_height} onChange={e => set('layer_height', e.target.value)} placeholder="0.2" />
            </Field>
            <Field label="Infill (%)">
              <Input type="number" value={form.infill_percent} onChange={e => set('infill_percent', e.target.value)} placeholder="20" />
            </Field>
            <Field label="Duration (min)">
              <Input type="number" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} placeholder="90" />
            </Field>
          </div>
        </div>

        {/* Ambient */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ambient Conditions</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room Temp (°C)">
              <Input type="number" value={form.ambient_temp} onChange={e => set('ambient_temp', e.target.value)} placeholder="22" />
            </Field>
            <Field label="Humidity (%)">
              <Input type="number" value={form.ambient_humidity} onChange={e => set('ambient_humidity', e.target.value)} placeholder="45" />
            </Field>
          </div>
        </div>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="Any observations, issues, or tips…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none"
          />
        </Field>

        {/* Tags */}
        <Field label="Tags">
          <div className="flex gap-2 mb-2">
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag…" />
            <Button type="button" size="sm" onClick={addTag} variant="outline" className="border-slate-600 text-slate-400 hover:text-white flex-shrink-0">Add</Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map(t => (
                <span key={t} className="flex items-center gap-1 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs px-2 py-0.5 rounded-full">
                  {t}
                  <button type="button" onClick={() => removeTag(t)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </Field>

        {/* Photo */}
        <Field label="Photo">
          <label className="flex items-center gap-3 cursor-pointer bg-slate-800 border border-dashed border-slate-600 rounded-lg px-4 py-3 hover:border-cyan-500/50 transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {uploading ? (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            ) : form.image_url ? (
              <img src={form.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
            ) : (
              <Upload className="w-4 h-4 text-slate-500" />
            )}
            <span className="text-xs text-slate-400">{form.image_url ? 'Change photo' : 'Upload a photo of the print'}</span>
          </label>
        </Field>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-slate-700 text-slate-400">Cancel</Button>
          <Button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Save Entry</>}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}