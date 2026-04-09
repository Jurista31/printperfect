import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';
import {
  BarChart3, Loader2, AlertTriangle, TrendingUp, Award, Clock,
  Thermometer, Zap, Layers, Wind, Droplets
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SettingsHeatmap from '@/components/analytics/SettingsHeatmap';
import AmbientHeatmap from '@/components/analytics/AmbientHeatmap';
import PerformanceOverTime from '@/components/analytics/PerformanceOverTime';
import FilamentCostTab from '@/components/analytics/FilamentCostTab';
import AIInsightsPanel from '@/components/analytics/AIInsightsPanel';
import PredictiveMaintenancePanel from '@/components/analytics/PredictiveMaintenancePanel';
import MaterialAdvisorPanel from '@/components/analytics/MaterialAdvisorPanel';
import PrintQualityAnalyzer from '@/components/analytics/PrintQualityAnalyzer';
import FailureTrendsPanel from '@/components/analytics/FailureTrendsPanel';
import { format, parseISO, startOfMonth } from 'date-fns';

// ─── helpers ─────────────────────────────────────────────────────────────────

function bucket(value, edges) {
  if (value == null || isNaN(value)) return null;
  for (let i = 0; i < edges.length - 1; i++) {
    if (value >= edges[i] && value < edges[i + 1]) return `${edges[i]}–${edges[i + 1]}`;
  }
  const last = edges[edges.length - 1];
  if (value >= last) return `≥${last}`;
  return `<${edges[0]}`;
}

function bucketLabel(value, edges) {
  return bucket(value, edges);
}

function buildCells(entries, xKey, xEdges, yKey, yEdges, outcomeKey = 'outcome') {
  const map = {};
  entries.forEach(e => {
    const x = bucketLabel(e[xKey], xEdges);
    const y = bucketLabel(e[yKey], yEdges);
    if (!x || !y) return;
    const k = `${x}||${y}`;
    if (!map[k]) map[k] = { x, y, total: 0, failures: 0 };
    map[k].total++;
    if (e[outcomeKey] === 'failure') map[k].failures++;
  });
  return Object.values(map).map(c => ({
    ...c,
    failureRate: c.total ? Math.round((c.failures / c.total) * 100) : 0,
  }));
}

function buildAmbientBuckets(entries, key, edges, unit = '') {
  const map = {};
  edges.forEach((e, i) => {
    if (i < edges.length - 1) {
      const label = `${e}–${edges[i + 1]}`;
      map[label] = { label, total: 0, failures: 0 };
    }
  });
  const lastLabel = `≥${edges[edges.length - 1]}`;
  map[lastLabel] = { label: lastLabel, total: 0, failures: 0 };

  entries.forEach(e => {
    const v = e[key];
    if (v == null || isNaN(v)) return;
    let found = false;
    for (let i = 0; i < edges.length - 1; i++) {
      if (v >= edges[i] && v < edges[i + 1]) {
        const label = `${edges[i]}–${edges[i + 1]}`;
        map[label].total++;
        if (e.outcome === 'failure') map[label].failures++;
        found = true;
        break;
      }
    }
    if (!found && v >= edges[edges.length - 1]) {
      map[lastLabel].total++;
      if (e.outcome === 'failure') map[lastLabel].failures++;
    }
  });

  return Object.values(map).map(b => ({
    ...b,
    failureRate: b.total ? Math.round((b.failures / b.total) * 100) : 0,
  }));
}

// ─── shared UI ───────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Icon className={cn('w-4 h-4', iconColor)} />
        {title}
      </h2>
      {children}
    </div>
  );
}

const TABS = ['Heatmaps', 'By Material', 'By Printer', 'Ambient', 'Filament Cost', 'AI Insights', 'Predict', 'Advisor', 'Visual QA', 'Trends'];

// ─── main page ───────────────────────────────────────────────────────────────

