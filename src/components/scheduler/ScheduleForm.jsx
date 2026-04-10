import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getStoredAISettings } from '@/hooks/useAISettings';
import OptimalTimeSuggester from './OptimalTimeSuggester';
import { X, Check, Loader2, Upload, FileCode, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const MATERIALS = ['PLA','PETG','ABS','ASA','TPU','Nylon','Resin','Other'];

const Input = ({ className, ...props }) => (
  <input className={cn('w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors', className)} {...props} />
);
const Field = ({ label, children }) => (
  <div><label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>{children}</div>
);

export default function ScheduleForm({ defaultDate, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: '', scheduled_date: defaultDate || '', scheduled_time: '',
    estimated_duration_minutes: '', filament_material: 'PLA', printer_model: '', notes: '',
  });
  const [gcodeFile, setGcodeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: entries = [] } = useQuery({ queryKey: ['print-journal'], queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 200) });
  const { data: profiles = [] } = useQuery({ queryKey: ['printer-profiles-journal'], queryFn: () => base44.entities.PrinterProfile.list('-created_date', 20) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGCodeUpload = async (file) => {
    if (!file) return;
    setGcodeFile(file);
    setValidationResult(null);
    setValidating(true);
    const text = await file.text();
    const preview = text.length > 8000 ? text.slice(0, 4000) + '\n...\n' + text.slice(-2000) : text;
    const aiSettings = getStoredAISettings();
    const res = await base44.functions.invoke('analyzeGCode', {
      gcode: preview, filename: file.name,
      settings: { depth: aiSettings.gcodeAnalysisDepth || 'standard', checkTravelMoves: true, checkLayerHeight: true, checkTemperature: true }
    });
    const result = res.data;
    setValidationResult(result);
    if (result?.estimated_print_time) {
      const mins = parseInt(result.estimated_print_time);
      if (!isNaN(mins)) set('estimated_duration_minutes', mins);
    }
    setValidating(false);
  };

  const uploadAndSave = async () => {
    setSaving(true);
    let gcodeUrl = '';
    let gcodeFilename = '';
    if (gcodeFile) {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: gcodeFile });
      gcodeUrl = file_url;
      gcodeFilename = gcodeFile.name;
      setUploading(false);
    }
    const issueCount = validationResult?.issues?.length || 0;
    const validationStatus = !gcodeFile ? 'pending' : issueCount === 0 ? 'passed' : issueCount <= 2 ? 'warnings' : 'failed';
    const payload = {
      ...form,
      estimated_duration_minutes: form.estimated_duration_minutes ? Number(form.estimated_duration_minutes) : undefined,
      gcode_url: gcodeUrl || undefined,
      gcode_filename: gcodeFilename || undefined,
      validation_result: validationResult || undefined,
      validation_status: validationStatus,
      status: 'queued',
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    await base44.entities.PrintSchedule.create(payload);
    setSaving(false);
    onSave();
  };

  const validationStatus = validationResult
    ? validationResult.issues?.length === 0 ? 'passed'
      : validationResult.issues?.length <= 2 ? 'warnings' : 'failed'
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h2 className="text-base font-semibold text-white">Schedule a Print</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <Field label="Print Title *">
          <Input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Benchy v3" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *">
            <Input type="date" required value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
          </Field>
        </div>

        {/* Optimal time suggester */}
        <OptimalTimeSuggester entries={entries} material={form.filament_material}
          onSelectTime={t => set('scheduled_time', t)} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Material">
            <select value={form.filament_material} onChange={e => set('filament_material', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60">
              {MATERIALS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Printer">
            {profiles.length > 0 ? (
              <select value={form.printer_model} onChange={e => set('printer_model', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60">
                <option value="">— Select —</option>
                {profiles.map(p => <option key={p.id} value={p.printer_model}>{p.name}</option>)}
              </select>
            ) : (
              <Input value={form.printer_model} onChange={e => set('printer_model', e.target.value)} placeholder="e.g. Ender 3" />
            )}
          </Field>
        </div>

        <Field label="Est. Duration (min)">
          <Input type="number" value={form.estimated_duration_minutes} onChange={e => set('estimated_duration_minutes', e.target.value)} placeholder="Auto-filled from G-Code" />
        </Field>

        {/* G-Code upload + validation */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">G-Code Pre-Validation</p>
          <label className={cn(
            'flex items-center gap-3 cursor-pointer bg-slate-800 border border-dashed rounded-lg px-4 py-3 transition-colors',
            gcodeFile ? 'border-teal-500/50' : 'border-slate-600 hover:border-cyan-500/50'
          )}>
            <input type="file" accept=".gcode,.gc,.g,.gco" className="hidden"
              onChange={e => handleGCodeUpload(e.target.files[0])} />
            {validating ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /> : <FileCode className="w-4 h-4 text-slate-500" />}
            <span className="text-xs text-slate-400">
              {gcodeFile ? gcodeFile.name : 'Attach .gcode file (optional)'}
            </span>
            {validating && <span className="text-xs text-cyan-400 ml-auto">Validating…</span>}
          </label>

          {validationStatus && (
            <div className={cn('mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
              validationStatus === 'passed' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
              validationStatus === 'warnings' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
              'bg-red-500/10 border-red-500/30 text-red-300'
            )}>
              {validationStatus === 'passed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {validationStatus === 'passed' && 'G-Code looks good — no issues found'}
              {validationStatus === 'warnings' && `${validationResult.issues.length} minor issue(s) — safe to print`}
              {validationStatus === 'failed' && `${validationResult.issues.length} issues detected — review before printing`}
            </div>
          )}
        </div>

        <Field label="Notes">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            placeholder="Any prep notes…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none" />
        </Field>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button type="button" onClick={uploadAndSave} disabled={!form.title || !form.scheduled_date || saving || uploading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
            {(saving || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Queue Print
          </button>
        </div>
      </div>
    </motion.div>
  );
}