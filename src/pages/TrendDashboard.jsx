import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { TrendingUp, AlertTriangle, Zap, Info, RefreshCw, Loader2, Printer, Layers, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, subDays } from 'date-fns';

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  critical: { color: '#ef4444', bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', icon: Zap },
  warning:  { color: '#f59e0b', bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', icon: AlertTriangle },
  info:     { color: '#22d3ee', bg: 'bg-cyan-500/15 border-cyan-500/30', text: 'text-cyan-400', icon: Info },
};

const DEFECT_COLORS = {
  stringing:      '#fb923c',
  bed_adhesion:   '#ef4444',
  warping:        '#a855f7',
  layer_shift:    '#22d3ee',
  under_extrusion:'#facc15',
  blobs:          '#34d399',
  general_failure:'#94a3b8',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'text-white', icon: Icon }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0">
          <Icon className={cn('w-4 h-4', color)} />
        </div>
      )}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={cn('text-xl font-bold', color)}>{value}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SeverityDot({ severity }) {
  const cfg = SEVERITY_CFG[severity] || SEVERITY_CFG.info;
  return <span className={cn('inline-block w-2 h-2 rounded-full')} style={{ backgroundColor: cfg.color }} />;
}

// Build a 30-day sparkline from alert failure rates grouped by date
function buildTimelineSeries(alerts) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    return format(d, 'MMM d');
  });

  // Map alerts to their creation date
  const byDay = {};
  alerts.forEach(a => {
    const key = a.created_date ? format(parseISO(a.created_date), 'MMM d') : null;
    if (!key) return;
    if (!byDay[key]) byDay[key] = { count: 0, totalRate: 0 };
    byDay[key].count++;
    byDay[key].totalRate += a.failure_rate_recent || 0;
  });

  return days.map(day => ({
    day,
    avg_failure_rate: byDay[day] ? Math.round(byDay[day].totalRate / byDay[day].count) : null,
    alert_count: byDay[day]?.count || 0,
  }));
}

