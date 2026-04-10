import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO, startOfMonth } from 'date-fns';
import { LayoutDashboard, Loader2 } from 'lucide-react';

import DashboardStatCards from '@/components/dashboard/DashboardStatCards';
import MonthlyCostChart from '@/components/dashboard/MonthlyCostChart';
import PrintCostCalculator, { estimateCost } from '@/components/PrintCostCalculator';
import OutcomeOverTime from '@/components/dashboard/OutcomeOverTime';
import OutcomePie from '@/components/dashboard/OutcomePie';
import MaterialBreakdown from '@/components/dashboard/MaterialBreakdown';
import PerformanceMetrics from '@/components/dashboard/PerformanceMetrics';
import SuccessRateTrend from '@/components/dashboard/SuccessRateTrend';
import HighRiskAlerts from '@/components/dashboard/HighRiskAlerts';
import MaintenanceAlerts from '@/components/dashboard/MaintenanceAlerts';
import PrinterHoursTracker from '@/components/PrinterHoursTracker';

export default function Dashboard() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-dashboard'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 500),
  });

  // --- Summary stats ---
  const stats = useMemo(() => {
    const total = entries.length;
    if (!total) return { total: 0, successRate: null, failureRate: null, avgDuration: null };
    const successes = entries.filter(e => e.outcome === 'success').length;
    const failures = entries.filter(e => e.outcome === 'failure').length;
    const withDuration = entries.filter(e => e.duration_minutes);
    const avgDuration = withDuration.length
      ? Math.round(withDuration.reduce((s, e) => s + e.duration_minutes, 0) / withDuration.length)
      : null;
    return {
      total,
      successRate: Math.round((successes / total) * 100),
      failureRate: Math.round((failures / total) * 100),
      avgDuration,
    };
  }, [entries]);

  // --- Outcomes over time (by month) ---
  const outcomeOverTime = useMemo(() => {
    const byMonth = {};
    entries.forEach(e => {
      if (!e.print_date) return;
      const month = format(startOfMonth(parseISO(e.print_date)), 'MMM yy');
      if (!byMonth[month]) byMonth[month] = { label: month, success: 0, partial: 0, failure: 0 };
      byMonth[month][e.outcome] = (byMonth[month][e.outcome] || 0) + 1;
    });
    return Object.values(byMonth).slice(-10);
  }, [entries]);

  // --- Overall outcome pie ---
  const outcomePie = useMemo(() => {
    const counts = { success: 0, partial: 0, failure: 0 };
    entries.forEach(e => { if (e.outcome) counts[e.outcome]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [entries]);

  // --- Monthly success rate trend ---
  const successRateTrend = useMemo(() => {
    return outcomeOverTime.map(m => {
      const total = m.success + m.partial + m.failure;
      return {
        label: m.label,
        successRate: total ? Math.round((m.success / total) * 100) : 0,
      };
    });
  }, [outcomeOverTime]);

  // --- Monthly cost breakdown ---
  const monthlyCosts = useMemo(() => {
    const byMonth = {};
    entries.forEach(e => {
      if (!e.print_date || !e.duration_minutes) return;
      const label = format(startOfMonth(parseISO(e.print_date)), 'MMM yy');
      if (!byMonth[label]) byMonth[label] = { label, materialCost: 0, electricityCost: 0 };
      const c = estimateCost(e);
      byMonth[label].materialCost  += c.materialCost  || 0;
      byMonth[label].electricityCost += c.elecCost || 0;
    });
    return Object.values(byMonth)
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(m => ({ ...m, materialCost: parseFloat(m.materialCost.toFixed(2)), electricityCost: parseFloat(m.electricityCost.toFixed(2)) }))
      .slice(-10);
  }, [entries]);

  // --- Material breakdown ---
  const materialBreakdown = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      const mat = e.filament_material || 'Unknown';
      counts[mat] = (counts[mat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([material, count]) => ({ material, count }));
  }, [entries]);

  // --- Scatter: nozzle temp vs speed, colored by outcome ---
  const perfScatter = useMemo(() => {
    return entries
      .filter(e => e.nozzle_temp && e.print_speed)
      .map(e => ({ x: e.nozzle_temp, y: e.print_speed, outcome: e.outcome || 'success' }));
  }, [entries]);

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
        <LayoutDashboard className="w-16 h-16 text-slate-700" />
        <h2 className="text-xl font-bold text-white">No journal data yet</h2>
        <p className="text-slate-500 text-sm">Log some prints in your Print Journal to start seeing your dashboard here.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Print Dashboard</h1>
              <p className="text-xs text-slate-500">Journal-based insights · {entries.length} prints logged</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <DashboardStatCards stats={stats} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <HighRiskAlerts entries={entries} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MaintenanceAlerts entries={entries} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <PrinterHoursTracker />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <OutcomeOverTime data={outcomeOverTime} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <SuccessRateTrend data={successRateTrend} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <OutcomePie data={outcomePie} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <MaterialBreakdown data={materialBreakdown} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <PerformanceMetrics data={perfScatter} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <MonthlyCostChart data={monthlyCosts} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <PrintCostCalculator entries={entries} />
        </motion.div>
      </div>
    </div>
  );
}