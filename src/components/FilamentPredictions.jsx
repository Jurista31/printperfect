import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, Clock, AlertTriangle, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, subDays, format } from 'date-fns';

// Estimated grams per minute of printing by material (based on typical 0.4mm nozzle, 0.2mm layer, ~50mm/s)
const GRAMS_PER_MIN = {
  PLA: 0.9, PETG: 1.0, ABS: 0.85, ASA: 0.85,
  TPU: 0.75, Nylon: 0.9, Resin: 1.5, Other: 0.9,
};

function calcDaysLabel(days) {
  if (days === null) return { text: 'No data', color: 'text-slate-500', icon: null };
  if (days === Infinity || days > 999) return { text: '999+ days', color: 'text-emerald-400', icon: null };
  if (days <= 7)  return { text: `${days}d`, color: 'text-red-400', icon: AlertTriangle };
  if (days <= 30) return { text: `${days}d`, color: 'text-amber-400', icon: Clock };
  return { text: `${days}d`, color: 'text-emerald-400', icon: CheckCircle2 };
}

export default function FilamentPredictions({ spools }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-for-predictions'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 500),
  });

  const predictions = useMemo(() => {
    if (!entries.length || !spools.length) return [];

    const now = new Date();
    const windowDays = 60;
    const cutoff = subDays(now, windowDays);

    // Group recent journal entries by material, sum duration minutes
    const materialUsage = {}; // material -> total minutes in last 60 days
    entries.forEach(e => {
      if (!e.print_date || !e.duration_minutes || !e.filament_material) return;
      const date = parseISO(e.print_date);
      if (date < cutoff) return;
      if (!materialUsage[e.filament_material]) materialUsage[e.filament_material] = 0;
      materialUsage[e.filament_material] += e.duration_minutes;
    });

    // Convert to grams per day for each material
    const gramsPerDay = {};
    Object.entries(materialUsage).forEach(([mat, totalMins]) => {
      const rate = GRAMS_PER_MIN[mat] || 0.9;
      gramsPerDay[mat] = (totalMins * rate) / windowDays;
    });

    // Predict days remaining per spool
    return spools.map(spool => {
      const remainingG = spool.remaining_grams ?? (spool.spool_weight_grams ?? 1000);
      const gpd = gramsPerDay[spool.material];
      const pct = spool.spool_weight_grams
        ? Math.round((remainingG / spool.spool_weight_grams) * 100)
        : null;

      if (!gpd || gpd < 0.01) {
        return { spool, daysLeft: null, gpd: null, pct };
      }

      const daysLeft = Math.round(remainingG / gpd);
      return { spool, daysLeft, gpd: Math.round(gpd * 10) / 10, pct };
    }).sort((a, b) => {
      // Sort: nulls last, then ascending days
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });
  }, [entries, spools]);

  // Summary: avg grams/day per material across journal
  const materialRates = useMemo(() => {
    const now = new Date();
    const cutoff = subDays(now, 60);
    const usage = {};
    entries.forEach(e => {
      if (!e.print_date || !e.duration_minutes || !e.filament_material) return;
      if (parseISO(e.print_date) < cutoff) return;
      if (!usage[e.filament_material]) usage[e.filament_material] = { mins: 0, count: 0 };
      usage[e.filament_material].mins += e.duration_minutes;
      usage[e.filament_material].count += 1;
    });
    return Object.entries(usage).map(([mat, { mins, count }]) => ({
      mat,
      gpd: Math.round(((mins * (GRAMS_PER_MIN[mat] || 0.9)) / 60) * 10) / 10,
      count,
    })).sort((a, b) => b.gpd - a.gpd);
  }, [entries]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Analysing print history…
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center text-slate-500 text-sm">
        Log prints in your journal to enable consumption predictions.
      </div>
    );
  }

  const hasAnyRate = materialRates.length > 0;

  return (
    <div className="space-y-4">
      {/* Consumption rates summary */}
      {hasAnyRate && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Usage Rates (last 60 days)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {materialRates.map(({ mat, gpd, count }) => (
              <div key={mat} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400 font-medium">{mat}</span>
                <span className="text-xs text-cyan-400 font-bold">{gpd}g/day</span>
                <span className="text-xs text-slate-600">· {count} prints</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-spool predictions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Days Remaining Per Spool</h3>
        </div>

        {predictions.length === 0 ? (
          <p className="text-slate-500 text-sm">Add spools to see predictions.</p>
        ) : (
          <div className="space-y-2">
            {predictions.map(({ spool, daysLeft, gpd, pct }) => {
              const { text, color, icon: Icon } = calcDaysLabel(daysLeft);
              const depletionDate = daysLeft != null && daysLeft < 999
                ? format(new Date(Date.now() + daysLeft * 86400000), 'MMM d, yyyy')
                : null;

              return (
                <div key={spool.id} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                  {/* Color dot */}
                  <div className="w-4 h-4 rounded-full flex-shrink-0 border border-white/10"
                    style={{ backgroundColor: spool.color_hex || '#94a3b8' }} />

                  {/* Spool info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{spool.brand} {spool.color}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500">{spool.material}</span>
                      {spool.remaining_grams != null && (
                        <span className="text-xs text-slate-600">{spool.remaining_grams}g left</span>
                      )}
                      {gpd && <span className="text-xs text-slate-600">@ {gpd}g/day</span>}
                    </div>
                  </div>

                  {/* Days remaining */}
                  <div className="text-right flex-shrink-0">
                    <div className={cn("flex items-center gap-1 justify-end font-bold text-sm", color)}>
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {text}
                    </div>
                    {depletionDate && (
                      <p className="text-xs text-slate-600 mt-0.5">~{depletionDate}</p>
                    )}
                    {daysLeft === null && (
                      <p className="text-xs text-slate-600 mt-0.5">No {spool.material} history</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}