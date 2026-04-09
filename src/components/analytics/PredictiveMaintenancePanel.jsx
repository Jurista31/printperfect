import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BrainCircuit, Loader2, RefreshCw, AlertTriangle, ShieldCheck, Wrench, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

const PRIORITY_STYLES = {
  critical: { border: 'border-red-500/40', bg: 'bg-red-500/10', badge: 'bg-red-500/20 text-red-300', icon: 'text-red-400', label: 'Critical' },
  high:     { border: 'border-orange-500/40', bg: 'bg-orange-500/10', badge: 'bg-orange-500/20 text-orange-300', icon: 'text-orange-400', label: 'High' },
  medium:   { border: 'border-amber-500/40', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-300', icon: 'text-amber-400', label: 'Medium' },
  low:      { border: 'border-slate-600/40', bg: 'bg-slate-700/30', badge: 'bg-slate-700 text-slate-400', icon: 'text-slate-400', label: 'Low' },
};

function buildContextForAI(entries, logs) {
  // Aggregate per-printer stats
  const printers = {};
  entries.forEach(e => {
    const p = e.printer_model || 'Unknown';
    if (!printers[p]) printers[p] = { total: 0, failures: 0, partials: 0, recentFailures: 0, totalMinutes: 0, materialCounts: {}, recentEntries: [] };
    printers[p].total++;
    if (e.outcome === 'failure') printers[p].failures++;
    if (e.outcome === 'partial') printers[p].partials++;
    if (e.duration_minutes) printers[p].totalMinutes += e.duration_minutes;
    if (e.filament_material) {
      printers[p].materialCounts[e.filament_material] = (printers[p].materialCounts[e.filament_material] || 0) + 1;
    }
    if (e.print_date) {
      const daysAgo = differenceInDays(new Date(), parseISO(e.print_date));
      if (daysAgo <= 30) printers[p].recentFailures += (e.outcome === 'failure' ? 1 : 0);
    }
    printers[p].recentEntries.push(e);
  });

  // Recent trend: failure rate in last 30 days vs overall
  const printerSummaries = Object.entries(printers).map(([name, data]) => {
    const recentEntries = data.recentEntries.filter(e => {
      if (!e.print_date) return false;
      return differenceInDays(new Date(), parseISO(e.print_date)) <= 30;
    });
    const recentTotal = recentEntries.length;
    const recentFails = recentEntries.filter(e => e.outcome === 'failure').length;
    const overallRate = data.total ? Math.round((data.failures / data.total) * 100) : 0;
    const recentRate = recentTotal ? Math.round((recentFails / recentTotal) * 100) : 0;
    const topMaterial = Object.entries(data.materialCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    return {
      name,
      totalPrints: data.total,
      totalHours: Math.round(data.totalMinutes / 60),
      overallFailureRate: overallRate,
      recentFailureRate: recentRate,
      recentTrend: recentRate > overallRate + 10 ? 'worsening' : recentRate < overallRate - 10 ? 'improving' : 'stable',
      topMaterial,
    };
  });

  // Maintenance log summary per printer
  const maintenanceSummary = {};
  logs.forEach(l => {
    const p = l.printer_name || 'Unknown';
    if (!maintenanceSummary[p]) maintenanceSummary[p] = [];
    maintenanceSummary[p].push({
      type: l.event_type,
      date: l.performed_at,
      daysAgo: l.performed_at ? differenceInDays(new Date(), parseISO(l.performed_at)) : null,
      result: l.result,
    });
  });

  return { printerSummaries, maintenanceSummary, totalEntries: entries.length, totalLogs: logs.length };
}

export default function PredictiveMaintenancePanel({ entries }) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const { data: logs = [] } = useQuery({
    queryKey: ['maintenance-logs-predict'],
    queryFn: () => base44.entities.MaintenanceLog.list('-performed_at', 200),
  });

  const context = useMemo(() => buildContextForAI(entries, logs), [entries, logs]);
  const hasSufficientData = entries.length >= 5;

  async function analyze() {
    setLoading(true);
    setPredictions(null);

    const { printerSummaries, maintenanceSummary } = context;

    const prompt = `You are an expert 3D printer maintenance engineer and failure analyst. Analyze the following data to predict potential printer failures and suggest proactive maintenance actions.

PRINTER STATISTICS:
${printerSummaries.map(p => `
Printer: ${p.name}
- Total prints: ${p.totalPrints} (${p.totalHours}h total)
- Overall failure rate: ${p.overallFailureRate}%
- Recent 30-day failure rate: ${p.recentFailureRate}%
- Trend: ${p.recentTrend}
- Primary material: ${p.topMaterial}
`).join('')}

MAINTENANCE LOG HISTORY (last service per printer):
${Object.entries(maintenanceSummary).map(([printer, logs]) => {
  const byType = {};
  logs.forEach(l => { if (!byType[l.type] || l.daysAgo < byType[l.type].daysAgo) byType[l.type] = l; });
  return `${printer}: ${Object.entries(byType).map(([t, l]) => `${t} (${l.daysAgo}d ago, result: ${l.result})`).join(', ')}`;
}).join('\n') || 'No maintenance logged'}

Based on this data, identify:
1. Printers showing early signs of mechanical/hardware degradation
2. Maintenance tasks that are overdue or likely to cause future failures
3. Pattern-based risks (e.g. worsening failure rate suggests clogged nozzle or worn belts)
4. Specific proactive actions with urgency levels

Respond in JSON only.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_health: { type: 'string', enum: ['good', 'fair', 'poor', 'critical'] },
          health_summary: { type: 'string' },
          predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                printer: { type: 'string' },
                risk_title: { type: 'string' },
                risk_detail: { type: 'string' },
                priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                recommended_action: { type: 'string' },
                timeframe: { type: 'string' },
              },
            },
          },
        },
      },
    });

    setPredictions(result);
    setLoading(false);
  }

  const healthColor = {
    good: 'text-green-400',
    fair: 'text-amber-400',
    poor: 'text-orange-400',
    critical: 'text-red-400',
  };

  const healthBg = {
    good: 'from-green-600/20 to-teal-600/20 border-green-500/30',
    fair: 'from-amber-600/20 to-yellow-600/20 border-amber-500/30',
    poor: 'from-orange-600/20 to-red-600/20 border-orange-500/30',
    critical: 'from-red-600/20 to-rose-600/20 border-red-500/40',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Predictive Failure Analysis</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              AI cross-references {entries.length} journal entries and {logs.length} maintenance logs to detect early failure signals.
            </p>
          </div>
        </div>

        {!hasSufficientData ? (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Log at least 5 prints to enable predictive analysis.
          </p>
        ) : (
          <Button
            onClick={analyze}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm h-9"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing patterns…</>
              : predictions
              ? <><RefreshCw className="w-4 h-4 mr-2" /> Re-analyze</>
              : <><BrainCircuit className="w-4 h-4 mr-2" /> Run Predictive Analysis</>
            }
          </Button>
        )}
      </div>

      {/* Quick stats preview */}
      {hasSufficientData && !predictions && !loading && (
        <div className="grid grid-cols-3 gap-2">
          {context.printerSummaries.slice(0, 3).map((p, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 text-center">
              <p className={cn('text-lg font-bold', p.recentTrend === 'worsening' ? 'text-red-400' : p.recentTrend === 'improving' ? 'text-green-400' : 'text-amber-400')}>
                {p.recentFailureRate}%
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5 truncate">{p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name}</p>
              <p className="text-[9px] mt-0.5 font-medium capitalize" style={{ color: p.recentTrend === 'worsening' ? '#f87171' : p.recentTrend === 'improving' ? '#34d399' : '#fbbf24' }}>
                {p.recentTrend}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
              <div className="h-2 bg-slate-700/60 rounded w-full mb-1" />
              <div className="h-2 bg-slate-700/60 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {predictions && !loading && (
        <div className="space-y-3">
          {/* Overall health */}
          <div className={cn('rounded-xl border p-4 bg-gradient-to-br', healthBg[predictions.overall_health] || healthBg.fair)}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn('w-4 h-4', healthColor[predictions.overall_health])} />
                <p className="text-xs font-semibold text-white">Fleet Health</p>
              </div>
              <span className={cn('text-xs font-bold capitalize', healthColor[predictions.overall_health])}>
                {predictions.overall_health}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{predictions.health_summary}</p>
          </div>

          {/* Prediction cards */}
          {(predictions.predictions || []).length === 0 ? (
            <div className="text-center py-6 bg-slate-800/40 border border-slate-700/30 rounded-xl">
              <ShieldCheck className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-white font-semibold">No critical risks detected</p>
              <p className="text-xs text-slate-500 mt-1">Keep logging prints to improve predictions.</p>
            </div>
          ) : (
            (predictions.predictions || []).map((pred, i) => {
              const styles = PRIORITY_STYLES[pred.priority] || PRIORITY_STYLES.medium;
              const isOpen = expanded[i];
              return (
                <button
                  key={i}
                  onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                  className={cn('w-full text-left rounded-xl border p-4 transition-colors hover:brightness-110', styles.bg, styles.border)}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', styles.icon)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white leading-tight">{pred.risk_title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{pred.printer}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', styles.badge)}>
                            {styles.label}
                          </span>
                          {isOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-3 space-y-2.5">
                          <p className="text-xs text-slate-300 leading-relaxed">{pred.risk_detail}</p>
                          <div className="bg-slate-800/60 rounded-lg p-2.5 flex items-start gap-2">
                            <Wrench className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-semibold text-cyan-400 mb-0.5">Recommended Action</p>
                              <p className="text-xs text-slate-300">{pred.recommended_action}</p>
                            </div>
                          </div>
                          {pred.timeframe && (
                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> Timeframe: {pred.timeframe}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}

          <p className="text-[10px] text-slate-600 text-center pt-1">
            Based on {entries.length} journal entries · {logs.length} maintenance logs
          </p>
        </div>
      )}
    </div>
  );
}