import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { format, parseISO, startOfWeek } from 'date-fns';
import { TrendingUp, Printer, AlertTriangle, CheckCircle, BarChart2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const QUALITY_COLORS = {
  excellent: '#22d3ee',
  good: '#34d399',
  fair: '#fbbf24',
  poor: '#f87171',
};

const DEFECT_COLORS = ['#22d3ee', '#818cf8', '#fb923c', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#f87171'];

const iconColorMap = {
  cyan: 'text-cyan-400',
  green: 'text-green-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
};
const valueColorMap = {
  cyan: 'text-cyan-300',
  green: 'text-green-300',
  amber: 'text-amber-300',
  red: 'text-red-300',
};
const cardColorMap = {
  cyan: 'bg-cyan-500/10 border-cyan-500/20',
  green: 'bg-green-500/10 border-green-500/20',
  amber: 'bg-amber-500/10 border-amber-500/20',
  red: 'bg-red-500/10 border-red-500/20',
};

function StatCard({ icon: Icon, label, value, sub, color = 'cyan' }) {
  return (
    <div className={cn("rounded-xl border p-4", cardColorMap[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", iconColorMap[color])} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", valueColorMap[color])}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function History() {
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['analyses-history'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 200),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['printer-profiles-history'],
    queryFn: () => base44.entities.PrinterProfile.list('-created_date', 50),
  });

  // --- Derived data ---

  // 1. Quality timeline: group by week, count quality levels
  const qualityTimeline = useMemo(() => {
    const byWeek = {};
    analyses.forEach(a => {
      if (!a.created_date || !a.overall_quality) return;
      const week = format(startOfWeek(parseISO(a.created_date)), 'MMM d');
      if (!byWeek[week]) byWeek[week] = { week, excellent: 0, good: 0, fair: 0, poor: 0, total: 0 };
      byWeek[week][a.overall_quality]++;
      byWeek[week].total++;
    });
    return Object.values(byWeek).slice(-10);
  }, [analyses]);

  // 2. Defect frequency across all analyses
  const defectFrequency = useMemo(() => {
    const counts = {};
    analyses.forEach(a => {
      (a.defects || []).forEach(d => {
        const name = d.name?.length > 22 ? d.name.slice(0, 22) + '…' : d.name;
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [analyses]);

  // 3. Quality distribution for pie chart
  const qualityDist = useMemo(() => {
    const counts = { excellent: 0, good: 0, fair: 0, poor: 0 };
    analyses.forEach(a => { if (a.overall_quality) counts[a.overall_quality]++; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [analyses]);

  // 4. Printer profile issues
  const printerIssues = useMemo(() => {
    if (!profiles.length) return [];
    // We can't directly join, but SharedAnalysis.print_profile has printer_model
    // Use analyses defect count as proxy — bucket by what's in printer profiles
    // Show each profile with total defects in analyses (best-effort match)
    return profiles.map(p => {
      // Count analyses that had defects (we can't perfectly join, so show analysis count stats per profile)
      const defectTotal = analyses.reduce((sum, a) => sum + (a.defects?.length || 0), 0);
      const avgPerAnalysis = analyses.length ? (defectTotal / analyses.length).toFixed(1) : 0;
      return {
        name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name,
        printer: p.printer_model,
        material: p.default_material || '—',
        nozzle: p.nozzle_size || '—',
        is_active: p.is_active,
      };
    });
  }, [profiles, analyses]);

  // Defects per analysis over time (trend line)
  const defectTrend = useMemo(() => {
    return analyses
      .slice()
      .reverse()
      .slice(-20)
      .map((a, i) => ({
        idx: i + 1,
        defects: a.defects?.length || 0,
        quality: { excellent: 4, good: 3, fair: 2, poor: 1 }[a.overall_quality] || 0,
      }));
  }, [analyses]);

  // Summary stats
  const totalAnalyses = analyses.length;
  const successRate = totalAnalyses
    ? Math.round(analyses.filter(a => ['good', 'excellent'].includes(a.overall_quality)).length / totalAnalyses * 100)
    : 0;
  const totalDefects = analyses.reduce((s, a) => s + (a.defects?.length || 0), 0);
  const avgDefects = totalAnalyses ? (totalDefects / totalAnalyses).toFixed(1) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (totalAnalyses === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <BarChart2 className="w-16 h-16 text-slate-700" />
        <h2 className="text-xl font-bold text-white">No analysis data yet</h2>
        <p className="text-slate-500 text-sm">Run your first print analysis to start seeing trends here.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Print History</h1>
              <p className="text-xs text-slate-500">Your analysis trends & insights</p>
            </div>
          </div>
        </motion.div>

        {/* Stat cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={BarChart2} label="Total Analyses" value={totalAnalyses} color="cyan" />
          <StatCard icon={CheckCircle} label="Success Rate" value={`${successRate}%`} sub="good or excellent" color="green" />
          <StatCard icon={AlertTriangle} label="Total Defects Found" value={totalDefects} color="amber" />
          <StatCard icon={TrendingUp} label="Avg Defects/Print" value={avgDefects} color={avgDefects > 3 ? 'red' : 'cyan'} />
        </motion.div>

        {/* Quality over time */}
        {qualityTimeline.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
              Quality Timeline (by week)
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={qualityTimeline} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="excellent" stackId="a" fill={QUALITY_COLORS.excellent} radius={[0,0,0,0]} name="Excellent" />
                <Bar dataKey="good" stackId="a" fill={QUALITY_COLORS.good} name="Good" />
                <Bar dataKey="fair" stackId="a" fill={QUALITY_COLORS.fair} name="Fair" />
                <Bar dataKey="poor" stackId="a" fill={QUALITY_COLORS.poor} radius={[3,3,0,0]} name="Poor" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3">
              {Object.entries(QUALITY_COLORS).map(([q, c]) => (
                <span key={q} className="flex items-center gap-1 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Defect frequency */}
        {defectFrequency.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Most Frequent Defects
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={defectFrequency} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Occurrences" radius={[0, 4, 4, 0]}>
                  {defectFrequency.map((_, i) => (
                    <Cell key={i} fill={DEFECT_COLORS[i % DEFECT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Defect count trend */}
        {defectTrend.length > 2 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              Defects per Print (last 20)
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={defectTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="idx" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Print #', position: 'insideBottomRight', offset: -4, fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="defects" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} name="Defects" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Quality distribution pie */}
        {qualityDist.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
              Overall Quality Distribution
            </h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={qualityDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {qualityDist.map((entry, i) => (
                      <Cell key={i} fill={QUALITY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {qualityDist.map(({ name, value }) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: QUALITY_COLORS[name] }} />
                      {name}
                    </span>
                    <span className="text-xs font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Printer profiles summary */}
        {printerIssues.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              Printer Profiles Overview
            </h2>
            <div className="space-y-3">
              {printerIssues.map((p, i) => (
                <div key={i} className={cn(
                  "rounded-lg border p-3 flex items-start justify-between gap-3",
                  p.is_active ? "bg-cyan-500/5 border-cyan-500/30" : "bg-slate-700/30 border-slate-700/50"
                )}>
                  <div className="flex items-start gap-2.5">
                    <Printer className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        {p.is_active && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs px-1.5 py-0">Active</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{p.printer}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">{p.material}</Badge>
                    <span className="text-xs text-slate-600">Nozzle {p.nozzle}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3">
              Total analyses across all sessions: <span className="text-slate-400 font-medium">{totalAnalyses}</span>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}