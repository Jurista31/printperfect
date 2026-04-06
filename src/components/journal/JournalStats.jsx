import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CheckCircle2, XCircle, AlertCircle, Clock, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfWeek } from 'date-fns';

const OUTCOME_COLORS = { success: '#34d399', partial: '#fbbf24', failure: '#f87171' };
const MAT_COLORS = ['#22d3ee', '#818cf8', '#fb923c', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#f87171'];

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs shadow-lg">
      {payload.map((p, i) => <p key={i} style={{ color: p.color || p.fill }}>{p.name || p.dataKey}: <b>{p.value}</b></p>)}
    </div>
  );
};

export default function JournalStats({ entries }) {
  const total = entries.length;
  const successRate = total ? Math.round(entries.filter(e => e.outcome === 'success').length / total * 100) : 0;
  const totalTime = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const avgTime = total ? Math.round(totalTime / total) : 0;

  const outcomeDist = useMemo(() => {
    const c = { success: 0, partial: 0, failure: 0 };
    entries.forEach(e => { if (c[e.outcome] != null) c[e.outcome]++; });
    return Object.entries(c).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [entries]);

  const materialDist = useMemo(() => {
    const c = {};
    entries.forEach(e => { if (e.filament_material) c[e.filament_material] = (c[e.filament_material] || 0) + 1; });
    return Object.entries(c).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [entries]);

  const weeklyActivity = useMemo(() => {
    const byWeek = {};
    entries.forEach(e => {
      if (!e.print_date) return;
      const w = format(startOfWeek(parseISO(e.print_date)), 'MMM d');
      if (!byWeek[w]) byWeek[w] = { week: w, success: 0, failure: 0, partial: 0 };
      byWeek[w][e.outcome] = (byWeek[w][e.outcome] || 0) + 1;
    });
    return Object.values(byWeek).slice(-8);
  }, [entries]);

  if (total === 0) return null;

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Layers, label: 'Total Prints', value: total, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
          { icon: CheckCircle2, label: 'Success Rate', value: `${successRate}%`, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { icon: XCircle, label: 'Failed', value: entries.filter(e => e.outcome === 'failure').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { icon: Clock, label: 'Avg Duration', value: avgTime ? `${avgTime}m` : '—', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={cn("rounded-xl border p-3", bg)}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon className={cn("w-3.5 h-3.5", color)} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <p className={cn("text-xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Outcome pie */}
      {outcomeDist.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
            Outcome Distribution
          </p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={120}>
              <PieChart>
                <Pie data={outcomeDist} cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={3} dataKey="value">
                  {outcomeDist.map((e, i) => <Cell key={i} fill={OUTCOME_COLORS[e.name] || '#94a3b8'} />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {outcomeDist.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                    <span className="w-2 h-2 rounded-full" style={{ background: OUTCOME_COLORS[name] }} />
                    {name}
                  </span>
                  <span className="text-xs font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekly activity */}
      {weeklyActivity.length > 1 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
            Weekly Activity
          </p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={weeklyActivity} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="success" stackId="a" fill="#34d399" name="Success" radius={[0,0,0,0]} />
              <Bar dataKey="partial" stackId="a" fill="#fbbf24" name="Partial" />
              <Bar dataKey="failure" stackId="a" fill="#f87171" name="Failure" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Material breakdown */}
      {materialDist.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            Materials Used
          </p>
          <div className="flex flex-wrap gap-2">
            {materialDist.map(({ name, count }, i) => (
              <div key={name} className="flex items-center gap-1.5 bg-slate-700/50 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full" style={{ background: MAT_COLORS[i % MAT_COLORS.length] }} />
                <span className="text-xs text-slate-300 font-medium">{name}</span>
                <span className="text-xs text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}