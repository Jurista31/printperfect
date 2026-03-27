import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Wrench, AlertTriangle, CheckCircle, ArrowRight, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const VERDICT_CONFIG = {
  improved: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', label: 'Improved' },
  regressed: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'Regressed' },
  unchanged: { icon: Minus, color: 'text-slate-400', bg: 'bg-slate-700/40 border-slate-700/50', label: 'Similar' },
};

const SEVERITY_COLORS = {
  high: 'bg-red-500/20 text-red-300 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
};

function DimensionCard({ dim }) {
  const [open, setOpen] = useState(false);
  const cfg = VERDICT_CONFIG[dim.verdict] || VERDICT_CONFIG.unchanged;
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-xl border overflow-hidden", cfg.bg)}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <Icon className={cn("w-4 h-4 shrink-0", cfg.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{dim.dimension}</p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{dim.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={cn("text-xs border", cfg.bg, cfg.color)}>{cfg.label}</Badge>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-cyan-400 mb-1">Print A</p>
                  <p className="text-xs text-slate-300">{dim.print_a_observation}</p>
                </div>
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-purple-400 mb-1">Print B</p>
                  <p className="text-xs text-slate-300">{dim.print_b_observation}</p>
                </div>
              </div>
              {dim.detail && (
                <p className="text-xs text-slate-400 leading-relaxed">{dim.detail}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CompareReport({ report, imageA, imageB }) {
  const overallVerdict = report.overall_verdict || 'unchanged';
  const verdictCfg = VERDICT_CONFIG[overallVerdict] || VERDICT_CONFIG.unchanged;
  const VerdictIcon = verdictCfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Side-by-side thumbnails */}
      <div className="flex gap-3">
        <div className="flex-1 relative rounded-xl overflow-hidden aspect-video">
          <img src={imageA} alt="Print A" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">A</div>
        </div>
        <div className="flex items-center justify-center shrink-0">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </div>
        <div className="flex-1 relative rounded-xl overflow-hidden aspect-video">
          <img src={imageB} alt="Print B" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">B</div>
        </div>
      </div>

      {/* Overall verdict */}
      <div className={cn("rounded-xl border p-4", verdictCfg.bg)}>
        <div className="flex items-center gap-3 mb-2">
          <VerdictIcon className={cn("w-5 h-5", verdictCfg.color)} />
          <h3 className="font-semibold text-white">Overall: Print B has <span className={verdictCfg.color}>{verdictCfg.label}</span></h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{report.overall_summary}</p>
        {report.quality_score_a !== undefined && (
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-cyan-500 text-white px-2 py-0.5 rounded-full">A</span>
              <span className="text-sm font-bold text-white">{report.quality_score_a}<span className="text-xs text-slate-500">/10</span></span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 self-center" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full">B</span>
              <span className="text-sm font-bold text-white">{report.quality_score_b}<span className="text-xs text-slate-500">/10</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Dimension-by-dimension breakdown */}
      {report.dimensions?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Detailed Comparison
          </h3>
          <div className="space-y-2">
            {report.dimensions.map((dim, i) => (
              <DimensionCard key={i} dim={dim} />
            ))}
          </div>
        </div>
      )}

      {/* Key improvements */}
      {report.improvements?.length > 0 && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> What Got Better
          </h3>
          <ul className="space-y-2">
            {report.improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Regressions */}
      {report.regressions?.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> What Got Worse
          </h3>
          <ul className="space-y-2">
            {report.regressions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actionable adjustments */}
      {report.adjustments?.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" /> Printer Adjustments
          </h3>
          <div className="space-y-3">
            {report.adjustments.map((adj, i) => (
              <div key={i} className="flex items-start gap-3">
                <Badge className={cn("text-xs border shrink-0 mt-0.5", SEVERITY_COLORS[adj.priority] || SEVERITY_COLORS.low)}>
                  {adj.priority || 'tip'}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-white">{adj.setting}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{adj.action}</p>
                  {adj.reason && <p className="text-xs text-slate-600 mt-0.5 italic">{adj.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next steps */}
      {report.next_steps?.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" /> Next Steps
          </h3>
          <ol className="space-y-2">
            {report.next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
}