import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, CartesianGrid
} from 'recharts';
import { BarChart3, Loader2, Package, Printer, Clock, AlertTriangle, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const PALETTE = ['#22d3ee', '#818cf8', '#34d399', '#fb923c', '#f472b6', '#a78bfa', '#fbbf24', '#f87171'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#94a3b8' }}>
          {p.name}: <span className="font-semibold">{p.value}{p.unit || ''}</span>
        </p>
      ))}
    </div>
  );
};

function SectionCard({ title, dot, children }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full inline-block", dot)} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function RankRow({ rank, label, value, sub, color, barPct }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-4 text-right flex-shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-300 truncate">{label}</span>
          <span className={cn("text-xs font-bold ml-2 flex-shrink-0", color)}>{value}</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: color?.includes('red') ? '#f87171' : color?.includes('amber') ? '#fbbf24' : color?.includes('green') ? '#34d399' : '#22d3ee' }} />
        </div>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-analytics'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 500),
  });

  // --- Success rate per material ---
  const materialStats = useMemo(() => {
    const byMat = {};
    entries.forEach(e => {
      const mat = e.filament_material || 'Unknown';
      if (!byMat[mat]) byMat[mat] = { material: mat, total: 0, success: 0, failure: 0, partial: 0, durations: [] };
      byMat[mat].total++;
      byMat[mat][e.outcome || 'partial']++;
      if (e.duration_minutes) byMat[mat].durations.push(e.duration_minutes);
    });
    return Object.values(byMat)
      .filter(m => m.total >= 1)
      .sort((a, b) => b.total - a.total)
      .map(m => ({
        ...m,
        successRate: Math.round((m.success / m.total) * 100),
        failureRate: Math.round((m.failure / m.total) * 100),
        avgDuration: m.durations.length ? Math.round(m.durations.reduce((s, v) => s + v, 0) / m.durations.length) : null,
      }));
  }, [entries]);

  // --- Success rate per printer ---
  const printerStats = useMemo(() => {
    const byPrinter = {};
    entries.forEach(e => {
      const p = e.printer_model || 'Unknown';
      if (!byPrinter[p]) byPrinter[p] = { printer: p, total: 0, success: 0, failure: 0, partial: 0, durations: [] };
      byPrinter[p].total++;
      byPrinter[p][e.outcome || 'partial']++;
      if (e.duration_minutes) byPrinter[p].durations.push(e.duration_minutes);
    });
    return Object.values(byPrinter)
      .filter(p => p.total >= 1)
      .sort((a, b) => b.total - a.total)
      .map(p => ({
        ...p,
        successRate: Math.round((p.success / p.total) * 100),
        failureRate: Math.round((p.failure / p.total) * 100),
        avgDuration: p.durations.length ? Math.round(p.durations.reduce((s, v) => s + v, 0) / p.durations.length) : null,
        shortName: p.printer.length > 16 ? p.printer.slice(0, 16) + '…' : p.printer,
      }));
  }, [entries]);

  // --- Overall stats ---
  const overall = useMemo(() => {
    const total = entries.length;
    if (!total) return null;
    const success = entries.filter(e => e.outcome === 'success').length;
    const failure = entries.filter(e => e.outcome === 'failure').length;
    const withDur = entries.filter(e => e.duration_minutes);
    const avgDur = withDur.length ? Math.round(withDur.reduce((s, e) => s + e.duration_minutes, 0) / withDur.length) : null;
    return { total, success, failure, partial: total - success - failure, successRate: Math.round(success / total * 100), failureRate: Math.round(failure / total * 100), avgDur };
  }, [entries]);

  // --- Failure rate ranking (material + printer combined, highest failure first) ---
  const failureRanking = useMemo(() => {
    const combined = [
      ...materialStats.filter(m => m.total >= 2).map(m => ({ label: m.material, failureRate: m.failureRate, total: m.total, type: 'material' })),
      ...printerStats.filter(p => p.total >= 2).map(p => ({ label: p.printer, failureRate: p.failureRate, total: p.total, type: 'printer' })),
    ];
    return combined.sort((a, b) => b.failureRate - a.failureRate).slice(0, 6);
  }, [materialStats, printerStats]);

  // --- Avg duration per material chart data ---
  const durationByMaterial = useMemo(() =>
    materialStats.filter(m => m.avgDuration).map(m => ({ material: m.material.length > 8 ? m.material : m.material, avgDuration: m.avgDuration })),
    [materialStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <BarChart3 className="w-16 h-16 text-slate-700" />
        <h2 className="text-xl font-bold text-white">No data yet</h2>
        <p className="text-slate-500 text-sm">Log some prints in your Journal to start seeing analytics.</p>
      </div>
    );
  }

  const maxFailRate = failureRanking[0]?.failureRate || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Print Analytics</h1>
              <p className="text-xs text-slate-500">Performance by material & printer · {entries.length} prints</p>
            </div>
          </div>
        </motion.div>

        {/* Summary stat pills */}
        {overall && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: Award, label: 'Overall Success Rate', value: `${overall.successRate}%`, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              { icon: AlertTriangle, label: 'Overall Failure Rate', value: `${overall.failureRate}%`, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { icon: Clock, label: 'Avg Duration', value: overall.avgDur ? `${overall.avgDur}m` : '—', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
              { icon: TrendingUp, label: 'Total Prints', value: overall.total, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className={cn("rounded-xl border p-4", bg)}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("w-4 h-4", color)} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Success rate by material */}
        {materialStats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <SectionCard title="Success Rate by Material" dot="bg-green-400">
              <ResponsiveContainer width="100%" height={materialStats.length * 44 + 20}>
                <BarChart data={materialStats} layout="vertical" barSize={16} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="material" type="category" width={62} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, 'Success Rate']} />
                  <Bar dataKey="successRate" name="Success Rate" radius={[0, 4, 4, 0]}>
                    {materialStats.map((m, i) => (
                      <Cell key={i} fill={m.successRate >= 70 ? '#34d399' : m.successRate >= 40 ? '#fbbf24' : '#f87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {[['#34d399', '≥70% good'], ['#fbbf24', '40–69% fair'], ['#f87171', '<40% poor']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                    {l}
                  </span>
                ))}
              </div>
            </SectionCard>
          </motion.div>
        )}

        {/* Success rate by printer */}
        {printerStats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <SectionCard title="Printer Reliability" dot="bg-cyan-400">
              <ResponsiveContainer width="100%" height={printerStats.length * 44 + 20}>
                <BarChart data={printerStats} layout="vertical" barSize={16} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="shortName" type="category" width={80} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, 'Success Rate']} />
                  <Bar dataKey="successRate" name="Success Rate" radius={[0, 4, 4, 0]}>
                    {printerStats.map((p, i) => (
                      <Cell key={i} fill={p.successRate >= 70 ? '#22d3ee' : p.successRate >= 40 ? '#fbbf24' : '#f87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Avg duration per printer */}
              {printerStats.some(p => p.avgDuration) && (
                <div className="mt-4 space-y-2 pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 font-medium mb-2">Avg Print Duration</p>
                  {printerStats.filter(p => p.avgDuration).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate flex-1">{p.printer}</span>
                      <span className="text-cyan-300 font-semibold ml-3 flex-shrink-0">{p.avgDuration}m</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </motion.div>
        )}

        {/* Average duration by material */}
        {durationByMaterial.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <SectionCard title="Avg Duration by Material (min)" dot="bg-amber-400">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={durationByMaterial} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="material" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v} min`, 'Avg Duration']} />
                  <Bar dataKey="avgDuration" name="Avg Duration" radius={[4, 4, 0, 0]}>
                    {durationByMaterial.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </motion.div>
        )}

        {/* Failure rate ranking */}
        {failureRanking.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <SectionCard title="Highest Failure Rates" dot="bg-red-400">
              <div className="space-y-3">
                {failureRanking.map((item, i) => (
                  <RankRow
                    key={i}
                    rank={i + 1}
                    label={item.label}
                    value={`${item.failureRate}%`}
                    sub={`${item.total} print${item.total > 1 ? 's' : ''} · ${item.type}`}
                    color={item.failureRate >= 50 ? 'text-red-400' : item.failureRate >= 25 ? 'text-amber-400' : 'text-green-400'}
                    barPct={Math.round((item.failureRate / maxFailRate) * 100)}
                  />
                ))}
              </div>
              {failureRanking.length > 0 && failureRanking[0].failureRate > 0 && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200 leading-relaxed">
                    <span className="font-semibold">{failureRanking[0].label}</span> has the highest failure rate at{' '}
                    <span className="font-semibold">{failureRanking[0].failureRate}%</span>. Review its settings or consider switching equipment.
                  </p>
                </div>
              )}
            </SectionCard>
          </motion.div>
        )}

        {/* Material detail table */}
        {materialStats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SectionCard title="Material Performance Breakdown" dot="bg-purple-400">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700/50">
                      <th className="text-left pb-2 font-medium">Material</th>
                      <th className="text-center pb-2 font-medium">Total</th>
                      <th className="text-center pb-2 font-medium text-green-400">✓</th>
                      <th className="text-center pb-2 font-medium text-red-400">✗</th>
                      <th className="text-right pb-2 font-medium">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {materialStats.map((m, i) => (
                      <tr key={i} className="text-slate-300">
                        <td className="py-2 font-medium">{m.material}</td>
                        <td className="py-2 text-center text-slate-400">{m.total}</td>
                        <td className="py-2 text-center text-green-400 font-semibold">{m.success}</td>
                        <td className="py-2 text-center text-red-400 font-semibold">{m.failure}</td>
                        <td className="py-2 text-right text-slate-400">{m.avgDuration ? `${m.avgDuration}m` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}