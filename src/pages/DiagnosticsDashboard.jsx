import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Sparkles, Loader2, AlertTriangle, CheckCircle2, Info,
  Thermometer, Droplets, Gauge, Layers, Zap, ChevronDown, ChevronUp,
  TrendingDown, Settings2, ShieldAlert, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SEVERITY = {
  high:   { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',    badge: 'bg-red-500/20 text-red-300' },
  medium: { color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/20 text-amber-300' },
  low:    { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   badge: 'bg-blue-500/20 text-blue-300' },
};
const IMPACT = SEVERITY;

const CATEGORY_ICON = {
  temperature: Thermometer,
  humidity: Droplets,
  speed: Gauge,
  layer: Layers,
  default: Settings2,
};

function getCategoryIcon(category = '') {
  const c = category.toLowerCase();
  if (c.includes('temp')) return Thermometer;
  if (c.includes('humid')) return Droplets;
  if (c.includes('speed')) return Gauge;
  if (c.includes('layer')) return Layers;
  return Settings2;
}

function HealthGauge({ score }) {
  const color = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const stroke = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={stroke} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="48" y="53" textAnchor="middle" fontSize="18" fontWeight="bold" fill={stroke}>{score}</text>
      </svg>
      <p className={cn("text-xs font-semibold", color)}>
        {score >= 75 ? 'Healthy' : score >= 50 ? 'Needs Work' : 'Critical'}
      </p>
    </div>
  );
}

function PatternCard({ pattern }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY[pattern.severity] || SEVERITY.medium;

  return (
    <div className={cn('rounded-xl border', sev.bg)}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-start justify-between gap-3 p-4 text-left">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <TrendingDown className={cn('w-4 h-4 mt-0.5 shrink-0', sev.color)} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white">{pattern.name}</p>
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', sev.badge)}>
                {pattern.severity}
              </span>
              {pattern.frequency && (
                <span className="text-xs text-slate-500">{pattern.frequency}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{pattern.description}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-1" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10">
            <div className="p-4 space-y-3">
              {pattern.trigger_conditions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Trigger Conditions</p>
                  <div className="space-y-1">
                    {pattern.trigger_conditions.map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-300">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pattern.correlated_settings?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Parameter Fixes</p>
                  <div className="space-y-1.5">
                    {pattern.correlated_settings.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-slate-300 flex-1">{s.setting}</p>
                        <span className="text-xs text-red-400 line-through">{s.problem_value}</span>
                        <span className="text-xs text-slate-500 mx-1">→</span>
                        <span className="text-xs text-emerald-400 font-semibold">{s.recommended_value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriorityFix({ fix, index }) {
  const imp = IMPACT[fix.impact] || IMPACT.medium;
  const Icon = getCategoryIcon(fix.category);

  return (
    <div className={cn('rounded-xl border p-4 flex gap-3', imp.bg)}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', `bg-current/10`)}>
        <Icon className={cn('w-4 h-4', imp.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
          <p className="text-sm font-semibold text-white">{fix.title}</p>
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto', imp.badge)}>{fix.impact}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{fix.detail}</p>
      </div>
    </div>
  );
}

export default function DiagnosticsDashboard() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await base44.functions.invoke('runDiagnostics', {});
    if (res.data?.error) {
      setError(res.data.message || 'Failed to run diagnostics.');
    } else {
      setResult(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Diagnostics</h1>
              <p className="text-xs text-slate-500">Correlates failures with settings & environment</p>
            </div>
          </div>
          <Button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white gap-2 shrink-0"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              : result
              ? <><RefreshCw className="w-4 h-4" /> Re-run</>
              : <><Sparkles className="w-4 h-4" /> Run Diagnostics</>
            }
          </Button>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-10 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-300">Analyzing your print history…</p>
            <p className="text-xs text-slate-500">Correlating failures with settings & environmental data</p>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && !result && !error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-10 text-center space-y-3">
            <Activity className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">Ready to Diagnose</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Run the AI diagnostics to identify failure patterns, correlate with environmental conditions, and get optimized print settings.
            </p>
          </motion.div>
        )}

        {/* Results */}
        {result && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

            {/* Health Score + Summary */}
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 flex gap-5 items-center">
              {result.overall_health_score != null && <HealthGauge score={result.overall_health_score} />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Print Health Overview</p>
                <p className="text-sm text-slate-200 leading-relaxed">{result.health_summary}</p>
                {result.stats && (
                  <div className="flex gap-4 mt-3">
                    <div>
                      <p className="text-lg font-bold text-white">{result.stats.total}</p>
                      <p className="text-xs text-slate-500">Total prints</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-400">{result.stats.failures}</p>
                      <p className="text-xs text-slate-500">Failures</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-400">{result.stats.partials}</p>
                      <p className="text-xs text-slate-500">Partials</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Priority Fixes */}
            {result.priority_fixes?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <p className="text-sm font-bold text-white">Top Priority Fixes</p>
                </div>
                <div className="space-y-2">
                  {result.priority_fixes.map((fix, i) => (
                    <PriorityFix key={i} fix={fix} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Failure Patterns */}
            {result.failure_patterns?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-bold text-white">Failure Patterns Detected</p>
                  <span className="text-xs text-slate-500">({result.failure_patterns.length})</span>
                </div>
                <div className="space-y-2">
                  {result.failure_patterns.map((p, i) => (
                    <PatternCard key={i} pattern={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Environmental Risks */}
            {result.environmental_risks?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  <p className="text-sm font-bold text-white">Environmental Risk Factors</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {result.environmental_risks.map((r, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-slate-200">{r.factor}</p>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full">⚠ {r.risk_range}</span>
                          <span className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">✓ {r.safe_range}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{r.effect}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimal Profile */}
            {result.optimal_profile && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-bold text-white">Optimal Settings Profile</p>
                  {result.optimal_profile.material && (
                    <span className="text-xs text-slate-500">for {result.optimal_profile.material} on {result.optimal_profile.printer}</span>
                  )}
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                  {result.optimal_profile.settings?.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-emerald-300">{s.parameter}</p>
                          <span className="text-xs font-bold text-white">{s.value}</span>
                        </div>
                        {s.rationale && <p className="text-xs text-slate-500 mt-0.5">{s.rationale}</p>}
                      </div>
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