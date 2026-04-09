import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Thermometer, Clock, Droplets, Printer } from 'lucide-react';

// Returns a color from green → amber → red based on 0–1 rate
function rateColor(rate, count) {
  if (count === 0) return 'bg-slate-800/60 text-slate-600';
  if (rate === 0) return 'bg-emerald-500/20 text-emerald-300';
  if (rate < 0.25) return 'bg-green-500/20 text-green-300';
  if (rate < 0.5) return 'bg-amber-500/20 text-amber-300';
  if (rate < 0.75) return 'bg-orange-500/30 text-orange-300';
  return 'bg-red-500/30 text-red-300';
}

function HeatCell({ label, count, failures, showLabel = true }) {
  const rate = count > 0 ? failures / count : 0;
  const pct = Math.round(rate * 100);
  return (
    <div
      className={cn(
        'rounded-lg p-2 flex flex-col items-center justify-center text-center transition-all cursor-default',
        rateColor(rate, count)
      )}
      title={`${label}: ${failures}/${count} failed (${pct}%)`}
    >
      {showLabel && <span className="text-[10px] font-medium leading-tight mb-0.5 opacity-80">{label}</span>}
      <span className="text-xs font-bold">{count > 0 ? `${pct}%` : '—'}</span>
      <span className="text-[9px] opacity-60">{count > 0 ? `${count} prints` : 'no data'}</span>
    </div>
  );
}

const HOUR_BUCKETS = [
  { label: '12–6am', hours: [0,1,2,3,4,5] },
  { label: '6–9am', hours: [6,7,8] },
  { label: '9am–12', hours: [9,10,11] },
  { label: '12–3pm', hours: [12,13,14] },
  { label: '3–6pm', hours: [15,16,17] },
  { label: '6–9pm', hours: [18,19,20] },
  { label: '9pm–12', hours: [21,22,23] },
];

const HUMIDITY_BUCKETS = [
  { label: '<30%', min: 0, max: 30 },
  { label: '30–40%', min: 30, max: 40 },
  { label: '40–50%', min: 40, max: 50 },
  { label: '50–60%', min: 50, max: 60 },
  { label: '60–70%', min: 60, max: 70 },
  { label: '>70%', min: 70, max: 200 },
];

function Legend() {
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 mt-2">
      <span>Failure rate:</span>
      {[
        { cls: 'bg-emerald-500/20', label: '0%' },
        { cls: 'bg-green-500/20', label: '<25%' },
        { cls: 'bg-amber-500/20', label: '25–50%' },
        { cls: 'bg-orange-500/30', label: '50–75%' },
        { cls: 'bg-red-500/30', label: '>75%' },
      ].map(({ cls, label }) => (
        <span key={label} className="flex items-center gap-1">
          <span className={cn('w-3 h-3 rounded', cls)} />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function FailureHeatmaps({ entries }) {
  const failures = entries.filter(e => e.outcome === 'failure');

  // Time-of-day heatmap — uses created_date for time
  const timeData = useMemo(() => {
    return HOUR_BUCKETS.map(bucket => {
      const inBucket = entries.filter(e => {
        if (!e.created_date) return false;
        const h = new Date(e.created_date).getHours();
        return bucket.hours.includes(h);
      });
      const failed = inBucket.filter(e => e.outcome === 'failure').length;
      return { label: bucket.label, count: inBucket.length, failures: failed };
    });
  }, [entries]);

  // Humidity heatmap
  const humidityData = useMemo(() => {
    return HUMIDITY_BUCKETS.map(b => {
      const inBucket = entries.filter(e => e.ambient_humidity != null && e.ambient_humidity >= b.min && e.ambient_humidity < b.max);
      const failed = inBucket.filter(e => e.outcome === 'failure').length;
      return { label: b.label, count: inBucket.length, failures: failed };
    });
  }, [entries]);

  // Printer model heatmap
  const printerData = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!e.printer_model) return;
      if (!map[e.printer_model]) map[e.printer_model] = { count: 0, failures: 0 };
      map[e.printer_model].count++;
      if (e.outcome === 'failure') map[e.printer_model].failures++;
    });
    return Object.entries(map)
      .map(([label, { count, failures }]) => ({ label, count, failures }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [entries]);

  const hasHumidity = humidityData.some(d => d.count > 0);
  const hasPrinters = printerData.length > 0;

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Time of Day */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <p className="text-xs font-semibold text-white">Failure Rate by Time of Day</p>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {timeData.map(d => (
            <HeatCell key={d.label} label={d.label} count={d.count} failures={d.failures} />
          ))}
        </div>
        <Legend />
      </div>

      {/* Humidity */}
      {hasHumidity && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-xs font-semibold text-white">Failure Rate by Ambient Humidity</p>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {humidityData.map(d => (
              <HeatCell key={d.label} label={d.label} count={d.count} failures={d.failures} />
            ))}
          </div>
          <Legend />
        </div>
      )}

      {/* Printer Models */}
      {hasPrinters && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Printer className="w-3.5 h-3.5 text-orange-400" />
            <p className="text-xs font-semibold text-white">Failure Rate by Printer</p>
          </div>
          <div className="space-y-2">
            {printerData.map(d => {
              const rate = d.count > 0 ? d.failures / d.count : 0;
              const pct = Math.round(rate * 100);
              return (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-28 truncate flex-shrink-0">{d.label}</span>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        pct === 0 ? 'bg-emerald-500' :
                        pct < 25 ? 'bg-green-500' :
                        pct < 50 ? 'bg-amber-500' :
                        pct < 75 ? 'bg-orange-500' : 'bg-red-500'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white w-10 text-right">{pct}%</span>
                  <span className="text-xs text-slate-500 w-14 text-right">{d.failures}/{d.count}</span>
                </div>
              );
            })}
          </div>
          <Legend />
        </div>
      )}

      {!hasHumidity && !hasPrinters && failures.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-4">Log more prints with humidity and printer data to see trends.</p>
      )}
    </div>
  );
}