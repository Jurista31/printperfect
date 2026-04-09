import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, RefreshCw, TrendingUp, Thermometer, Zap, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = {
  temperature: Thermometer,
  speed: Zap,
  layer: Layers,
  general: TrendingUp,
};

const CATEGORY_COLORS = {
  temperature: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  speed: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  layer: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
  general: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
};

function buildSummary(entries) {
  // Separate failed and successful prints that have settings data
  const failed = entries.filter(e => e.outcome === 'failure' && (e.nozzle_temp || e.print_speed || e.layer_height || e.bed_temp));
  const success = entries.filter(e => e.outcome === 'success' && (e.nozzle_temp || e.print_speed || e.layer_height || e.bed_temp));

  const avg = (arr, key) => {
    const vals = arr.map(e => e[key]).filter(v => v != null && !isNaN(v));
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
  };

  const materialBreakdown = (arr) => {
    const counts = {};
    arr.forEach(e => { if (e.filament_material) counts[e.filament_material] = (counts[e.filament_material] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([mat, cnt]) => `${mat}(${cnt})`).join(', ');
  };

  return {
    failedCount: failed.length,
    successCount: success.length,
    failed: {
      avgNozzleTemp: avg(failed, 'nozzle_temp'),
      avgBedTemp: avg(failed, 'bed_temp'),
      avgSpeed: avg(failed, 'print_speed'),
      avgLayer: avg(failed, 'layer_height'),
      avgInfill: avg(failed, 'infill_percent'),
      topMaterials: materialBreakdown(failed),
    },
    success: {
      avgNozzleTemp: avg(success, 'nozzle_temp'),
      avgBedTemp: avg(success, 'bed_temp'),
      avgSpeed: avg(success, 'print_speed'),
      avgLayer: avg(success, 'layer_height'),
      avgInfill: avg(success, 'infill_percent'),
      topMaterials: materialBreakdown(success),
    },
  };
}

export default function AIInsightsPanel({ entries }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const summary = useMemo(() => buildSummary(entries), [entries]);

  const hasSufficientData = summary.failedCount >= 2 && summary.successCount >= 2;

  async function generateInsights() {
    setLoading(true);
    setInsights(null);
    const s = summary;

    const prompt = `You are an expert FDM 3D printing analyst. Analyze the following statistics from a user's print history and identify specific, actionable setting tweaks to reduce failures.

FAILED PRINTS (${s.failedCount} total):
- Avg nozzle temp: ${s.failed.avgNozzleTemp ?? 'N/A'}°C
- Avg bed temp: ${s.failed.avgBedTemp ?? 'N/A'}°C  
- Avg print speed: ${s.failed.avgSpeed ?? 'N/A'} mm/s
- Avg layer height: ${s.failed.avgLayer ?? 'N/A'} mm
- Avg infill: ${s.failed.avgInfill ?? 'N/A'}%
- Common materials: ${s.failed.topMaterials || 'N/A'}

SUCCESSFUL PRINTS (${s.successCount} total):
- Avg nozzle temp: ${s.success.avgNozzleTemp ?? 'N/A'}°C
- Avg bed temp: ${s.success.avgBedTemp ?? 'N/A'}°C
- Avg print speed: ${s.success.avgSpeed ?? 'N/A'} mm/s
- Avg layer height: ${s.success.avgLayer ?? 'N/A'} mm
- Avg infill: ${s.success.avgInfill ?? 'N/A'}%
- Common materials: ${s.success.topMaterials || 'N/A'}

Provide 3–6 highly specific, actionable tweaks. Each should reference exact numbers where possible (e.g., "Increase nozzle temp by 5°C to ~215°C" or "Reduce speed from ~${s.failed.avgSpeed} to ~60 mm/s"). Categorize each tweak as: temperature, speed, layer, or general.

Respond in JSON only.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'One sentence diagnosis of the main failure pattern' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          tweaks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                detail: { type: 'string' },
                category: { type: 'string', enum: ['temperature', 'speed', 'layer', 'general'] },
                impact: { type: 'string', enum: ['low', 'medium', 'high'] },
              },
            },
          },
        },
      },
    });

    setInsights(result);
    setLoading(false);
  }

  const confidenceColor = {
    high: 'text-green-400 bg-green-500/15',
    medium: 'text-amber-400 bg-amber-500/15',
    low: 'text-slate-400 bg-slate-700/50',
  };

  const impactColor = {
    high: 'text-red-300',
    medium: 'text-amber-300',
    low: 'text-slate-400',
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Print Optimizer</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Compares your {summary.failedCount} failed vs {summary.successCount} successful prints to generate specific setting tweaks.
            </p>
          </div>
        </div>

        {!hasSufficientData ? (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Need at least 2 failed and 2 successful prints with settings logged to generate insights.
          </p>
        ) : (
          <Button
            onClick={generateInsights}
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm h-9"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing {summary.failedCount} failures…</>
              : insights
              ? <><RefreshCw className="w-4 h-4 mr-2" /> Re-analyze</>
              : <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Insights</>
            }
          </Button>
        )}
      </div>

      {/* Stats preview */}
      {hasSufficientData && !insights && !loading && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 mb-3">What will be analyzed:</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Failed avg nozzle', val: summary.failed.avgNozzleTemp, unit: '°C', bad: true },
              { label: 'Success avg nozzle', val: summary.success.avgNozzleTemp, unit: '°C', bad: false },
              { label: 'Failed avg speed', val: summary.failed.avgSpeed, unit: 'mm/s', bad: true },
              { label: 'Success avg speed', val: summary.success.avgSpeed, unit: 'mm/s', bad: false },
            ].map(({ label, val, unit, bad }) => (
              <div key={label} className="bg-slate-800/60 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className={cn('text-sm font-bold mt-0.5', bad ? 'text-red-300' : 'text-green-300')}>
                  {val != null ? `${val}${unit}` : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-2 bg-slate-700/60 rounded w-full mb-1" />
              <div className="h-2 bg-slate-700/60 rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {insights && !loading && (
        <div className="space-y-3">
          {/* Summary + confidence */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-300">Diagnosis</p>
              {insights.confidence && (
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', confidenceColor[insights.confidence])}>
                  {insights.confidence} confidence
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{insights.summary}</p>
          </div>

          {/* Tweak cards */}
          {(insights.tweaks || []).map((tweak, i) => {
            const Icon = CATEGORY_ICONS[tweak.category] || TrendingUp;
            const colorClass = CATEGORY_COLORS[tweak.category] || CATEGORY_COLORS.general;
            const isOpen = expanded[i];
            return (
              <button
                key={i}
                onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                className={cn('w-full text-left rounded-xl border p-3.5 transition-colors hover:brightness-110', colorClass)}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{tweak.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {tweak.impact && (
                          <span className={cn('text-[10px] font-bold', impactColor[tweak.impact])}>
                            {tweak.impact === 'high' ? '↑↑ HIGH' : tweak.impact === 'medium' ? '↑ MED' : '↓ LOW'}
                          </span>
                        )}
                        {isOpen
                          ? <ChevronUp className="w-3 h-3 text-slate-400" />
                          : <ChevronDown className="w-3 h-3 text-slate-400" />
                        }
                      </div>
                    </div>
                    {isOpen && (
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{tweak.detail}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          <p className="text-[10px] text-slate-600 text-center pt-1">
            Based on averages across {summary.failedCount} failed and {summary.successCount} successful prints
          </p>
        </div>
      )}
    </div>
  );
}