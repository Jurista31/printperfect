import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import {
  AlertTriangle, AlertCircle, Info, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Loader2, Layers, ArrowRight, Wrench
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const QUALITY_SCORE = { excellent: 4, good: 3, fair: 2, poor: 1 };
const QUALITY_LABEL = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' };
const QUALITY_COLOR = { excellent: '#22d3ee', good: '#34d399', fair: '#fbbf24', poor: '#f87171' };

const SEV_CONFIG = {
  high: { color: 'bg-red-500/20 text-red-300 border-red-500/30', dot: 'bg-red-400', icon: AlertTriangle, iconColor: 'text-red-400', fill: 'rgba(239,68,68,0.25)', border: 'rgb(239,68,68)' },
  medium: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', dot: 'bg-amber-400', icon: AlertCircle, iconColor: 'text-amber-400', fill: 'rgba(251,191,36,0.25)', border: 'rgb(251,191,36)' },
  low: { color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400', icon: Info, iconColor: 'text-cyan-400', fill: 'rgba(34,211,238,0.25)', border: 'rgb(34,211,238)' },
};

// ─── Analysis Picker ─────────────────────────────────────────────────────────
function AnalysisPicker({ label, color, value, analyses, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = value ? analyses.find(a => a.id === value) : null;

  return (
    <div className="flex-1 min-w-0">
      <p className={cn("text-xs font-semibold mb-1.5", color === 'A' ? 'text-cyan-400' : 'text-purple-400')}>
        Print {label}
      </p>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left",
          selected
            ? color === 'A' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-purple-500/10 border-purple-500/30'
            : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
        )}
      >
        {selected ? (
          <>
            <img src={selected.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{QUALITY_LABEL[selected.overall_quality] || 'Unknown'}</p>
              <p className="text-xs text-slate-500 truncate">
                {selected.defects?.length || 0} defects · {selected.created_date ? format(parseISO(selected.created_date), 'MMM d') : ''}
              </p>
            </div>
            {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
          </>
        ) : (
          <p className="text-xs text-slate-500 flex-1">Select a print…</p>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden z-20 relative shadow-2xl max-h-56 overflow-y-auto"
          >
            {analyses.length === 0 ? (
              <p className="text-xs text-slate-500 p-3 text-center">No analyses yet</p>
            ) : analyses.map(a => (
              <button
                key={a.id}
                onClick={() => { onChange(a.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 p-2.5 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0",
                  a.id === value && 'bg-slate-800'
                )}
              >
                <img src={a.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: QUALITY_COLOR[a.overall_quality] || '#94a3b8' }} />
                    <p className="text-xs font-medium text-white">{QUALITY_LABEL[a.overall_quality] || 'Unknown'}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {a.defects?.length || 0} defects · {a.created_date ? format(parseISO(a.created_date), 'MMM d, yyyy') : ''}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Defect Overlay Panel ─────────────────────────────────────────────────────
function DefectOverlayPanel({ analysisA, analysisB }) {
  const defectsA = analysisA.defects || [];
  const defectsB = analysisB.defects || [];

  // Build a union of defect names
  const allNames = Array.from(new Set([...defectsA.map(d => d.name), ...defectsB.map(d => d.name)]));

  const rows = allNames.map(name => {
    const dA = defectsA.find(d => d.name === name);
    const dB = defectsB.find(d => d.name === name);
    return { name, a: dA, b: dB };
  });

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Defect Pattern Overlay
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">How defects shifted between the two prints</p>
      </div>

      {/* Side-by-side images */}
      <div className="flex gap-2 p-3">
        <div className="flex-1 relative rounded-lg overflow-hidden aspect-video">
          <img src={analysisA.image_url} alt="Print A" className="w-full h-full object-cover" />
          {/* Overlay defect boxes for A */}
          {defectsA.filter(d => d.location?.x != null).map((d, i) => {
            const cfg = SEV_CONFIG[d.severity] || SEV_CONFIG.low;
            return (
              <div key={i} className="absolute pointer-events-none rounded" style={{
                left: `${d.location.x}%`, top: `${d.location.y}%`,
                width: `${d.location.width}%`, height: `${d.location.height}%`,
                backgroundColor: cfg.fill, border: `1.5px solid ${cfg.border}`,
              }} />
            );
          })}
          <div className="absolute bottom-1.5 left-1.5 bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">A</div>
        </div>
        <div className="flex-1 relative rounded-lg overflow-hidden aspect-video">
          <img src={analysisB.image_url} alt="Print B" className="w-full h-full object-cover" />
          {defectsB.filter(d => d.location?.x != null).map((d, i) => {
            const cfg = SEV_CONFIG[d.severity] || SEV_CONFIG.low;
            return (
              <div key={i} className="absolute pointer-events-none rounded" style={{
                left: `${d.location.x}%`, top: `${d.location.y}%`,
                width: `${d.location.width}%`, height: `${d.location.height}%`,
                backgroundColor: cfg.fill, border: `1.5px solid ${cfg.border}`,
              }} />
            );
          })}
          <div className="absolute bottom-1.5 left-1.5 bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">B</div>
        </div>
      </div>

      {/* Defect comparison rows */}
      {rows.length > 0 && (
        <div className="p-3 pt-0 space-y-1.5">
          {rows.map(({ name, a, b }) => {
            const cfgA = a ? SEV_CONFIG[a.severity] || SEV_CONFIG.low : null;
            const cfgB = b ? SEV_CONFIG[b.severity] || SEV_CONFIG.low : null;

            // Determine delta
            const scoreA = a ? { high: 3, medium: 2, low: 1 }[a.severity] : 0;
            const scoreB = b ? { high: 3, medium: 2, low: 1 }[b.severity] : 0;
            const delta = scoreB - scoreA;

            return (
              <div key={name} className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-300 flex-1 font-medium truncate">{name}</p>
                {cfgA ? (
                  <Badge className={cn("text-xs border shrink-0", cfgA.color)}>{a.severity}</Badge>
                ) : (
                  <span className="text-xs text-slate-600 italic shrink-0">absent</span>
                )}
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                {cfgB ? (
                  <Badge className={cn("text-xs border shrink-0", cfgB.color)}>{b.severity}</Badge>
                ) : (
                  <span className="text-xs text-slate-600 italic shrink-0">resolved</span>
                )}
                <div className="w-5 flex-shrink-0">
                  {delta < 0 && <TrendingDown className="w-3.5 h-3.5 text-green-400" />}
                  {delta > 0 && <TrendingUp className="w-3.5 h-3.5 text-red-400" />}
                  {delta === 0 && a && b && <Minus className="w-3.5 h-3.5 text-slate-500" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Severity Trend Chart ─────────────────────────────────────────────────────
function SeverityTrends({ analysisA, analysisB }) {
  const count = (a, sev) => (a.defects || []).filter(d => d.severity === sev).length;

  const barData = [
    { label: 'High', A: count(analysisA, 'high'), B: count(analysisB, 'high') },
    { label: 'Medium', A: count(analysisA, 'medium'), B: count(analysisB, 'medium') },
    { label: 'Low', A: count(analysisA, 'low'), B: count(analysisB, 'low') },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs shadow-lg">
        <p className="text-white font-medium mb-1">{label} Severity</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>Print {p.dataKey}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  };

  // Radar dimensions
  const radarData = [
    { subject: 'High Sev', A: count(analysisA, 'high'), B: count(analysisB, 'high'), fullMark: 6 },
    { subject: 'Med Sev', A: count(analysisA, 'medium'), B: count(analysisB, 'medium'), fullMark: 6 },
    { subject: 'Low Sev', A: count(analysisA, 'low'), B: count(analysisB, 'low'), fullMark: 6 },
    { subject: 'Total', A: (analysisA.defects || []).length, B: (analysisB.defects || []).length, fullMark: 10 },
    { subject: 'Quality', A: QUALITY_SCORE[analysisA.overall_quality] || 0, B: QUALITY_SCORE[analysisB.overall_quality] || 0, fullMark: 4 },
  ];

  return (
    <div className="space-y-4">
      {/* Radar */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
          Quality Radar
        </h3>
        <p className="text-xs text-slate-500 mb-3">Multi-dimensional quality comparison</p>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Radar name="A" dataKey="A" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} />
            <Radar name="B" dataKey="B" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 justify-center mt-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-3 h-1 bg-cyan-400 rounded inline-block" />Print A</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="w-3 h-1 bg-purple-400 rounded inline-block" />Print B</span>
        </div>
      </div>

      {/* Severity bar chart */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
          Severity Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={barData} barSize={18} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="A" name="A" fill="#22d3ee" radius={[3, 3, 0, 0]} />
            <Bar dataKey="B" name="B" fill="#a855f7" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Settings Delta Table ─────────────────────────────────────────────────────
function SettingsDelta({ analysisA, analysisB }) {
  const suggestionsA = analysisA.printer_settings_suggestions || [];
  const suggestionsB = analysisB.printer_settings_suggestions || [];

  if (suggestionsA.length === 0 && suggestionsB.length === 0) return null;

  // Extract a "setting key" heuristic from suggestion text
  const parseKey = (s) => {
    if (!s) return s;
    return s.split(' ').slice(0, 4).join(' ');
  };

  const allSuggestions = Array.from(new Set([...suggestionsA, ...suggestionsB]));
  const rows = allSuggestions.map(s => ({
    suggestion: s,
    inA: suggestionsA.includes(s),
    inB: suggestionsB.includes(s),
  }));

  const onlyA = rows.filter(r => r.inA && !r.inB);
  const onlyB = rows.filter(r => !r.inA && r.inB);
  const both = rows.filter(r => r.inA && r.inB);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Wrench className="w-4 h-4 text-cyan-400" />
          Printer Settings Delta
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Changes in AI-suggested printer settings between runs</p>
      </div>

      <div className="p-3 space-y-4">
        {/* Fixed / still needed in both */}
        {both.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5 text-slate-500" />
              Still Needed in Both
            </p>
            <div className="space-y-1.5">
              {both.map((r, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-700/30 border border-slate-700/50 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400 leading-relaxed">{r.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved — was in A but no longer in B */}
        {onlyA.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-400 uppercase mb-2 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Resolved (was in A, gone in B)
            </p>
            <div className="space-y-1.5">
              {onlyA.map((r, i) => (
                <div key={i} className="flex items-start gap-2 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-green-300 leading-relaxed line-through opacity-60">{r.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New issues in B */}
        {onlyB.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              New in B (not in A)
            </p>
            <div className="space-y-1.5">
              {onlyB.map((r, i) => (
                <div key={i} className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300 leading-relaxed">{r.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HistoryCompare() {
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['analyses-for-compare'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 50),
  });

  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);

  const analysisA = selectedA ? analyses.find(a => a.id === selectedA) : null;
  const analysisB = selectedB ? analyses.find(a => a.id === selectedB) : null;
  const canCompare = analysisA && analysisB && analysisA.id !== analysisB.id;

  const qualityDelta = useMemo(() => {
    if (!analysisA || !analysisB) return null;
    const sA = QUALITY_SCORE[analysisA.overall_quality] || 0;
    const sB = QUALITY_SCORE[analysisB.overall_quality] || 0;
    return sB - sA;
  }, [analysisA, analysisB]);

  const defectDelta = useMemo(() => {
    if (!analysisA || !analysisB) return null;
    return (analysisB.defects?.length || 0) - (analysisA.defects?.length || 0);
  }, [analysisA, analysisB]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (analyses.length < 2) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-8 text-center">
        <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-300 mb-1">Need at least 2 analyses</p>
        <p className="text-xs text-slate-500">Run more print analyses to unlock history comparison.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Picker row */}
      <div className="flex gap-3">
        <AnalysisPicker label="A" color="A" value={selectedA} analyses={analyses} onChange={setSelectedA} />
        <div className="flex items-end pb-1 flex-shrink-0">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </div>
        <AnalysisPicker label="B" color="B" value={selectedB} analyses={analyses} onChange={setSelectedB} />
      </div>

      <AnimatePresence>
        {canCompare && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Quick delta summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                "rounded-xl border p-3",
                qualityDelta > 0 ? 'bg-green-500/10 border-green-500/30' :
                qualityDelta < 0 ? 'bg-red-500/10 border-red-500/30' :
                'bg-slate-700/40 border-slate-700'
              )}>
                <p className="text-xs text-slate-400 mb-0.5">Quality Change</p>
                <div className="flex items-center gap-1.5">
                  {qualityDelta > 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> :
                   qualityDelta < 0 ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                   <Minus className="w-4 h-4 text-slate-500" />}
                  <span className={cn("text-sm font-bold",
                    qualityDelta > 0 ? 'text-green-300' : qualityDelta < 0 ? 'text-red-300' : 'text-slate-400'
                  )}>
                    {QUALITY_LABEL[analysisA.overall_quality]} → {QUALITY_LABEL[analysisB.overall_quality]}
                  </span>
                </div>
              </div>

              <div className={cn(
                "rounded-xl border p-3",
                defectDelta < 0 ? 'bg-green-500/10 border-green-500/30' :
                defectDelta > 0 ? 'bg-red-500/10 border-red-500/30' :
                'bg-slate-700/40 border-slate-700'
              )}>
                <p className="text-xs text-slate-400 mb-0.5">Defects Found</p>
                <div className="flex items-center gap-1.5">
                  {defectDelta < 0 ? <TrendingDown className="w-4 h-4 text-green-400" /> :
                   defectDelta > 0 ? <TrendingUp className="w-4 h-4 text-red-400" /> :
                   <Minus className="w-4 h-4 text-slate-500" />}
                  <span className={cn("text-sm font-bold",
                    defectDelta < 0 ? 'text-green-300' : defectDelta > 0 ? 'text-red-300' : 'text-slate-400'
                  )}>
                    {analysisA.defects?.length || 0} → {analysisB.defects?.length || 0}
                    {defectDelta !== 0 && (
                      <span className="text-xs font-normal ml-1 opacity-70">
                        ({defectDelta > 0 ? '+' : ''}{defectDelta})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Defect overlay panel */}
            <DefectOverlayPanel analysisA={analysisA} analysisB={analysisB} />

            {/* Severity trends */}
            <SeverityTrends analysisA={analysisA} analysisB={analysisB} />

            {/* Settings delta */}
            <SettingsDelta analysisA={analysisA} analysisB={analysisB} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}