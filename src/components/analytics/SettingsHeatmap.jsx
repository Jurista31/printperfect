import React from 'react';
import { cn } from '@/lib/utils';

/**
 * A 2D heatmap grid.
 * xBuckets: string[] — column labels
 * yBuckets: string[] — row labels
 * cells: { x: string, y: string, failureRate: number, total: number }[]
 */
export default function SettingsHeatmap({ xLabel, yLabel, xBuckets, yBuckets, cells }) {
  if (!cells.length) return null;

  // build a lookup map
  const lookup = {};
  cells.forEach(c => { lookup[`${c.x}||${c.y}`] = c; });

  const colorForRate = (rate, total) => {
    if (!total) return { bg: 'bg-slate-800/40', text: 'text-slate-700', border: 'border-slate-700/20' };
    if (rate === 0)   return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' };
    if (rate < 20)    return { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/25' };
    if (rate < 40)    return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' };
    if (rate < 60)    return { bg: 'bg-red-500/25', text: 'text-red-300', border: 'border-red-500/35' };
    return { bg: 'bg-red-600/40', text: 'text-red-200', border: 'border-red-600/50' };
  };

  return (
    <div>
      {/* Axis labels */}
      <div className="flex items-center justify-center mb-1">
        <span className="text-xs text-slate-500 font-medium">{xLabel} →</span>
      </div>
      <div className="flex gap-1">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center mr-1" style={{ minWidth: 16 }}>
          <span className="text-xs text-slate-500 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}>{yLabel}</span>
        </div>
        <div className="flex-1 overflow-x-auto">
          {/* Column headers */}
          <div className="flex gap-0.5 mb-0.5" style={{ paddingLeft: 44 }}>
            {xBuckets.map(x => (
              <div key={x} className="flex-1 min-w-[36px] text-center text-[9px] text-slate-500 truncate px-0.5">{x}</div>
            ))}
          </div>
          {/* Rows */}
          {yBuckets.map(y => (
            <div key={y} className="flex items-center gap-0.5 mb-0.5">
              <div className="text-[9px] text-slate-500 w-11 text-right pr-1.5 flex-shrink-0 truncate">{y}</div>
              {xBuckets.map(x => {
                const cell = lookup[`${x}||${y}`];
                const total = cell?.total ?? 0;
                const rate = cell?.failureRate ?? 0;
                const { bg, text, border } = colorForRate(rate, total);
                return (
                  <div
                    key={x}
                    className={cn('flex-1 min-w-[36px] h-9 rounded flex flex-col items-center justify-center border transition-all cursor-default', bg, border)}
                    title={total ? `${x} / ${y}: ${rate}% fail (${total} prints)` : 'No data'}
                  >
                    {total > 0 && (
                      <>
                        <span className={cn('text-[10px] font-bold leading-none', text)}>{rate}%</span>
                        <span className="text-[8px] text-slate-600 leading-none mt-0.5">{total}p</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap mt-3 justify-center">
        {[
          { bg: 'bg-emerald-500/20 border-emerald-500/30', label: '0%' },
          { bg: 'bg-yellow-500/15 border-yellow-500/25', label: '<20%' },
          { bg: 'bg-orange-500/20 border-orange-500/30', label: '20–40%' },
          { bg: 'bg-red-500/25 border-red-500/35', label: '40–60%' },
          { bg: 'bg-red-600/40 border-red-600/50', label: '>60%' },
          { bg: 'bg-slate-800/40 border-slate-700/20', label: 'No data' },
        ].map(({ bg, label }) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className={cn('w-3 h-3 rounded border', bg)} />
            {label}
          </span>
        ))}
        <span className="text-[10px] text-slate-600 ml-1">= failure rate</span>
      </div>
    </div>
  );
}