// Aggregate per printer+material combos
function buildHeatmapData(alerts) {
  const map = {};
  alerts.forEach(a => {
    const key = `${a.printer_model || 'Unknown'}|||${a.material || 'Unknown'}`;
    if (!map[key]) map[key] = { printer: a.printer_model || 'Unknown', material: a.material || 'Unknown', defects: {}, maxRate: 0, alertCount: 0 };
    const d = a.defect_type || 'general_failure';
    map[key].defects[d] = (map[key].defects[d] || 0) + 1;
    map[key].maxRate = Math.max(map[key].maxRate, a.failure_rate_recent || 0);
    map[key].alertCount++;
  });
  return Object.values(map).sort((a, b) => b.maxRate - a.maxRate);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TrendDashboard() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['trend-alerts-all'],
    queryFn: () => base44.entities.TrendAlert.filter({}, '-created_date', 200),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['print-journal'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 200),
  });

  const activeAlerts = alerts.filter(a => !a.is_dismissed);

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount  = activeAlerts.filter(a => a.severity === 'warning').length;
  const avgFailRate   = activeAlerts.length
    ? Math.round(activeAlerts.reduce((s, a) => s + (a.failure_rate_recent || 0), 0) / activeAlerts.length)
    : 0;

  const timelineSeries = useMemo(() => buildTimelineSeries(activeAlerts), [activeAlerts]);
  const heatmapData    = useMemo(() => buildHeatmapData(activeAlerts), [activeAlerts]);

  // 30-day failure rate from journal
  const journalTimeline = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), 29 - i);
      return format(d, 'MMM d');
    });
    const byDay = {};
    journalEntries.forEach(e => {
      if (!e.print_date) return;
      const key = format(parseISO(e.print_date), 'MMM d');
      if (!byDay[key]) byDay[key] = { total: 0, failed: 0 };
      byDay[key].total++;
      if (e.outcome === 'failure' || e.outcome === 'partial') byDay[key].failed++;
    });
    return days.map(day => ({
      day,
      failure_rate: byDay[day] && byDay[day].total > 0
        ? Math.round((byDay[day].failed / byDay[day].total) * 100)
        : null,
    }));
  }, [journalEntries]);

  const runAnalysis = async () => {
    setRunning(true);
    await base44.functions.invoke('analyzeTrends', {});
    await qc.invalidateQueries(['trend-alerts-all']);
    setRunning(false);
  };

  const allDefectTypes = [...new Set(activeAlerts.map(a => a.defect_type).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Trend Dashboard</h1>
              <p className="text-xs text-slate-500">Failure patterns & proactive settings</p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={running}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-40"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Analyze
          </button>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">

            {/* Stat cards */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-3 gap-2">
              <StatCard label="Critical" value={criticalCount} color="text-red-400" icon={Zap} />
              <StatCard label="Warnings" value={warningCount} color="text-amber-400" icon={AlertTriangle} />
              <StatCard label="Avg Fail %" value={`${avgFailRate}%`} color="text-slate-300" icon={TrendingUp} />
            </motion.div>

            {/* Failure rate chart — journal data */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Journal Failure Rate — Last 30 Days
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={journalTimeline} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 9 }} interval={6} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="failure_rate"
                    name="Failure Rate"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#failGrad)"
                    connectNulls
                    dot={false}
                    activeDot={{ r: 4, fill: '#ef4444' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Alert trend — alerts over time */}
            {activeAlerts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Alert Activity — Last 30 Days
                </p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={timelineSeries} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 9 }} interval={6} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="alert_count" name="Alerts" radius={[3, 3, 0, 0]}>
                      {timelineSeries.map((entry, i) => (
                        <Cell key={i} fill={entry.alert_count > 0 ? '#f59e0b' : '#1e293b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Printer/Material Heatmap */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Printer × Material Heatmap</p>
                <p className="text-xs text-slate-600 mt-0.5">Sorted by worst recent failure rate</p>
              </div>

              {heatmapData.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-sm">
                  No alert data yet — tap Analyze to generate.
                </div>
              ) : (
                <div className="divide-y divide-slate-700/40">
                  {heatmapData.map((row, i) => {
                    const heat = Math.min(row.maxRate, 100) / 100;
                    const isExpanded = expandedRow === i;
                    return (
                      <div key={i}>
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : i)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors text-left"
                        >
                          {/* Heat bar on left edge */}
                          <div
                            className="w-1.5 self-stretch rounded-full shrink-0"
                            style={{ backgroundColor: `rgba(239,68,68,${0.2 + heat * 0.8})` }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="text-sm font-semibold text-white truncate">{row.printer}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Layers className="w-3 h-3 text-slate-600 shrink-0" />
                              <span className="text-xs text-slate-500">{row.material}</span>
                              <span className="text-xs text-slate-600">·</span>
                              <span className="text-xs text-slate-500">{row.alertCount} alert{row.alertCount > 1 ? 's' : ''}</span>
                            </div>
                            {/* Defect pills */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(row.defects).map(([defect, count]) => (
                                <span key={defect}
                                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    backgroundColor: (DEFECT_COLORS[defect] || '#94a3b8') + '25',
                                    color: DEFECT_COLORS[defect] || '#94a3b8',
                                    border: `1px solid ${DEFECT_COLORS[defect] || '#94a3b8'}40`
                                  }}
                                >
                                  {defect.replace(/_/g, ' ')} ×{count}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold" style={{ color: `rgba(239,68,68,${0.4 + heat * 0.6})` }}>
                              {row.maxRate}%
                            </p>
                            <p className="text-xs text-slate-600">fail rate</p>
                          </div>
                          <ChevronRight className={cn('w-3.5 h-3.5 text-slate-600 shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                        </button>

                        {/* Expanded: recommended actions from alerts */}
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="px-4 pb-3 space-y-2 bg-slate-900/40">
                            {activeAlerts
                              .filter(a => a.printer_model === row.printer && a.material === row.material)
                              .map((a, j) => {
                                const cfg = SEVERITY_CFG[a.severity] || SEVERITY_CFG.info;
                                const Icon = cfg.icon;
                                return (
                                  <div key={j} className={cn('rounded-lg border p-2.5', cfg.bg)}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.text)} />
                                      <span className={cn('text-xs font-semibold', cfg.text)}>{a.message}</span>
                                    </div>
                                    {a.recommended_action && (
                                      <p className="text-xs text-slate-400 pl-5">💡 {a.recommended_action}</p>
                                    )}
                                  </div>
                                );
                              })}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* All active alerts list */}
            {activeAlerts.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Active Alerts</p>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {activeAlerts.slice(0, 10).map((a, i) => {
                    const cfg = SEVERITY_CFG[a.severity] || SEVERITY_CFG.info;
                    const Icon = cfg.icon;
                    return (
                      <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                        <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.text)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{a.message}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {a.printer_model && <span className="text-xs text-slate-500">{a.printer_model}</span>}
                            {a.material && <span className="text-xs text-slate-500">{a.material}</span>}
                            {a.failure_rate_recent != null && (
                              <span className="text-xs text-red-400 font-semibold">{a.failure_rate_recent}% fail</span>
                            )}
                            {a.failure_rate_prior != null && (
                              <span className="text-xs text-slate-600">was {a.failure_rate_prior}%</span>
                            )}
                          </div>
                          {a.recommended_action && (
                            <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                              <span>💡</span>{a.recommended_action}
                            </p>
                          )}
                        </div>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 border', cfg.bg, cfg.text)}>
                          {a.severity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeAlerts.length === 0 && !isLoading && (
              <div className="text-center py-12 text-slate-600">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No active trend alerts.</p>
                <p className="text-xs mt-1">Tap Analyze to run a fresh analysis.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}