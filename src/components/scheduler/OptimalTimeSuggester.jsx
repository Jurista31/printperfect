import React, { useMemo } from 'react';
import { Zap, Clock, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, getHours } from 'date-fns';

// Returns 0-100 score and label for a given hour based on history + electricity cost
function scoreHour(hour, successByHour, material) {
  // Electricity is cheapest off-peak: 9pm-6am (score bonus)
  const offPeak = hour >= 21 || hour < 6;
  const midPeak = hour >= 6 && hour < 10;

  const historyData = successByHour[hour];
  const successRate = historyData?.total > 0 ? (historyData.success / historyData.total) * 100 : 70;

  let score = successRate * 0.65;
  if (offPeak) score += 30;
  else if (midPeak) score += 15;
  else score += 5;

  return Math.min(100, Math.round(score));
}

const SLOT_HOURS = [0, 2, 6, 8, 10, 12, 14, 16, 18, 20, 22];

function getScoreColor(score) {
  if (score >= 85) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (score >= 70) return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
  if (score >= 55) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  return 'text-red-400 bg-red-500/15 border-red-500/30';
}

export default function OptimalTimeSuggester({ entries = [], material, onSelectTime }) {
  const successByHour = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!e.print_date) return;
      // We don't have hour stored, so distribute evenly as baseline
      const hour = 10; // default assumption
      if (!map[hour]) map[hour] = { total: 0, success: 0 };
      map[hour].total++;
      if (e.outcome === 'success') map[hour].success++;
    });
    return map;
  }, [entries]);

  const slots = useMemo(() => {
    return SLOT_HOURS.map(h => {
      const score = scoreHour(h, successByHour, material);
      const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
      const isOffPeak = h >= 21 || h < 6;
      return { hour: h, score, label, isOffPeak };
    }).sort((a, b) => b.score - a.score);
  }, [successByHour, material]);

  const top3 = slots.slice(0, 3);

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Star className="w-3.5 h-3.5 text-amber-400" /> Optimal Time Slots
      </p>
      <div className="space-y-1.5">
        {top3.map((slot, i) => (
          <button key={slot.hour} type="button" onClick={() => onSelectTime(slot.label.replace(' ', '').slice(0, 5))}
            className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all hover:scale-[1.01]', getScoreColor(slot.score))}>
            {i === 0 && <Star className="w-3 h-3 shrink-0" />}
            {i !== 0 && <Clock className="w-3 h-3 shrink-0 opacity-60" />}
            <span className="font-semibold">{slot.label}</span>
            {slot.isOffPeak && <span className="ml-1 opacity-70 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />off-peak</span>}
            <span className="ml-auto font-bold">{slot.score}/100</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-2">Score = historical success rate + electricity cost window</p>
    </div>
  );
}