import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const cards = [
  { key: 'total', label: 'Total Prints', icon: Clock, color: 'cyan' },
  { key: 'successRate', label: 'Success Rate', icon: CheckCircle2, color: 'green', suffix: '%' },
  { key: 'failureRate', label: 'Failure Rate', icon: XCircle, color: 'red', suffix: '%' },
  { key: 'avgDuration', label: 'Avg Duration', icon: AlertTriangle, color: 'amber', suffix: ' min' },
];

const colorMap = {
  cyan:  { card: 'bg-cyan-500/10 border-cyan-500/20',   icon: 'text-cyan-400',   val: 'text-cyan-300' },
  green: { card: 'bg-green-500/10 border-green-500/20', icon: 'text-green-400',  val: 'text-green-300' },
  red:   { card: 'bg-red-500/10 border-red-500/20',     icon: 'text-red-400',    val: 'text-red-300' },
  amber: { card: 'bg-amber-500/10 border-amber-500/20', icon: 'text-amber-400',  val: 'text-amber-300' },
};

export default function DashboardStatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {cards.map(({ key, label, icon: Icon, color, suffix = '' }) => {
        const c = colorMap[color];
        return (
          <div key={key} className={cn('rounded-xl border p-4', c.card)}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn('w-4 h-4', c.icon)} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <p className={cn('text-2xl font-bold', c.val)}>
              {stats[key] ?? '—'}{stats[key] != null ? suffix : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}