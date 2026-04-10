import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FlaskConical, Loader2, TrendingUp, BarChart2, Award, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { format, parseISO, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

const qualityScore = { excellent: 100, good: 75, fair: 50, poor: 25 };
const outcomeScore = { success: 100, partial: 50, failure: 0 };

const MATERIAL_COLORS = {
  PLA: '#22d3ee', PETG: '#818cf8', ABS: '#fb923c',
  ASA: '#a78bfa', TPU: '#34d399', Nylon: '#f472b6',
  Resin: '#facc15', Other: '#94a3b8',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  );
};

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function MaterialPerformance() {
  const [tab, setTab] = useState('material'); // 'material' | 'brand'

  const { data: entries = [], isLoading: loadingJournal } = useQuery({
    queryKey: ['journal-mat'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 500),
  });

  const { data: analyses = [], isLoading: loadingAnalysis } = useQuery({
    queryKey: ['analyses-mat'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 500),
  });

  const isLoading = loadingJournal || loadingAnalysis;

  // Build analysis quality map by id
  const analysisMap = useMemo(() => {
    const m = {};
    analyses.forEach(a => { m[a.id] = a; });
    return m;
  }, [analyses]);

  // Per-material stats from journal entries
  const materialStats = useMemo(() => {
    const stats = {};
    entries.forEach(e => {
      const mat = e.filament_material || 'Unknown';
      if (!stats[mat]) stats[mat] = { material: mat, count: 0, successCount: 0, failureCount: 0, qualitySum: 0, qualityCount: 0, defectSum: 0 };
      stats[mat].count++;
      if (e.outcome === 'success') stats[mat].successCount++;
      if (e.outcome === 'failure') stats[mat].failureCount++;

      if (e.analysis_id && analysisMap[e.analysis_id]) {
        const a = analysisMap[e.analysis_id];
        if (a.overall_quality) {
          stats[mat].qualitySum += qualityScore[a.overall_quality] || 0;
          stats[mat].qualityCount++;
          stats[mat].defectSum += a.defects?.length || 0;
        }
      }
    });

    return Object.values(stats).map(s => ({
      ...s,
      successRate: s.count ? Math.round((s.successCount / s.count) * 100) : 0,
      failureRate: s.count ? Math.round((s.failureCount / s.count) * 100) : 0,
      avgQuality: s.qualityCount ? Math.round(s.qualitySum / s.qualityCount) : null,
      avgDefects: s.qualityCount ? parseFloat((s.defectSum / s.qualityCount).toFixed(1)) : null,
    })).sort((a, b) => (b.avgQuality ?? 0) - (a.avgQuality ?? 0));
  }, [entries, analysisMap]);

  // Per-brand stats
  const brandStats = useMemo(() => {
    const stats = {};
    entries.forEach(e => {
      if (!e.filament_brand) return;
      const key = e.filament_brand;
      if (!stats[key]) stats[key] = { brand: key, material: e.filament_material || '?', count: 0, successCount: 0, failureCount: 0, qualitySum: 0, qualityCount: 0 };
      stats[key].count++;
      if (e.outcome === 'success') stats[key].successCount++;
      if (e.outcome === 'failure') stats[key].failureCount++;
      if (e.analysis_id && analysisMap[e.analysis_id]) {
        const a = analysisMap[e.analysis_id];
        if (a.overall_quality) { stats[key].qualitySum += qualityScore[a.overall_quality] || 0; stats[key].qualityCount++; }
      }
    });
    return Object.values(stats).map(s => ({
      ...s,
      successRate: s.count ? Math.round((s.successCount / s.count) * 100) : 0,
      failureRate: s.count ? Math.round((s.failureCount / s.count) * 100) : 0,
      avgQuality: s.qualityCount ? Math.round(s.qualitySum / s.qualityCount) : null,
    })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [entries, analysisMap]);

  // Quality trend over time by top 3 materials
  const topMaterials = useMemo(() => materialStats.slice(0, 3).map(m => m.material), [materialStats]);

  const trendData = useMemo(() => {
    const byMonth = {};
    entries.forEach(e => {
      if (!e.print_date || !e.filament_material) return;
      if (!topMaterials.includes(e.filament_material)) return;
      const month = format(startOfMonth(parseISO(e.print_date)), 'MMM yy');
      if (!byMonth[month]) byMonth[month] = { month };
      const mat = e.filament_material;
      if (!byMonth[month][mat + '_sum']) { byMonth[month][mat + '_sum'] = 0; byMonth[month][mat + '_count'] = 0; }
      byMonth[month][mat + '_sum'] += outcomeScore[e.outcome] ?? 50;
      byMonth[month][mat + '_count']++;
    });

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([month, data]) => {
        const row = { month };
        topMaterials.forEach(mat => {
          if (data[mat + '_count']) row[mat] = Math.round(data[mat + '_sum'] / data[mat + '_count']);
        });
        return row;
      });
  }, [entries, topMaterials]);

  // Radar data for materials
  const radarData = useMemo(() => {
    return materialStats.slice(0, 6).map(m => ({
      material: m.material,
      'Success Rate': m.successRate,
      'Avg Quality': m.avgQuality ?? 0,
      'Low Defects': m.avgDefects != null ? Math.max(0, 100 - m.avgDefects * 20) : 0,
      'Print Count': Math.min(100, m.count * 5),
    }));
  }, [materialStats]);

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
    </div>
  );

  if (entries.length === 0) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4 px-8 text-center">
      <FlaskConical className="w-16 h-16 text-slate-700" />
      <h2 className="text-xl font-bold text-white">No journal data yet</h2>
      <p className="text-slate-500 text-sm">Log some prints in your Print Journal to see material performance here.</p>
    </div>
  );

  const activeData = tab === 'material' ? materialStats : brandStats;
  const labelKey   = tab === 'material' ? 'material' : 'brand';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Material Performance</h1>
              <p className="text-xs text-slate-500">{entries.length} prints · {materialStats.length} materials tracked</p>
            </div>
          </div>
        </motion.div>

        {/* Tab toggle */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="flex gap-2 mb-5">
          {['material', 'brand'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-2 rounded-xl text-sm font-medium transition-colors border",
                tab === t ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-slate-800 border-slate-700 text-slate-400")}
            >
              By {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </motion.div>

        {/* Top performer cards */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="mb-5">
          {activeData.length > 0 && (() => {
            const best = activeData.reduce((a, b) => ((b.successRate || 0) > (a.successRate || 0) ? b : a), activeData[0]);
            const worst = activeData.reduce((a, b) => ((b.failureRate || 0) > (a.failureRate || 0) ? b : a), activeData[0]);
            return (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Top Performer</span>
                  </div>
                  <p className="text-white font-bold truncate">{best[labelKey]}</p>
                  <p className="text-emerald-400 text-sm">{best.successRate}% success</p>
                  {best.avgQuality && <p className="text-slate-400 text-xs">Quality: {best.avgQuality}/100</p>}
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400 font-medium">Needs Attention</span>
                  </div>
                  <p className="text-white font-bold truncate">{worst[labelKey]}</p>
                  <p className="text-red-400 text-sm">{worst.failureRate}% failure</p>
                  {worst.avgDefects != null && <p className="text-slate-400 text-xs">Avg defects: {worst.avgDefects}</p>}
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* Success Rate Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionCard title="Success Rate by Material" icon={BarChart2}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activeData} margin={{ left: -20 }}>
                <XAxis dataKey={labelKey} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="successRate" name="Success %" radius={[4, 4, 0, 0]}>
                  {activeData.map((entry, i) => (
                    <Cell key={i} fill={MATERIAL_COLORS[entry.material] || '#22d3ee'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </motion.div>

        {/* Avg Quality Score */}
        {activeData.some(d => d.avgQuality != null) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="mt-4">
            <SectionCard title="Average Quality Score (AI)" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activeData.filter(d => d.avgQuality != null)} margin={{ left: -20 }}>
                  <XAxis dataKey={labelKey} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgQuality" name="Avg Quality" radius={[4, 4, 0, 0]}>
                    {activeData.filter(d => d.avgQuality != null).map((entry, i) => (
                      <Cell key={i} fill={MATERIAL_COLORS[entry.material] || '#818cf8'} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </motion.div>
        )}

        {/* Success rate trend over time */}
        {trendData.length > 1 && topMaterials.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-4">
            <SectionCard title="Success Rate Trend (Top Materials)" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ left: -20 }}>
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  {topMaterials.map(mat => (
                    <Line key={mat} type="monotone" dataKey={mat} stroke={MATERIAL_COLORS[mat] || '#22d3ee'} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>
          </motion.div>
        )}

        {/* Stats table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }} className="mt-4">
          <SectionCard title="Full Breakdown" icon={BarChart2}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left pb-2">{tab === 'material' ? 'Material' : 'Brand'}</th>
                    <th className="text-right pb-2">Prints</th>
                    <th className="text-right pb-2">Success%</th>
                    <th className="text-right pb-2">Quality</th>
                    <th className="text-right pb-2">Defects</th>
                  </tr>
                </thead>
                <tbody>
                  {activeData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-800 last:border-0">
                      <td className="py-2 font-medium" style={{ color: MATERIAL_COLORS[row.material] || '#22d3ee' }}>
                        {row[labelKey]}
                        {tab === 'brand' && <span className="text-slate-600 ml-1">({row.material})</span>}
                      </td>
                      <td className="py-2 text-right text-slate-300">{row.count}</td>
                      <td className="py-2 text-right">
                        <span className={cn("font-semibold", row.successRate >= 75 ? 'text-emerald-400' : row.successRate >= 50 ? 'text-amber-400' : 'text-red-400')}>
                          {row.successRate}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-300">{row.avgQuality ?? '—'}</td>
                      <td className="py-2 text-right text-slate-300">{row.avgDefects ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </motion.div>
      </div>
    </div>
  );
}