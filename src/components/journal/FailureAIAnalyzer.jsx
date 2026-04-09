import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, AlertTriangle, ChevronDown, ChevronUp, Wrench, Thermometer, Layers, Wind, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = {
  temperature: Thermometer,
  adhesion: Layers,
  cooling: Wind,
  speed: Zap,
  mechanical: Wrench,
  default: AlertTriangle,
};

function CauseCard({ cause, index }) {
  const [open, setOpen] = useState(false);
  const Icon = CATEGORY_ICONS[cause.category?.toLowerCase()] || CATEGORY_ICONS.default;
  const severityColor = {
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-green-400 bg-green-500/10 border-green-500/20',
  }[cause.severity] || 'text-slate-400 bg-slate-700/30 border-slate-600/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn('border rounded-xl overflow-hidden', severityColor)}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-3.5 text-left"
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white">{cause.cause}</p>
          <p className="text-xs opacity-70 capitalize">{cause.category} · {cause.severity} impact</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0 opacity-60" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 opacity-60" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
              <p className="text-sm text-slate-300">{cause.explanation}</p>
              {cause.adjustments?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommended Adjustments</p>
                  <ul className="space-y-1.5">
                    {cause.adjustments.map((adj, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-cyan-400 mt-0.5 flex-shrink-0">→</span>
                        {adj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FailureAIAnalyzer({ entries }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const failures = entries.filter(e => e.outcome === 'failure');

  const analyze = async () => {
    setLoading(true);
    setResult(null);

    const summary = failures.slice(0, 30).map(e => ({
      title: e.title,
      date: e.print_date,
      printer: e.printer_model,
      material: e.filament_material,
      nozzle_temp: e.nozzle_temp,
      bed_temp: e.bed_temp,
      print_speed: e.print_speed,
      layer_height: e.layer_height,
      infill: e.infill_percent,
      ambient_temp: e.ambient_temp,
      ambient_humidity: e.ambient_humidity,
      notes: e.notes,
    }));

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert 3D printing engineer. Analyze the following ${failures.length} failed prints and identify the most likely root causes, grouped by category (temperature, adhesion, cooling, speed, mechanical, etc.).

For each cause, provide:
- A clear name
- Category (temperature/adhesion/cooling/speed/mechanical/other)  
- Severity (high/medium/low)
- A concise explanation of why this is causing failures
- 2-4 specific, actionable print setting adjustments to fix it

Focus on patterns across multiple failures, not one-off issues.

Failed prints data:
${JSON.stringify(summary, null, 2)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Overall 2-3 sentence diagnosis of the failure patterns' },
          top_issue: { type: 'string', description: 'The single most impactful thing to fix' },
          causes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                cause: { type: 'string' },
                category: { type: 'string' },
                severity: { type: 'string' },
                explanation: { type: 'string' },
                adjustments: { type: 'array', items: { type: 'string' } },
              }
            }
          }
        }
      }
    });

    setResult(res);
    setLoading(false);
  };

  if (failures.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-10 text-center">
        <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-white font-semibold">No failed prints to analyze</p>
        <p className="text-slate-500 text-sm mt-1">Log some failed prints to unlock AI diagnostics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">AI Failure Analyzer</h2>
            <p className="text-xs text-slate-500">{failures.length} failed prints ready for analysis</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          AI will scan your failure history for patterns and give you specific settings to fix them.
        </p>
        <Button
          onClick={analyze}
          disabled={loading}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing {failures.length} failures…</>
          ) : result ? (
            <><RefreshCw className="w-4 h-4 mr-2" /> Re-analyze</>
          ) : (
            <><Brain className="w-4 h-4 mr-2" /> Analyze My Failures</>
          )}
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary */}
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Diagnosis</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
              {result.top_issue && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-amber-400">⚡ Top priority fix</p>
                  <p className="text-sm text-slate-300 mt-0.5">{result.top_issue}</p>
                </div>
              )}
            </div>

            {/* Cause cards */}
            {result.causes?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Root Causes ({result.causes.length})</p>
                {result.causes.map((cause, i) => (
                  <CauseCard key={i} cause={cause} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}