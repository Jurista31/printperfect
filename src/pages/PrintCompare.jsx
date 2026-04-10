import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GitCompare, ChevronDown, AlertTriangle, AlertCircle, Info, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const qualityConfig = {
  excellent: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', score: 95 },
  good:      { color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30',    score: 75 },
  fair:      { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',  score: 50 },
  poor:      { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',      score: 25 },
};

const severityColor = {
  high:   'text-red-400 bg-red-500/10 border-red-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  low:    'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
};

function AnalysisSelector({ label, value, onChange, analyses, excludeId }) {
  const [open, setOpen] = useState(false);
  const filtered = analyses.filter(a => a.id !== excludeId);
  const selected = analyses.find(a => a.id === value);

  return (
    <div className="relative flex-1">
      <p className="text-xs text-slate-500 uppercase font-medium mb-1.5">{label}</p>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-left hover:border-slate-600 transition-colors"
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0">
            {selected.image_url && (
              <img src={selected.image_url} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{selected.summary?.slice(0, 40) || 'Analysis'}</p>
              <p className="text-slate-500 text-xs">{selected.overall_quality} · {selected.defects?.length || 0} defects</p>
            </div>
          </div>
        ) : (
          <span className="text-slate-500 text-sm">Select an analysis…</span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm p-4 text-center">No other analyses available</p>
          ) : (
            filtered.map(a => (
              <button
                key={a.id}
                onClick={() => { onChange(a.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0",
                  a.id === value && "bg-cyan-500/10"
                )}
              >
                {a.image_url && (
                  <img src={a.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{a.summary?.slice(0, 50) || 'Analysis'}</p>
                  <p className="text-slate-500 text-xs">{a.overall_quality} · {a.defects?.length || 0} defects · {a.created_date ? format(parseISO(a.created_date), 'MMM d') : ''}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function QualityScore({ quality }) {
  const cfg = qualityConfig[quality] || qualityConfig.fair;
  return (
    <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-semibold capitalize", cfg.bg, cfg.color)}>
      <span>Overall Quality</span>
      <span>{quality}</span>
    </div>
  );
}

function DefectList({ defects = [] }) {
  if (!defects.length) return <p className="text-slate-500 text-sm italic">No defects detected</p>;
  return (
    <div className="space-y-2">
      {defects.map((d, i) => (
        <div key={i} className={cn("px-3 py-2 rounded-lg border text-xs", severityColor[d.severity] || severityColor.low)}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{d.name}</span>
            <span className="capitalize opacity-70">{d.severity}</span>
          </div>
          {d.description && <p className="mt-1 text-slate-400 leading-relaxed">{d.description}</p>}
        </div>
      ))}
    </div>
  );
}

function SettingRow({ label, left, right }) {
  const different = left !== undefined && right !== undefined && String(left) !== String(right);
  return (
    <div className={cn("grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-1.5 text-xs border-b border-slate-800 last:border-0", different && "bg-amber-500/5 rounded px-1")}>
      <span className={cn("text-right", different ? "text-amber-300 font-medium" : "text-slate-300")}>{left ?? <span className="text-slate-600">—</span>}</span>
      <span className="text-center text-slate-600 text-[10px] whitespace-nowrap">{label}</span>
      <span className={cn("text-left", different ? "text-amber-300 font-medium" : "text-slate-300")}>{right ?? <span className="text-slate-600">—</span>}</span>
    </div>
  );
}

function DefectDiffSummary({ left, right }) {
  const leftNames = new Set((left || []).map(d => d.name));
  const rightNames = new Set((right || []).map(d => d.name));
  const resolved = [...leftNames].filter(n => !rightNames.has(n));
  const added    = [...rightNames].filter(n => !leftNames.has(n));
  const shared   = [...leftNames].filter(n => rightNames.has(n));

  if (!resolved.length && !added.length && !shared.length) return null;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <GitCompare className="w-4 h-4 text-cyan-400" /> Defect Diff
      </h3>
      {resolved.length > 0 && (
        <div>
          <p className="text-emerald-400 text-xs font-medium mb-1">✓ Resolved in B</p>
          <div className="flex flex-wrap gap-1.5">
            {resolved.map(n => <span key={n} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs">{n}</span>)}
          </div>
        </div>
      )}
      {added.length > 0 && (
        <div>
          <p className="text-red-400 text-xs font-medium mb-1">✗ New in B</p>
          <div className="flex flex-wrap gap-1.5">
            {added.map(n => <span key={n} className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs">{n}</span>)}
          </div>
        </div>
      )}
      {shared.length > 0 && (
        <div>
          <p className="text-slate-400 text-xs font-medium mb-1">~ Still present</p>
          <div className="flex flex-wrap gap-1.5">
            {shared.map(n => <span key={n} className="px-2 py-0.5 bg-slate-700 border border-slate-600 text-slate-400 rounded text-xs">{n}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrintCompare() {
  const [leftId, setLeftId] = useState(null);
  const [rightId, setRightId] = useState(null);

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['analyses-compare'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 100),
  });

  const left  = analyses.find(a => a.id === leftId);
  const right = analyses.find(a => a.id === rightId);
  const canCompare = left && right;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Compare Analyses</h1>
              <p className="text-xs text-slate-500">Side-by-side defect & settings comparison</p>
            </div>
          </div>
        </motion.div>

        {/* Selectors */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
          ) : analyses.length < 2 ? (
            <div className="text-center py-10 text-slate-500">
              <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>You need at least 2 analyses to compare.</p>
              <p className="text-sm mt-1">Analyze some prints from the Home tab first.</p>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <AnalysisSelector label="Analysis A" value={leftId} onChange={setLeftId} analyses={analyses} excludeId={rightId} />
              <ArrowRight className="w-5 h-5 text-slate-600 flex-shrink-0 mb-3" />
              <AnalysisSelector label="Analysis B" value={rightId} onChange={setRightId} analyses={analyses} excludeId={leftId} />
            </div>
          )}
        </motion.div>

        {/* Comparison */}
        {canCompare && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
            {/* Images */}
            <div className="grid grid-cols-2 gap-3">
              {[left, right].map((a, i) => (
                <div key={i}>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1.5">{i === 0 ? 'A' : 'B'}</p>
                  {a.image_url
                    ? <img src={a.image_url} alt="print" className="w-full aspect-video object-cover rounded-xl border border-slate-700" />
                    : <div className="w-full aspect-video bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center text-slate-600 text-xs">No image</div>
                  }
                </div>
              ))}
            </div>

            {/* Quality scores */}
            <div className="grid grid-cols-2 gap-3">
              <QualityScore quality={left.overall_quality} />
              <QualityScore quality={right.overall_quality} />
            </div>

            {/* Score bar comparison */}
            {(left.overall_quality || right.overall_quality) && (() => {
              const lScore = qualityConfig[left.overall_quality]?.score || 0;
              const rScore = qualityConfig[right.overall_quality]?.score || 0;
              const diff   = rScore - lScore;
              return (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase font-medium mb-3">Quality Score</p>
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-bold w-8 text-right">{lScore}</span>
                    <div className="flex-1 relative h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${lScore}%` }} />
                    </div>
                    <span className="text-slate-500 text-xs">A</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-white text-sm font-bold w-8 text-right">{rScore}</span>
                    <div className="flex-1 relative h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${rScore}%` }} />
                    </div>
                    <span className="text-slate-500 text-xs">B</span>
                  </div>
                  <p className={cn("mt-3 text-sm font-semibold text-center", diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-slate-400")}>
                    {diff > 0 ? `▲ B improved by ${diff} pts` : diff < 0 ? `▼ B declined by ${Math.abs(diff)} pts` : '= No quality change'}
                  </p>
                </div>
              );
            })()}

            {/* Defect diff */}
            <DefectDiffSummary left={left.defects} right={right.defects} />

            {/* Side-by-side defects */}
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium mb-3">Defects Detail</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-600 mb-2">A · {left.defects?.length || 0} defects</p>
                  <DefectList defects={left.defects} />
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-2">B · {right.defects?.length || 0} defects</p>
                  <DefectList defects={right.defects} />
                </div>
              </div>
            </div>

            {/* Settings comparison */}
            {(left.printer_settings_suggestions?.length || right.printer_settings_suggestions?.length) && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase font-medium mb-3">AI Setting Suggestions</p>
                <div className="grid grid-cols-2 gap-3">
                  {[left, right].map((a, i) => (
                    <div key={i}>
                      <p className="text-xs text-slate-600 mb-2">{i === 0 ? 'A' : 'B'}</p>
                      {a.printer_settings_suggestions?.length ? (
                        <ul className="space-y-1.5">
                          {a.printer_settings_suggestions.map((s, j) => (
                            <li key={j} className="text-xs text-slate-300 flex gap-1.5"><span className="text-cyan-500 flex-shrink-0">•</span>{s}</li>
                          ))}
                        </ul>
                      ) : <p className="text-slate-600 text-xs italic">None</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summaries */}
            {(left.summary || right.summary) && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase font-medium mb-3">AI Assessment</p>
                <div className="grid grid-cols-2 gap-3">
                  {[left, right].map((a, i) => (
                    <div key={i}>
                      <p className="text-xs text-slate-600 mb-1.5">{i === 0 ? 'A' : 'B'}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{a.summary || <span className="italic text-slate-600">No summary</span>}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}