export default function Analytics() {
  const [tab, setTab] = useState('Heatmaps');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-analytics'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 500),
  });

  const failures = useMemo(() => entries.filter(e => e.outcome === 'failure'), [entries]);

  // ── overall stats ──
  const overall = useMemo(() => {
    const total = entries.length;
    if (!total) return null;
    const success = entries.filter(e => e.outcome === 'success').length;
    const failure = failures.length;
    const withDur = entries.filter(e => e.duration_minutes);
    const avgDur = withDur.length
      ? Math.round(withDur.reduce((s, e) => s + e.duration_minutes, 0) / withDur.length)
      : null;
    return { total, success, failure, successRate: Math.round(success / total * 100), failureRate: Math.round(failure / total * 100), avgDur };
  }, [entries, failures]);

  // ── 2D heatmaps ──
  // Nozzle temp vs Print speed
  const nozzleVsSpeed = useMemo(() => buildCells(
    entries,
    'nozzle_temp', [170, 190, 200, 210, 220, 240, 260],
    'print_speed', [20, 40, 60, 80, 100, 120]
  ), [entries]);

  // Bed temp vs Layer height
  const bedVsLayer = useMemo(() => buildCells(
    entries,
    'bed_temp', [40, 50, 60, 70, 80, 90, 110],
    'layer_height', [0.1, 0.15, 0.2, 0.25, 0.3, 0.4]
  ), [entries]);

  // Infill vs Speed
  const infillVsSpeed = useMemo(() => buildCells(
    entries,
    'infill_percent', [10, 20, 30, 40, 60, 80, 100],
    'print_speed', [20, 40, 60, 80, 100, 120]
  ), [entries]);

  // Nozzle temp vs layer height
  const nozzleVsLayer = useMemo(() => buildCells(
    entries,
    'nozzle_temp', [170, 190, 200, 210, 220, 240, 260],
    'layer_height', [0.1, 0.15, 0.2, 0.25, 0.3, 0.4]
  ), [entries]);

  // ── ambient ──
  const ambientTempBuckets = useMemo(() =>
    buildAmbientBuckets(entries, 'ambient_temp', [10, 15, 18, 21, 24, 27, 30, 35], '°C'),
    [entries]);
  const ambientHumidBuckets = useMemo(() =>
    buildAmbientBuckets(entries, 'ambient_humidity', [20, 30, 40, 50, 60, 70, 80], '%'),
    [entries]);

  // ── performance over time ──
  const performanceOverTime = useMemo(() => {
    const byMonth = {};
    entries.forEach(e => {
      if (!e.print_date) return;
      const month = format(startOfMonth(parseISO(e.print_date)), 'MMM yy');
      if (!byMonth[month]) byMonth[month] = { month, total: 0, success: 0, durations: [] };
      byMonth[month].total++;
      if (e.outcome === 'success') byMonth[month].success++;
      if (e.duration_minutes) byMonth[month].durations.push(e.duration_minutes);
    });
    return Object.values(byMonth).map(m => ({
      month: m.month,
      successRate: Math.round((m.success / m.total) * 100),
      avgDuration: m.durations.length
        ? Math.round(m.durations.reduce((s, v) => s + v, 0) / m.durations.length)
        : null,
    })).filter(m => m.avgDuration !== null);
  }, [entries]);

  // ── per-material ──
  const materialStats = useMemo(() => {
    const byMat = {};
    entries.forEach(e => {
      const mat = e.filament_material || 'Unknown';
      if (!byMat[mat]) byMat[mat] = { material: mat, total: 0, success: 0, failure: 0, partial: 0 };
      byMat[mat].total++;
      byMat[mat][e.outcome || 'partial']++;
    });
    return Object.values(byMat)
      .sort((a, b) => b.total - a.total)
      .map(m => ({
        ...m,
        successRate: Math.round((m.success / m.total) * 100),
        failureRate: Math.round((m.failure / m.total) * 100),
      }));
  }, [entries]);

  // ── per-printer ──
  const printerStats = useMemo(() => {
    const byP = {};
    entries.forEach(e => {
      const p = e.printer_model || 'Unknown';
      if (!byP[p]) byP[p] = { printer: p, total: 0, success: 0, failure: 0, partial: 0 };
      byP[p].total++;
      byP[p][e.outcome || 'partial']++;
    });
    return Object.values(byP)
      .sort((a, b) => b.total - a.total)
      .map(p => ({
        ...p,
        successRate: Math.round((p.success / p.total) * 100),
        failureRate: Math.round((p.failure / p.total) * 100),
        shortName: p.printer.length > 18 ? p.printer.slice(0, 18) + '…' : p.printer,
      }));
  }, [entries]);

  // ── heatmap bucket arrays ──
  const nozzleBuckets  = ['170–190','190–200','200–210','210–220','220–240','240–260','≥260'];
  const speedBuckets   = ['20–40','40–60','60–80','80–100','100–120','≥120'];
  const bedBuckets     = ['40–50','50–60','60–70','70–80','80–90','90–110','≥110'];
  const layerBuckets   = ['0.1–0.15','0.15–0.2','0.2–0.25','0.25–0.3','0.3–0.4','≥0.4'];
  const infillBuckets  = ['10–20','20–30','30–40','40–60','60–80','80–100','≥100'];

  // filter out empty rows/cols from the heatmaps
  const usedBuckets = (cells, axis) => {
    const used = new Set(cells.filter(c => c.total > 0).map(c => c[axis]));
    return (axis === 'x' ? [...nozzleBuckets, ...speedBuckets, ...bedBuckets, ...layerBuckets, ...infillBuckets] : [])
      .filter(b => used.has(b));
  };

  // helper: get sorted unique values present in cells
  const activeBuckets = (cells, axis, allBuckets) =>
    allBuckets.filter(b => cells.some(c => c[axis] === b && c.total > 0));

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Failure Analytics</h1>
              <p className="text-xs text-slate-500">Settings heatmaps · {entries.length} prints · {failures.length} failures</p>
            </div>
          </div>
        </motion.div>

        {/* Stat pills */}
        {overall && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
            className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: 'Success', value: `${overall.successRate}%`, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              { label: 'Failure', value: `${overall.failureRate}%`, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { label: 'Avg Dur', value: overall.avgDur ? `${overall.avgDur}m` : '—', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
              { label: 'Total', value: overall.total, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={cn('rounded-xl border p-3 text-center', bg)}>
                <p className={cn('text-lg font-bold', color)}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Performance over time — always visible */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
          <PerformanceOverTime data={performanceOverTime} />
        </motion.div>

        {/* Tab bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}
          className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 mb-5 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 min-w-max py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                tab === t
                  ? 'bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {t}
            </button>
          ))}
        </motion.div>

        {/* ── HEATMAPS TAB ── */}
        {tab === 'Heatmaps' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {failures.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
                <Award className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-white font-semibold">No failures logged!</p>
                <p className="text-slate-500 text-xs mt-1">Log some failed prints to see failure heatmaps.</p>
              </div>
            ) : (
              <>
                <SectionCard title="Nozzle Temp × Print Speed failure rate" icon={Thermometer} iconColor="text-orange-400">
                  <SettingsHeatmap
                    xLabel="Nozzle Temp (°C)"
                    yLabel="Speed (mm/s)"
                    xBuckets={activeBuckets(nozzleVsSpeed, 'x', nozzleBuckets)}
                    yBuckets={activeBuckets(nozzleVsSpeed, 'y', speedBuckets)}
                    cells={nozzleVsSpeed}
                  />
                </SectionCard>

                <SectionCard title="Bed Temp × Layer Height failure rate" icon={Layers} iconColor="text-indigo-400">
                  <SettingsHeatmap
                    xLabel="Bed Temp (°C)"
                    yLabel="Layer (mm)"
                    xBuckets={activeBuckets(bedVsLayer, 'x', bedBuckets)}
                    yBuckets={activeBuckets(bedVsLayer, 'y', layerBuckets)}
                    cells={bedVsLayer}
                  />
                </SectionCard>

                <SectionCard title="Infill % × Print Speed failure rate" icon={Zap} iconColor="text-yellow-400">
                  <SettingsHeatmap
                    xLabel="Infill (%)"
                    yLabel="Speed (mm/s)"
                    xBuckets={activeBuckets(infillVsSpeed, 'x', infillBuckets)}
                    yBuckets={activeBuckets(infillVsSpeed, 'y', speedBuckets)}
                    cells={infillVsSpeed}
                  />
                </SectionCard>

                <SectionCard title="Nozzle Temp × Layer Height failure rate" icon={Thermometer} iconColor="text-pink-400">
                  <SettingsHeatmap
                    xLabel="Nozzle Temp (°C)"
                    yLabel="Layer (mm)"
                    xBuckets={activeBuckets(nozzleVsLayer, 'x', nozzleBuckets)}
                    yBuckets={activeBuckets(nozzleVsLayer, 'y', layerBuckets)}
                    cells={nozzleVsLayer}
                  />
                </SectionCard>
              </>
            )}
          </motion.div>
        )}

        {/* ── BY MATERIAL TAB ── */}
        {tab === 'By Material' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {materialStats.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No material data found.</p>
            ) : (
              <>
                <SectionCard title="Success Rate by Material" icon={Award} iconColor="text-green-400">
                  <ResponsiveContainer width="100%" height={materialStats.length * 44 + 20}>
                    <BarChart data={materialStats} layout="vertical" barSize={16} margin={{ left: 0, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <YAxis dataKey="material" type="category" width={64} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} formatter={v => [`${v}%`, 'Success']} />
                      <Bar dataKey="successRate" name="Success Rate" radius={[0, 4, 4, 0]}>
                        {materialStats.map((m, i) => (
                          <Cell key={i} fill={m.successRate >= 70 ? '#34d399' : m.successRate >= 40 ? '#fbbf24' : '#f87171'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Material Performance Table" icon={AlertTriangle} iconColor="text-red-400">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-700/50">
                          <th className="text-left pb-2 font-medium">Material</th>
                          <th className="text-center pb-2">Total</th>
                          <th className="text-center pb-2 text-green-400">✓ OK</th>
                          <th className="text-center pb-2 text-red-400">✗ Fail</th>
                          <th className="text-right pb-2">Fail %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {materialStats.map((m, i) => (
                          <tr key={i}>
                            <td className="py-2 text-slate-300 font-medium">{m.material}</td>
                            <td className="py-2 text-center text-slate-400">{m.total}</td>
                            <td className="py-2 text-center text-green-400 font-semibold">{m.success}</td>
                            <td className="py-2 text-center text-red-400 font-semibold">{m.failure}</td>
                            <td className={cn('py-2 text-right font-bold', m.failureRate >= 40 ? 'text-red-400' : m.failureRate >= 20 ? 'text-amber-400' : 'text-green-400')}>
                              {m.failureRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </>
            )}
          </motion.div>
        )}

        {/* ── BY PRINTER TAB ── */}
        {tab === 'By Printer' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {printerStats.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No printer data found.</p>
            ) : (
              <>
                <SectionCard title="Printer Reliability" icon={TrendingUp} iconColor="text-cyan-400">
                  <ResponsiveContainer width="100%" height={printerStats.length * 44 + 20}>
                    <BarChart data={printerStats} layout="vertical" barSize={16} margin={{ left: 0, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <YAxis dataKey="shortName" type="category" width={80} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} formatter={v => [`${v}%`, 'Success']} />
                      <Bar dataKey="successRate" name="Success Rate" radius={[0, 4, 4, 0]}>
                        {printerStats.map((p, i) => (
                          <Cell key={i} fill={p.successRate >= 70 ? '#22d3ee' : p.successRate >= 40 ? '#fbbf24' : '#f87171'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Printer Failure Table" icon={AlertTriangle} iconColor="text-red-400">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-700/50">
                          <th className="text-left pb-2 font-medium">Printer</th>
                          <th className="text-center pb-2">Total</th>
                          <th className="text-center pb-2 text-green-400">✓ OK</th>
                          <th className="text-center pb-2 text-red-400">✗ Fail</th>
                          <th className="text-right pb-2">Fail %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {printerStats.map((p, i) => (
                          <tr key={i}>
                            <td className="py-2 text-slate-300 font-medium truncate max-w-[120px]">{p.printer}</td>
                            <td className="py-2 text-center text-slate-400">{p.total}</td>
                            <td className="py-2 text-center text-green-400 font-semibold">{p.success}</td>
                            <td className="py-2 text-center text-red-400 font-semibold">{p.failure}</td>
                            <td className={cn('py-2 text-right font-bold', p.failureRate >= 40 ? 'text-red-400' : p.failureRate >= 20 ? 'text-amber-400' : 'text-green-400')}>
                              {p.failureRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </>
            )}
          </motion.div>
        )}

        {/* ── AMBIENT TAB ── */}
        {tab === 'Ambient' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {!entries.some(e => e.ambient_temp || e.ambient_humidity) ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
                <Wind className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-semibold">No ambient data logged</p>
                <p className="text-slate-500 text-xs mt-1">Add ambient temperature and humidity when logging prints to see how conditions affect failure rates.</p>
              </div>
            ) : (
              <>
                <SectionCard title="Ambient Temperature vs Failure Rate" icon={Thermometer} iconColor="text-orange-400">
                  <AmbientHeatmap
                    label="Room Temperature"
                    buckets={ambientTempBuckets.filter(b => b.total > 0)}
                    unit="°C"
                  />
                  <p className="text-xs text-slate-600 mt-3">Higher ambient temps can cause warping; too cold can cause layer adhesion issues.</p>
                </SectionCard>

                <SectionCard title="Humidity vs Failure Rate" icon={Droplets} iconColor="text-blue-400">
                  <AmbientHeatmap
                    label="Relative Humidity"
                    buckets={ambientHumidBuckets.filter(b => b.total > 0)}
                    unit="%"
                  />
                  <p className="text-xs text-slate-600 mt-3">Moisture-sensitive materials like Nylon and TPU are particularly affected by high humidity.</p>
                </SectionCard>
              </>
            )}
          </motion.div>
        )}
        {/* ── FILAMENT COST TAB ── */}
        {tab === 'Filament Cost' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <FilamentCostTab entries={entries} />
          </motion.div>
        )}

        {/* ── AI INSIGHTS TAB ── */}
        {tab === 'AI Insights' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <AIInsightsPanel entries={entries} />
          </motion.div>
        )}

        {/* ── PREDICT TAB ── */}
        {tab === 'Predict' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <PredictiveMaintenancePanel entries={entries} />
          </motion.div>
        )}

        {/* ── ADVISOR TAB ── */}
        {tab === 'Advisor' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <MaterialAdvisorPanel entries={entries} />
          </motion.div>
        )}

        {/* ── VISUAL QA TAB ── */}
        {tab === 'Visual QA' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <PrintQualityAnalyzer entries={entries} />
          </motion.div>
        )}

        {/* ── TRENDS TAB ── */}
        {tab === 'Trends' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <FailureTrendsPanel entries={entries} />
          </motion.div>
        )}
      </div>
    </div>
  );
}