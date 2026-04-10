import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Loader2, ChevronDown, ChevronUp, Image, AlertCircle, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import RootCauseReport from '@/components/failure/RootCauseReport';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    total_failures_analyzed: { type: 'number' },
    patterns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string', description: 'bed_adhesion|thermal_drift|under_extrusion|over_extrusion|stringing|warping|layer_shift|clogging|other' },
          severity: { type: 'string', description: 'low|medium|high' },
          description: { type: 'string' },
          occurrence_count: { type: 'number' },
          total_failures: { type: 'number' },
          evidence: { type: 'array', items: { type: 'string' } },
          calibration_changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                setting: { type: 'string' },
                current: { type: 'string' },
                recommended: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    },
    profile_recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          setting: { type: 'string' },
          current: { type: 'string' },
          recommended: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
};

function FailureEntryRow({ entry, selected, onToggle }) {
  return (
    <button onClick={onToggle}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
        selected ? 'bg-red-500/10 border-red-500/40' : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600'
      )}>
      <div className={cn('w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors',
        selected ? 'bg-red-500 border-red-400' : 'border-slate-600')}>
        {selected && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>
      {entry.image_url ? (
        <img src={entry.image_url} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
          <Image className="w-4 h-4 text-slate-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{entry.title}</p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-slate-500">
          {entry.print_date && <span>{format(parseISO(entry.print_date), 'MMM d, yyyy')}</span>}
          {entry.printer_model && <span>{entry.printer_model}</span>}
          {entry.filament_material && <span>{entry.filament_material}</span>}
          {entry.nozzle_temp && <span>{entry.nozzle_temp}°C nozzle</span>}
          {entry.bed_temp && <span>{entry.bed_temp}°C bed</span>}
        </div>
        {entry.notes && <p className="text-xs text-slate-600 mt-0.5 truncate">{entry.notes}</p>}
      </div>
    </button>
  );
}

export default function FailureAnalyzer() {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterPrinter, setFilterPrinter] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const { data: allEntries = [] } = useQuery({
    queryKey: ['print-journal'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 500),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['printer-profiles'],
    queryFn: () => base44.entities.PrinterProfile.list('-created_date', 20),
  });

  const failures = useMemo(() => {
    return allEntries.filter(e => e.outcome === 'failure' || e.outcome === 'partial');
  }, [allEntries]);

  const printerModels = useMemo(() => [...new Set(failures.map(e => e.printer_model).filter(Boolean))], [failures]);

  const filtered = useMemo(() => {
    if (!filterPrinter) return failures;
    return failures.filter(e => e.printer_model === filterPrinter);
  }, [failures, filterPrinter]);

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(e => e.id)));
  };

  const toggle = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedEntries = filtered.filter(e => selectedIds.has(e.id));

  const activeProfile = useMemo(() => {
    if (!filterPrinter) return null;
    return profiles.find(p => p.printer_model === filterPrinter);
  }, [filterPrinter, profiles]);

  const analyze = async () => {
    if (selectedEntries.length === 0) return;
    setAnalyzing(true);
    setReport(null);
    setError(null);

    const imageUrls = selectedEntries.map(e => e.image_url).filter(Boolean);

    const logsText = selectedEntries.map((e, i) => {
      const lines = [
        `--- Failure #${i + 1}: "${e.title}" (${e.print_date}) ---`,
        `Outcome: ${e.outcome}`,
        e.printer_model   && `Printer: ${e.printer_model}`,
        e.filament_material && `Material: ${e.filament_material} ${e.filament_brand || ''}`.trim(),
        e.nozzle_temp     && `Nozzle Temp: ${e.nozzle_temp}°C`,
        e.bed_temp        && `Bed Temp: ${e.bed_temp}°C`,
        e.print_speed     && `Print Speed: ${e.print_speed} mm/s`,
        e.layer_height    && `Layer Height: ${e.layer_height} mm`,
        e.infill_percent  && `Infill: ${e.infill_percent}%`,
        e.ambient_temp    && `Ambient Temp: ${e.ambient_temp}°C`,
        e.ambient_humidity && `Ambient Humidity: ${e.ambient_humidity}%`,
        e.duration_minutes && `Duration: ${e.duration_minutes} min`,
        e.notes           && `Notes: ${e.notes}`,
        e.tags?.length    && `Tags: ${e.tags.join(', ')}`,
      ].filter(Boolean).join('\n');
      return lines;
    }).join('\n\n');

    const profileText = activeProfile ? `
Current printer profile for ${activeProfile.printer_model}:
- Default nozzle temp: ${activeProfile.default_nozzle_temp || 'unknown'}°C
- Default bed temp: ${activeProfile.default_bed_temp || 'unknown'}°C
- Default print speed: ${activeProfile.default_print_speed || 'unknown'} mm/s
- Default layer height: ${activeProfile.default_layer_height || 'unknown'} mm
- Firmware: ${activeProfile.firmware_version || 'unknown'}
- Notes: ${activeProfile.notes || 'none'}
` : '';

    const prompt = `You are an expert 3D printing engineer. Analyze the following ${selectedEntries.length} failed/partial print logs and sensor data${imageUrls.length > 0 ? ', plus the provided failure photos' : ''} to identify root-cause failure patterns and suggest precise calibration changes.

${logsText}
${profileText}

For each root cause pattern found:
1. Name it clearly (e.g., "Thermal Drift at High Ambient Temp")
2. Categorize it (bed_adhesion, thermal_drift, under_extrusion, over_extrusion, stringing, warping, layer_shift, clogging, or other)
3. Assess severity (low/medium/high)
4. List evidence from the logs/photos
5. Provide specific calibration_changes with setting name, current value (if known), recommended value, and a short reason

Also provide consolidated printer profile_recommendations that summarize the most important changes across all patterns.

Be precise with numeric values (e.g., "Nozzle Temp: 200°C → 215°C") and mechanical advice.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: RESPONSE_SCHEMA,
      file_urls: imageUrls.slice(0, 5),
      model: 'claude_sonnet_4_6',
    });

    setReport(result);
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-red-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-orange-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Failure Analyzer</h1>
            <p className="text-xs text-slate-500">AI root-cause analysis from your print logs</p>
          </div>
        </motion.div>

        {!report && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Printer filter */}
            {printerModels.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <button onClick={() => setFilterPrinter('')}
                  className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors',
                    !filterPrinter ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400')}>
                  All
                </button>
                {printerModels.map(m => (
                  <button key={m} onClick={() => setFilterPrinter(m)}
                    className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors',
                      filterPrinter === m ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-400')}>
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* Select all */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{filtered.length} failure{filtered.length !== 1 ? 's' : ''} — {selectedIds.size} selected</p>
                <button onClick={toggleAll} className="text-xs text-cyan-400 hover:text-cyan-300">
                  {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
            )}

            {/* Failure list */}
            {filtered.length === 0 ? (
              <div className="text-center py-14 text-slate-600">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No failure or partial prints logged yet.</p>
                <p className="text-xs mt-1">Log prints in the Journal with outcome = failure.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(e => (
                  <FailureEntryRow key={e.id} entry={e} selected={selectedIds.has(e.id)} onToggle={() => toggle(e.id)} />
                ))}
              </div>
            )}

            {/* Analyze button */}
            {selectedIds.size > 0 && (
              <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                onClick={analyze} disabled={analyzing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                {analyzing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing {selectedIds.size} print{selectedIds.size !== 1 ? 's' : ''}…</>
                  : <><FlaskConical className="w-4 h-4" /> Analyze {selectedIds.size} Failure{selectedIds.size !== 1 ? 's' : ''}</>
                }
              </motion.button>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">{error}</div>
            )}
          </motion.div>
        )}

        {/* Report */}
        <AnimatePresence>
          {report && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <RootCauseReport report={report} printerModel={filterPrinter || selectedEntries[0]?.printer_model} />
              <button onClick={() => { setReport(null); }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-all">
                ← Analyze Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}