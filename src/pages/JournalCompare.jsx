import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GitCompare, ChevronDown, CheckCircle2, XCircle, AlertCircle, Thermometer, Gauge, Layers, Package, Wind, Clock, Droplets, Percent, Bug, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const OUTCOME_CONFIG = {
  success: { label: 'Success', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  failure: { label: 'Failure', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  partial: { label: 'Partial', icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
};

const SETTINGS = [
  { key: 'filament_material', label: 'Material', icon: Package, unit: '' },
  { key: 'filament_brand', label: 'Filament Brand', icon: Package, unit: '' },
  { key: 'filament_color', label: 'Color', icon: Package, unit: '' },
  { key: 'nozzle_temp', label: 'Nozzle Temp', icon: Thermometer, unit: '°C' },
  { key: 'bed_temp', label: 'Bed Temp', icon: Thermometer, unit: '°C' },
  { key: 'print_speed', label: 'Print Speed', icon: Gauge, unit: 'mm/s' },
  { key: 'layer_height', label: 'Layer Height', icon: Layers, unit: 'mm' },
  { key: 'infill_percent', label: 'Infill', icon: Percent, unit: '%' },
  { key: 'printer_model', label: 'Printer', icon: Gauge, unit: '' },
  { key: 'ambient_temp', label: 'Room Temp', icon: Wind, unit: '°C' },
  { key: 'ambient_humidity', label: 'Humidity', icon: Droplets, unit: '%' },
  { key: 'duration_minutes', label: 'Duration', icon: Clock, unit: 'min' },
];

function EntrySelector({ entries, selected, onChange, label }) {
  const [open, setOpen] = useState(false);
  const entry = entries.find(e => e.id === selected);
  const outcome = entry ? OUTCOME_CONFIG[entry.outcome] : null;
  const OutcomeIcon = outcome?.icon;

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-left flex items-center gap-2 hover:border-teal-500/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">{label}</p>
          {entry ? (
            <div>
              <p className="text-sm font-medium text-white truncate">{entry.title}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {OutcomeIcon && <OutcomeIcon className={cn("w-3 h-3", outcome.color)} />}
                <span className={cn("text-xs", outcome?.color)}>{outcome?.label}</span>
                {entry.print_date && <span className="text-xs text-slate-500">· {format(new Date(entry.print_date), 'MMM d')}</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a print...</p>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {entries.map(e => {
            const oc = OUTCOME_CONFIG[e.outcome];
            const OcIcon = oc?.icon;
            return (
              <button
                key={e.id}
                onClick={() => { onChange(e.id); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-slate-700/50 transition-colors",
                  selected === e.id && "bg-teal-500/10"
                )}
              >
                {OcIcon && <OcIcon className={cn("w-4 h-4 flex-shrink-0", oc?.color)} />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{e.title}</p>
                  <p className="text-xs text-slate-500">{e.print_date ? format(new Date(e.print_date), 'MMM d, yyyy') : ''}{e.printer_model ? ` · ${e.printer_model}` : ''}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiffRow({ setting, entryA, entryB }) {
  const valA = entryA?.[setting.key];
  const valB = entryB?.[setting.key];
  const Icon = setting.icon;

  const hasA = valA !== null && valA !== undefined && valA !== '';
  const hasB = valB !== null && valB !== undefined && valB !== '';

  if (!hasA && !hasB) return null;

  const isDifferent = hasA && hasB && String(valA) !== String(valB);
  const isNumeric = typeof valA === 'number' || typeof valB === 'number';

  let diffIndicator = null;
  if (isDifferent && isNumeric) {
    const delta = Number(valB) - Number(valA);
    diffIndicator = (
      <span className={cn("text-xs font-medium", delta > 0 ? "text-blue-400" : "text-orange-400")}>
        {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}{setting.unit}
      </span>
    );
  }

  return (
    <div className={cn(
      "grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-2.5 px-3 rounded-xl border",
      isDifferent
        ? "bg-amber-500/5 border-amber-500/20"
        : "bg-slate-800/30 border-slate-700/30"
    )}>
      {/* Value A */}
      <div className="text-right">
        <span className={cn(
          "text-sm font-medium",
          hasA ? "text-white" : "text-slate-600 italic"
        )}>
          {hasA ? `${valA}${setting.unit}` : '—'}
        </span>
      </div>

      {/* Center label */}
      <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
        <div className="flex items-center gap-1">
          <Icon className={cn("w-3 h-3", isDifferent ? "text-amber-400" : "text-slate-500")} />
          <span className={cn("text-xs font-medium", isDifferent ? "text-amber-300" : "text-slate-500")}>{setting.label}</span>
        </div>
        {diffIndicator}
        {isDifferent && !isNumeric && (
          <span className="text-xs text-amber-400">changed</span>
        )}
      </div>

      {/* Value B */}
      <div className="text-left">
        <span className={cn(
          "text-sm font-medium",
          hasB ? "text-white" : "text-slate-600 italic"
        )}>
          {hasB ? `${valB}${setting.unit}` : '—'}
        </span>
      </div>
    </div>
  );
}

function OutcomeHeader({ entry }) {
  if (!entry) return <div className="flex-1 rounded-xl bg-slate-800/30 border border-slate-700/30 h-16" />;
  const oc = OUTCOME_CONFIG[entry.outcome] || OUTCOME_CONFIG.partial;
  const Icon = oc.icon;
  return (
    <div className={cn("flex-1 rounded-xl border p-3 text-center", oc.bg)}>
      <Icon className={cn("w-5 h-5 mx-auto mb-1", oc.color)} />
      <p className={cn("text-sm font-bold", oc.color)}>{oc.label}</p>
      {entry.print_date && <p className="text-xs text-slate-500">{format(new Date(entry.print_date), 'MMM d')}</p>}
    </div>
  );
}

const SEVERITY_CONFIG = {
  high:   { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
  medium: { color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
  low:    { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
};

function DefectColumn({ entry, analysis, loading }) {
  if (!entry) return <div className="flex-1" />;

  if (loading) return (
    <div className="flex-1 bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
    </div>
  );

  const defects = analysis?.defects || [];
  const quality = analysis?.overall_quality;
  const oc = OUTCOME_CONFIG[entry.outcome] || OUTCOME_CONFIG.partial;
  const OcIcon = oc.icon;

  return (
    <div className="flex-1 space-y-2">
      {/* Quality badge */}
      {quality && (
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-2.5 py-1.5 text-center">
          <p className="text-xs text-slate-500">AI Quality</p>
          <p className={cn("text-sm font-semibold capitalize", {
            excellent: 'text-emerald-400',
            good: 'text-cyan-400',
            fair: 'text-amber-400',
            poor: 'text-red-400',
          }[quality] || 'text-slate-300')}>{quality}</p>
        </div>
      )}

      {defects.length === 0 ? (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-xs text-emerald-300">No defects</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {defects.map((d, i) => {
            const sev = SEVERITY_CONFIG[d.severity] || SEVERITY_CONFIG.low;
            return (
              <div key={i} className={cn("rounded-lg border px-2.5 py-2", sev.bg)}>
                <p className={cn("text-xs font-semibold", sev.color)}>{d.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{d.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {!analysis && entry.analysis_id == null && (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500">No analysis linked</p>
        </div>
      )}
    </div>
  );
}

export default function JournalCompare() {
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['print-journal'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 200),
  });

  const entryA = entries.find(e => e.id === selectedA) || null;
  const entryB = entries.find(e => e.id === selectedB) || null;

  // Fetch linked analyses
  const { data: analysisA, isFetching: loadingA } = useQuery({
    queryKey: ['analysis', entryA?.analysis_id],
    queryFn: () => base44.entities.PrintAnalysis.filter({ id: entryA.analysis_id }),
    enabled: !!entryA?.analysis_id,
    select: data => data?.[0] || null,
  });

  const { data: analysisB, isFetching: loadingB } = useQuery({
    queryKey: ['analysis', entryB?.analysis_id],
    queryFn: () => base44.entities.PrintAnalysis.filter({ id: entryB.analysis_id }),
    enabled: !!entryB?.analysis_id,
    select: data => data?.[0] || null,
  });

  const changedCount = SETTINGS.filter(s => {
    const vA = entryA?.[s.key];
    const vB = entryB?.[s.key];
    return vA !== undefined && vB !== undefined && vA !== null && vB !== null && vA !== '' && vB !== '' && String(vA) !== String(vB);
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Journal Compare</h1>
            <p className="text-xs text-slate-500">Compare settings across two prints</p>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
          </div>
        ) : entries.length < 2 ? (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-10 text-center">
            <GitCompare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Not Enough Entries</h2>
            <p className="text-sm text-slate-500">Log at least 2 prints in your Journal to start comparing settings.</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Selectors */}
            <div className="flex gap-2 mb-4">
              <EntrySelector entries={entries} selected={selectedA} onChange={setSelectedA} label="Print A" />
              <EntrySelector entries={entries} selected={selectedB} onChange={setSelectedB} label="Print B" />
            </div>

            {/* Outcome headers */}
            {(entryA || entryB) && (
              <div className="flex gap-2 mb-4">
                <OutcomeHeader entry={entryA} />
                <OutcomeHeader entry={entryB} />
              </div>
            )}

            {/* Notes */}
            {(entryA?.notes || entryB?.notes) && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[entryA, entryB].map((e, i) => e?.notes ? (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">Notes {i === 0 ? 'A' : 'B'}</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{e.notes}</p>
                  </div>
                ) : <div key={i} />)}
              </div>
            )}

            {/* Comparison table */}
            {entryA && entryB && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Settings Comparison</p>
                  {changedCount > 0 && (
                    <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      {changedCount} changed
                    </span>
                  )}
                </div>

                {/* Column labels */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 mb-1">
                  <p className="text-xs font-semibold text-teal-400 text-right truncate">{entryA.title}</p>
                  <div className="min-w-[80px]" />
                  <p className="text-xs font-semibold text-indigo-400 text-left truncate">{entryB.title}</p>
                </div>

                {SETTINGS.map(s => (
                  <DiffRow key={s.key} setting={s} entryA={entryA} entryB={entryB} />
                ))}

                {changedCount === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500">All recorded settings are identical between these two prints.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Defect Comparison */}
            {entryA && entryB && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-semibold text-white">Defect Comparison</p>
                  {(analysisA || analysisB) && (
                    <span className="text-xs text-slate-500">from linked AI analysis</span>
                  )}
                </div>

                {/* Column headers */}
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold text-teal-400 truncate">{entryA.title}</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold text-indigo-400 truncate">{entryB.title}</p>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <DefectColumn entry={entryA} analysis={analysisA} loading={loadingA} />
                  <DefectColumn entry={entryB} analysis={analysisB} loading={loadingB} />
                </div>

                {/* Insight banner if one succeeded and one failed */}
                {entryA.outcome !== entryB.outcome && (entryA.outcome === 'success' || entryB.outcome === 'success') && changedCount > 0 && (
                  <div className="mt-3 bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 flex gap-2">
                    <ShieldAlert className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-teal-200 leading-relaxed">
                      <span className="font-semibold">Insight:</span> These prints had different outcomes with {changedCount} changed setting{changedCount > 1 ? 's' : ''}. The highlighted differences above are likely the cause.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Placeholder when not both selected */}
            {(!entryA || !entryB) && (
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-10 text-center mt-2">
                <GitCompare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Select two prints above to compare their settings side by side.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}