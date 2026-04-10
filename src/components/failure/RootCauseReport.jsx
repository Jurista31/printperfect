import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertTriangle, Wrench, TrendingUp, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const PATTERN_COLORS = {
  bed_adhesion:    'text-orange-400 bg-orange-500/10 border-orange-500/30',
  thermal_drift:   'text-red-400 bg-red-500/10 border-red-500/30',
  under_extrusion: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  over_extrusion:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  stringing:       'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  warping:         'text-purple-400 bg-purple-500/10 border-purple-500/30',
  layer_shift:     'text-pink-400 bg-pink-500/10 border-pink-500/30',
  clogging:        'text-slate-400 bg-slate-500/10 border-slate-500/30',
  other:           'text-teal-400 bg-teal-500/10 border-teal-500/30',
};

function PatternCard({ pattern, index }) {
  const [open, setOpen] = useState(index === 0);
  const colorClass = PATTERN_COLORS[pattern.category] || PATTERN_COLORS.other;
  const pct = Math.round((pattern.occurrence_count / pattern.total_failures) * 100);

  return (
    <div className={cn('rounded-xl border overflow-hidden', colorClass)}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-4 text-left">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{pattern.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden max-w-24">
              <div className="h-full bg-current rounded-full opacity-70" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs opacity-70">{pattern.occurrence_count}/{pattern.total_failures} prints ({pct}%)</span>
          </div>
        </div>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border uppercase shrink-0', colorClass)}>
          {pattern.severity}
        </span>
        {open ? <ChevronUp className="w-4 h-4 opacity-50 shrink-0" /> : <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-current/20">
              <p className="text-sm text-slate-300 mt-3 leading-relaxed">{pattern.description}</p>

              {pattern.evidence?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">Evidence</p>
                  <ul className="space-y-1">
                    {pattern.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="mt-0.5 opacity-60">•</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pattern.calibration_changes?.length > 0 && (
                <div className="bg-slate-900/60 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Calibration Changes
                  </p>
                  {pattern.calibration_changes.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Zap className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-white">{c.setting}: </span>
                        {c.current && <><span className="text-slate-500">{c.current}</span><span className="text-slate-600 mx-1">→</span></>}
                        <span className="text-cyan-300 font-semibold">{c.recommended}</span>
                        {c.reason && <p className="text-slate-500 mt-0.5">{c.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RootCauseReport({ report, printerModel }) {
  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <p className="text-sm font-semibold text-white">Analysis Summary</p>
          {printerModel && <span className="text-xs text-slate-500">— {printerModel}</span>}
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{report.summary}</p>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { label: 'Failures Analyzed', value: report.total_failures_analyzed },
            { label: 'Patterns Found', value: report.patterns?.length || 0 },
            { label: 'Top Cause', value: report.patterns?.[0]?.name?.split(' ').slice(0,2).join(' ') || '—' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/50 rounded-lg p-2 text-center">
              <p className="text-base font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Printer profile recommendations */}
      {report.profile_recommendations?.length > 0 && (
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-cyan-400 uppercase mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Recommended Profile Updates
          </p>
          <div className="space-y-1.5">
            {report.profile_recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-cyan-500 mt-0.5 shrink-0">→</span>
                <div>
                  <span className="font-semibold text-white">{r.setting}: </span>
                  {r.current && <><span className="text-slate-500">{r.current}</span><span className="text-slate-600 mx-1">→</span></>}
                  <span className="text-cyan-300 font-semibold">{r.recommended}</span>
                  {r.reason && <p className="text-slate-500 mt-0.5">{r.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern cards */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Root Cause Patterns</p>
        <div className="space-y-3">
          {(report.patterns || []).map((p, i) => (
            <PatternCard key={i} pattern={p} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}