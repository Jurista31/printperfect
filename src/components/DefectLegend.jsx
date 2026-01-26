import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DefectLegend({ defects }) {
  if (!defects || defects.length === 0) return null;

  const severityGroups = {
    high: defects.filter(d => d.severity === 'high'),
    medium: defects.filter(d => d.severity === 'medium'),
    low: defects.filter(d => d.severity === 'low')
  };

  const config = {
    high: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical' },
    medium: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Important' },
    low: { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Minor' }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50"
    >
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Defect Overview</h3>
      </div>

      <div className="space-y-2">
        {Object.entries(severityGroups).map(([severity, items]) => {
          if (items.length === 0) return null;
          const severityConfig = config[severity];
          const Icon = severityConfig.icon;

          return (
            <div
              key={severity}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg",
                severityConfig.bg,
                severityConfig.border,
                "border"
              )}
            >
              <Icon className={cn("w-4 h-4", severityConfig.color)} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-sm font-medium", severityConfig.color)}>
                    {severityConfig.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({items.length} {items.length === 1 ? 'issue' : 'issues'})
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {items.map(d => d.name).join(', ')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 mt-3 italic">
        💡 Click on highlighted areas in the image for detailed information
      </p>
    </motion.div>
  );
}