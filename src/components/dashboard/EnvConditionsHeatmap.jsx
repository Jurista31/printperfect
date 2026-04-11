import React, { useMemo, useState } from 'react';
import { Thermometer, Droplets, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Humidity buckets: 0-20, 20-40, 40-60, 60-80, 80-100
const HUM_BUCKETS = [
  { label: '0–20%', min: 0, max: 20 },
  { label: '20–40%', min: 20, max: 40 },
  { label: '40–60%', min: 40, max: 60 },
  { label: '60–80%', min: 60, max: 80 },
  { label: '80–100%', min: 80, max: 101 },
];

// Ambient temp buckets: <15, 15-20, 20-25, 25-30, >30
const TEMP_BUCKETS = [
  { label: '<15°C', min: -99, max: 15 },
  { label: '15–20°C', min: 15, max: 20 },
  { label: '20–25°C', min: 20, max: 25 },
  { label: '25–30°C', min: 25, max: 30 },
  { label: '>30°C', min: 30, max: 999 },
];

function scoreColor(score, count) {
  if (count === 0) return { bg: 'bg-slate-800/40', text: 'text-slate-600', border: 'border-slate-700/30' };
  if (score >= 0.7) return { bg: 'bg-red-500/30', text: 'text-red-300', border: 'border-red-500/40' };
  if (score >= 0.5) return { bg: 'bg-orange-500/25', text: 'text-orange-300', border: 'border-orange-500/40' };
  if (score >= 0.3) return { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' };
  if (score >= 0.1) return { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30' };
  return { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' };
}

export default function EnvConditionsHeatmap({ entries }) {
  const [tooltip, setTooltip] = useState(null);

  const { grid, hasData, totalWithEnv } = useMemo(() => {
    const withEnv = entries.filter(e => e.ambient_humidity != null && e.ambient_temp != null);

    // Build grid[tempIdx][humIdx] = { total, failures }
    const grid = TEMP_BUCKETS.map(() => HUM_BUCKETS.map(() => ({ total: 0, failures: 0 })));

    withEnv.forEach(e => {
      const tIdx = TEMP_BUCKETS.findIndex(b => e.ambient_temp >= b.min && e.ambient_temp < b.max);
      const hIdx = HUM_BUCKETS.findIndex(b => e.ambient_humidity >= b.min && e.ambient_humidity < b.max);
      if (tIdx === -1 || hIdx === -1) return;
      grid[tIdx][hIdx].total++;
      if (e.outcome === 'failure' || e.outcome === 'partial') grid[tIdx][hIdx].failures++;
    });

    return { grid, hasData: withEnv.length > 0, totalWithEnv: withEnv.length };
  }, [entries]);

  // Compute Pearson correlation between humidity and failure (binary) across all entries with env data
  const humCorrelation = useMemo(() => {
    const pts = entries.filter(e => e.ambient_humidity != null);
    if (pts.length < 5) return null;
    const xs = pts.map(e => e.ambient_humidity);
    const ys = pts.map(e => (e.outcome === 'failure' || e.outcome === 'partial') ? 1 : 0);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
    const den = Math.sqrt(
      xs.reduce((s, x) => s + (x - meanX) ** 2, 0) *
      ys.reduce((s, y) => s + (y - meanY) ** 2, 0)
    );
    return den === 0 ? 0 : parseFloat((num / den).toFixed(2));
  }, [entries]);

  if (!hasData) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Environment vs. Failure Heatmap</h3>
        </div>
        <p className="text-xs text-slate-500 text-center py-6">
          Log prints with ambient temperature &amp; humidity to see this heatmap.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Environment vs. Failure Heatmap</h3>
        </div>
        <span className="text-xs text-slate-500">{totalWithEnv} prints</span>
      </div>

      {humCorrelation !== null && (
        <div className={cn(
          "flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-4 border",
          Math.abs(humCorrelation) >= 0.4
            ? "bg-red-500/10 border-red-500/30 text-red-300"
            : Math.abs(humCorrelation) >= 0.2
            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        )}>
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Humidity↔failure correlation: <strong>r = {humCorrelation}</strong>
            {Math.abs(humCorrelation) >= 0.4 ? " — strong signal, high humidity is hurting your prints" :
             Math.abs(humCorrelation) >= 0.2 ? " — moderate signal, humidity may be a factor" :
             " — weak signal, humidity isn't a major driver"}
          </span>
        </div>
      )}

      {/* Axis labels */}
      <div className="flex items-center gap-1 mb-1 pl-16">
        {HUM_BUCKETS.map((b) => (
          <div key={b.label} className="flex-1 text-center text-[10px] text-slate-500">{b.label}</div>
        ))}
      </div>
      <div className="flex items-center gap-0.5 mb-0.5 pl-16">
        <Droplets className="w-3 h-3 text-slate-500 mr-1" />
        <span className="text-[10px] text-slate-500">Humidity →</span>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1">
        {TEMP_BUCKETS.map((tb, tIdx) => (
          <div key={tb.label} className="flex items-center gap-1">
            {/* Temp label */}
            <div className="w-14 flex-shrink-0 text-right text-[10px] text-slate-500 pr-2">{tb.label}</div>
            {HUM_BUCKETS.map((hb, hIdx) => {
              const cell = grid[tIdx][hIdx];
              const failRate = cell.total > 0 ? cell.failures / cell.total : 0;
              const colors = scoreColor(failRate, cell.total);
              return (
                <div
                  key={hb.label}
                  className={cn(
                    "flex-1 aspect-square rounded-lg border flex flex-col items-center justify-center cursor-default transition-all relative",
                    colors.bg, colors.border,
                    tooltip?.t === tIdx && tooltip?.h === hIdx ? 'scale-110 z-10' : ''
                  )}
                  onMouseEnter={() => setTooltip({ t: tIdx, h: hIdx })}
                  onMouseLeave={() => setTooltip(null)}
                  onTouchStart={() => setTooltip(v => v?.t === tIdx && v?.h === hIdx ? null : { t: tIdx, h: hIdx })}
                >
                  {cell.total > 0 ? (
                    <>
                      <span className={cn("text-[11px] font-bold leading-tight", colors.text)}>
                        {Math.round(failRate * 100)}%
                      </span>
                      <span className="text-[9px] text-slate-500">{cell.total}p</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-700">—</span>
                  )}

                  {/* Tooltip */}
                  {tooltip?.t === tIdx && tooltip?.h === hIdx && cell.total > 0 && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-40 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs z-20 shadow-xl pointer-events-none">
                      <p className="font-semibold text-white mb-1">{tb.label} · {hb.label}</p>
                      <p className="text-slate-400">{cell.total} print{cell.total !== 1 ? 's' : ''}</p>
                      <p className="text-slate-400">{cell.failures} failure{cell.failures !== 1 ? 's' : ''}</p>
                      <p className={cn("font-bold mt-1", failRate >= 0.5 ? "text-red-400" : failRate >= 0.3 ? "text-amber-400" : "text-emerald-400")}>
                        {Math.round(failRate * 100)}% fail rate
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Y-axis label */}
      <div className="flex items-center gap-1 mt-2 pl-16">
        <Thermometer className="w-3 h-3 text-slate-500" />
        <span className="text-[10px] text-slate-500">Ambient Temp ↑ (rows)</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-[10px] text-slate-500">Fail rate:</span>
        {[
          { label: '0–10%', bg: 'bg-emerald-500/20' },
          { label: '10–30%', bg: 'bg-teal-500/20' },
          { label: '30–50%', bg: 'bg-amber-500/20' },
          { label: '50–70%', bg: 'bg-orange-500/25' },
          { label: '>70%', bg: 'bg-red-500/30' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={cn("w-3 h-3 rounded", l.bg)} />
            <span className="text-[10px] text-slate-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}