import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

function computeScore(defects = [], quality) {
  let score = 100;
  defects.forEach(d => {
    if (d.severity === 'high')   score -= 20;
    else if (d.severity === 'medium') score -= 12;
    else score -= 5;
  });
  if (quality === 'poor')      score -= 10;
  else if (quality === 'fair') score -= 5;
  else if (quality === 'excellent') score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

const getGrade = (score) => {
  if (score >= 90) return { label: 'Excellent', color: 'text-emerald-400', ring: 'stroke-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  if (score >= 70) return { label: 'Good',      color: 'text-cyan-400',    ring: 'stroke-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30' };
  if (score >= 45) return { label: 'Fair',      color: 'text-amber-400',   ring: 'stroke-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' };
  return             { label: 'Poor',      color: 'text-red-400',     ring: 'stroke-red-400',     bg: 'bg-red-500/10 border-red-500/30' };
};

const CIRCUMFERENCE = 2 * Math.PI * 36;

export default function PrintHealthScore({ defects, quality }) {
  const score = computeScore(defects, quality);
  const grade = getGrade(score);
  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('flex items-center gap-4 rounded-xl border p-4', grade.bg)}
    >
      {/* Ring */}
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="44" cy="44" r="36"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={grade.ring}
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold leading-none', grade.color)}>{score}</span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">/ 100</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className={cn('w-4 h-4', grade.color)} />
          <span className="text-sm font-semibold text-white">Print Health Score</span>
        </div>
        <p className={cn('text-lg font-bold', grade.color)}>{grade.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {defects?.length || 0} {(defects?.length || 0) === 1 ? 'issue' : 'issues'} found
          {score >= 70 ? ' — looking good' : score >= 45 ? ' — needs attention' : ' — serious issues'}
        </p>
      </div>
    </motion.div>
  );
}