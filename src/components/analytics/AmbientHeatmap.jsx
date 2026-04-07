import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders a 1D heatmap bar for a single continuous variable (e.g. ambient temp).
 * buckets: { label: string, failureRate: number, total: number }[]
 */
export default function AmbientHeatmap({ label, buckets, unit = '' }) {
  if (!buckets.length) return null;

  const colorForRate = (rate, total) => {
    if (!total) return { bg: 'bg-slate-800/40', text: 'text-slate-600', border: 'border-slate-700/20' };
    if (rate === 0)   return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' };
    if (rate < 20)    return { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/25' };
    if (rate < 40)    return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' };
    if (rate < 60)    return { bg: 'bg-red-500/25', text: 'text-red-300', border: 'border-red-500/35' };
    return { bg: 'bg-red-600/40', text: 'text-red-200', border: 'border-red-600/50' };
  };

  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-2">{label} <span className="text-slate-600">{unit && `(${unit})`}</span></p>
      <div className="flex gap-1">
        {buckets.map(b => {
          const { bg, text, border } = colorForRate(b.failureRate, b.total);
          return (
            <div
              key={b.label}
              className={cn('flex-1 rounded-lg border p-2 flex flex-col items-center gap-1 min-w-[44px]', bg, border)}
              title={b.total ? `${b.label}${unit}: ${b.failureRate}% failure (${b.total} prints)` : 'No data'}
            >
              <span className="text-[9px] text-slate-400 leading-none">{b.label}</span>
              {b.total > 0 ? (
                <>
                  <span className={cn('text-xs font-bold leading-none', text)}>{b.failureRate}%</span>
                  <span className="text-[8px] text-slate-600">{b.total}p</span>
                </>
              ) : (
                <span className="text-[9px] text-slate-700">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}