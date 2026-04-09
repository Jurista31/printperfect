import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Loader2, RefreshCw, AlertTriangle, ShieldCheck, Wrench, ChevronDown, ChevronUp, BarChart2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, subMonths } from 'date-fns';

const PRIORITY_STYLE = {
  critical: { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400',    label: 'Critical' },
  high:     { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400', label: 'High' },
  medium:   { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-400',  label: 'Medium' },
  low:      { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-400',  label: 'Low' },
};

function buildContext(entries) {
  const failures = entries.filter(e => e.outcome === 'failure');
  const total = entries.length;
  const failRate = total ? Math.round((failures.length / total) * 100) : 0;

  // By printer
  const byPrinter = {};
  entries.forEach(e => {
    const k = e.printer_model || 'Unknown';
    if (!byPrinter[k]) byPrinter[k] = { total: 0, failures: 0 };
    byPrinter[k].total++;
    if (e.outcome === 'failure') byPrinter[k].failures++;
  });

  // By material
  const byMaterial = {};
  entries.forEach(e => {
    const k = e.filament_material || 'Unknown';
    if (!byMaterial[k]) byMaterial[k] = { total: 0, failures: 0 };
    byMaterial[k].total++;
    if (e.outcome === 'failure') byMaterial[k].failures++;
  });

  // Monthly failure rate (last 6 months)
  const monthly = {};
  const sixMonthsAgo = subMonths(new Date(), 6);
  entries.forEach(e => {
    if (!e.print_date) return;
    const d = parseISO(e.print_date);
    if (d < sixMonthsAgo) return;
    const m = format(d, 'MMM yy');
    if (!monthly[m]) monthly[m] = { total: 0, failures: 0 };
    monthly[m].total++;
    if (e.outcome === 'failure') monthly[m].failures++;
  });

  // Common failure settings patterns
  const failureNotes = failures.map(e => e.notes).filter(Boolean).slice(0, 20);
  const failureMaterials = [...new Set(failures.map(e => e.filament_material).filter(Boolean))];
  const highFailPrinters = Object.entries(byPrinter)
    .filter(([, v]) => v.total >= 3 && (v.failures / v.total) >= 0.3)
    .map(([k, v]) => ({ printer: k, failRate: Math.round((v.failures / v.total) * 100), count: v.total }));
  const highFailMaterials = Object.entries(byMaterial)
    .filter(([, v]) => v.total >= 3 && (v.failures / v.total) >= 0.3)
    .map(([k, v]) => ({ material: k, failRate: Math.round((v.failures / v.total) * 100), count: v.total }));

  const monthlyTrend = Object.entries(monthly).map(([m, v]) => ({
    month: m,
    failRate: v.total ? Math.round((v.failures / v.total) * 100) : 0,
    total: v.total,
    failures: v.failures,
  }));

  return {
    total, failRate,
    totalFailures: failures.length,
    highFailPrinters,
    highFailMaterials,
    monthlyTrend,
    failureMaterials,
    failureNotes,
    byPrinter,
    byMaterial,
  };
}

export default function FailureTrendsPanel({ entries }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const context = useMemo(() => buildContext(entries), [entries]);

  async function runAnalysis() {
    setLoading(true);
    setReport(null);

    const prompt = `You are an expert 3D printing process engineer. Analyze the following historical print failure data across all printers and materials. Identify recurring failure trends, predict likely future failures, and provide actionable preventative maintenance and process improvement recommendations.

=== HISTORICAL DATA SUMMARY ===
Total prints: ${context.total}
Total failures: ${context.totalFailures}
Overall failure rate: ${context.failRate}%

High failure rate printers (≥30% fail, ≥3 prints):
${context.highFailPrinters.length ? context.highFailPrinters.map(p => `  - ${p.printer}: ${p.failRate}% fail rate (${p.count} prints)`).join('\n') : '  None identified'}

High failure rate materials (≥30% fail, ≥3 prints):
${context.highFailMaterials.length ? context.highFailMaterials.map(m => `  - ${m.material}: ${m.failRate}% fail rate (${m.count} prints)`).join('\n') : '  None identified'}

All printers breakdown:
${Object.entries(context.byPrinter).map(([k, v]) => `  - ${k}: ${v.failures}/${v.total} failures (${Math.round(v.failures/v.total*100)}%)`).join('\n')}

All materials breakdown:
${Object.entries(context.byMaterial).map(([k, v]) => `  - ${k}: ${v.failures}/${v.total} failures (${Math.round(v.failures/v.total*100)}%)`).join('\n')}

Monthly failure trend (recent 6 months):
${context.monthlyTrend.map(m => `  - ${m.month}: ${m.failRate}% fail rate (${m.failures}/${m.total})`).join('\n') || '  No recent data'}

Sample failure notes from user:
${context.failureNotes.slice(0, 10).map((n, i) => `  ${i+1}. "${n}"`).join('\n') || '  None'}

=== ANALYSIS REQUESTED ===
1. Identify 3-5 key recurring failure trends (patterns across printers, materials, or time)
2. Predict 2-3 likely future failure scenarios if current trends continue
3. Provide 4-6 specific, prioritized actionable recommendations (maintenance, process, or settings changes)
4. Give an overall fleet health score (0-100)
5. A concise executive summary (2-3 sentences)

Return JSON only.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          fleet_health_score: { type: 'number' },
          executive_summary: { type: 'string' },
          trends: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                affected: { type: 'string' },
                severity: { type: 'string' },
              },
            },
          },
          predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scenario: { type: 'string' },
                likelihood: { type: 'string' },
                impact: { type: 'string' },
                timeframe: { type: 'string' },
              },
            },
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                detail: { type: 'string' },
                priority: { type: 'string' },
                category: { type: 'string' },
              },
            },
          },
        },
      },
    });

    setReport(result);
    setLoading(false);
  }

  const healthColor = report
    ? report.fleet_health_score >= 70 ? 'text-green-400 border-green-500/40 bg-green-500/10'
    : report.fleet_health_score >= 45 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
    : 'text-red-400 border-red-500/40 bg-red-500/10'
    : '';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Failure Trend Intelligence</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deep analysis of {context.total} prints · {context.totalFailures} failures · {context.failRate}% overall fail rate across all printers and materials.
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Printers', value: Object.keys(context.byPrinter).length, color: 'text-indigo-400' },
            { label: 'Materials', value: Object.keys(context.byMaterial).length, color: 'text-violet-400' },
            { label: 'High Risk', value: context.highFailPrinters.length + context.highFailMaterials.length, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/60 rounded-lg p-2 text-center">
              <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading || context.total < 3}
          className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing trends…</> :
           report ? <><RefreshCw className="w-3.5 h-3.5" /> Re-analyze</> :
           <><BarChart2 className="w-3.5 h-3.5" /> Run Trend Analysis</>}
        </button>
        {context.total < 3 && (
          <p className="text-[10px] text-slate-600 text-center mt-1.5">Need at least 3 prints to run analysis.</p>
        )}
      </div>

      {/* Results */}
      {report && (
        <>
          {/* Fleet health + summary */}
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 flex items-start gap-4">
            <div className={cn('w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center flex-shrink-0', healthColor)}>
              <span className="text-xl font-bold leading-none">{report.fleet_health_score}</span>
              <span className="text-[9px] font-semibold">/ 100</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-1">Fleet Health Score</p>
              <p className="text-xs text-slate-400 leading-relaxed">{report.executive_summary}</p>
            </div>
          </div>

          {/* Recurring trends */}
          {report.trends?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Recurring Failure Trends
              </p>
              {report.trends.map((trend, i) => {
                const sev = PRIORITY_STYLE[trend.severity] || PRIORITY_STYLE.medium;
                const isOpen = expanded[`trend-${i}`];
                return (
                  <button
                    key={i}
                    onClick={() => setExpanded(p => ({ ...p, [`trend-${i}`]: !p[`trend-${i}`] }))}
                    className={cn('w-full text-left rounded-xl border p-3 transition-colors', sev.bg, sev.border)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', sev.dot)} />
                      <p className={cn('text-xs font-semibold flex-1', sev.text)}>{trend.title}</p>
                      <span className={cn('text-[9px] font-bold uppercase flex-shrink-0', sev.text)}>{trend.severity}</span>
                      {isOpen ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                    </div>
                    {isOpen && (
                      <div className="mt-2 space-y-1 pl-4">
                        <p className="text-xs text-slate-300 leading-relaxed">{trend.description}</p>
                        {trend.affected && (
                          <p className="text-[10px] text-slate-500">Affects: <span className="text-slate-400">{trend.affected}</span></p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Predictions */}
          {report.predictions?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Predicted Future Failures
              </p>
              {report.predictions.map((pred, i) => {
                const isOpen = expanded[`pred-${i}`];
                const lColor = pred.likelihood === 'high' ? 'text-red-400' : pred.likelihood === 'medium' ? 'text-amber-400' : 'text-green-400';
                return (
                  <button
                    key={i}
                    onClick={() => setExpanded(p => ({ ...p, [`pred-${i}`]: !p[`pred-${i}`] }))}
                    className="w-full text-left rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-indigo-300 flex-1">{pred.scenario}</p>
                      <span className={cn('text-[9px] font-bold capitalize flex-shrink-0', lColor)}>{pred.likelihood} likelihood</span>
                      {isOpen ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                    </div>
                    {isOpen && (
                      <div className="mt-2 pl-1 space-y-1">
                        <p className="text-xs text-slate-300 leading-relaxed">{pred.impact}</p>
                        {pred.timeframe && <p className="text-[10px] text-slate-500">Timeframe: <span className="text-slate-400">{pred.timeframe}</span></p>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <Wrench className="w-3 h-3" /> Actionable Recommendations
              </p>
              {report.recommendations.map((rec, i) => {
                const pri = PRIORITY_STYLE[rec.priority] || PRIORITY_STYLE.medium;
                return (
                  <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 flex items-start gap-3">
                    <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold', pri.bg, pri.text)}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-white">{rec.title}</p>
                        {rec.category && (
                          <span className="text-[9px] text-slate-500 bg-slate-700/50 rounded px-1.5 py-0.5">{rec.category}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rec.detail}</p>
                    </div>
                    <span className={cn('text-[9px] font-bold uppercase flex-shrink-0', pri.text)}>{rec.priority}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            <Lightbulb className="w-3 h-3 text-slate-600" />
            <p className="text-[10px] text-slate-600">Analysis uses Claude Sonnet for deeper cross-pattern reasoning.</p>
          </div>
        </>
      )}
    </div>
  );
}