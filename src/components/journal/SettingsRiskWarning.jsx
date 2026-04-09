import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Sparkles, X, Check, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

function StatRow({ label, current, suggested, unit = '' }) {
  const changed = suggested != null && String(current) !== String(suggested);
  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2 rounded-lg',
      changed ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/60'
    )}>
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        {changed && <span className="text-xs text-slate-500 line-through">{current}{unit}</span>}
        <span className={cn('text-xs font-semibold', changed ? 'text-amber-300' : 'text-slate-300')}>
          {suggested != null ? suggested : current}{unit}
        </span>
        {changed && <ChevronRight className="w-3 h-3 text-amber-400" />}
      </div>
    </div>
  );
}

export default function SettingsRiskWarning({ form, allEntries, onApply, onDismiss }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // null | { risk: 'low'|'medium'|'high', reason, suggestions }
  const [checked, setChecked] = useState(false);

  const canCheck = form.printer_model && form.filament_material && (form.nozzle_temp || form.print_speed);

  const analyze = async () => {
    setLoading(true);
    setChecked(true);

    // Build history of same printer+material combos
    const relevant = allEntries.filter(e =>
      e.printer_model && form.printer_model &&
      e.printer_model.toLowerCase().trim() === form.printer_model.toLowerCase().trim() &&
      e.filament_material === form.filament_material
    );

    const failures = relevant.filter(e => e.outcome === 'failure');
    const successes = relevant.filter(e => e.outcome === 'success');

    const historyText = relevant.slice(0, 30).map(e =>
      `outcome=${e.outcome} nozzle_temp=${e.nozzle_temp ?? '?'} bed_temp=${e.bed_temp ?? '?'} print_speed=${e.print_speed ?? '?'} layer_height=${e.layer_height ?? '?'}`
    ).join('\n');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a 3D printing expert analyzing print settings risk.

Printer: ${form.printer_model}
Material: ${form.filament_material}
Current planned settings:
  Nozzle temp: ${form.nozzle_temp ?? 'not set'}°C
  Bed temp: ${form.bed_temp ?? 'not set'}°C
  Print speed: ${form.print_speed ?? 'not set'} mm/s
  Layer height: ${form.layer_height ?? 'not set'} mm

Historical prints on this printer+material combination (${relevant.length} total, ${failures.length} failures, ${successes.length} successes):
${historyText || 'No historical data yet.'}

Based on this history, assess whether the current settings correlate with a high failure rate.
- If fewer than 3 historical entries exist, risk should be "low" with a note about insufficient data.
- If the failure rate for similar settings is >40%, risk is "high".
- If 20-40%, risk is "medium".
- Otherwise "low".

Return concise JSON with:
- risk: "low" | "medium" | "high"
- reason: 1-2 sentence explanation of why these settings may be risky (or safe)
- suggested_nozzle_temp: number or null (only if adjustment recommended)
- suggested_bed_temp: number or null
- suggested_print_speed: number or null
- suggested_layer_height: number or null
- tip: one short actionable tip (under 20 words)`,
      response_json_schema: {
        type: 'object',
        properties: {
          risk: { type: 'string' },
          reason: { type: 'string' },
          suggested_nozzle_temp: { type: 'number' },
          suggested_bed_temp: { type: 'number' },
          suggested_print_speed: { type: 'number' },
          suggested_layer_height: { type: 'number' },
          tip: { type: 'string' },
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  const hasSuggestions = result && (
    result.suggested_nozzle_temp != null ||
    result.suggested_bed_temp != null ||
    result.suggested_print_speed != null ||
    result.suggested_layer_height != null
  );

  const handleApply = () => {
    const patches = {};
    if (result.suggested_nozzle_temp != null) patches.nozzle_temp = result.suggested_nozzle_temp;
    if (result.suggested_bed_temp != null) patches.bed_temp = result.suggested_bed_temp;
    if (result.suggested_print_speed != null) patches.print_speed = result.suggested_print_speed;
    if (result.suggested_layer_height != null) patches.layer_height = result.suggested_layer_height;
    onApply(patches);
    onDismiss();
  };

  const riskColor = {
    low: 'text-green-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };
  const riskBg = {
    low: 'border-green-500/30 bg-green-500/8',
    medium: 'border-amber-500/30 bg-amber-500/10',
    high: 'border-red-500/40 bg-red-500/12',
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-800/40">
        <ShieldAlert className="w-5 h-5 text-amber-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Pre-Print Settings Check</p>
          <p className="text-xs text-slate-500">AI analyzes your settings against past failures</p>
        </div>
        <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Current settings summary */}
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500 font-medium mb-2">Settings to analyze</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              ['Printer', form.printer_model || '—'],
              ['Material', form.filament_material || '—'],
              ['Nozzle', form.nozzle_temp ? `${form.nozzle_temp}°C` : '—'],
              ['Speed', form.print_speed ? `${form.print_speed}mm/s` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between bg-slate-800/60 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-300 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action / Result */}
        <AnimatePresence mode="wait">
          {!checked ? (
            <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                onClick={analyze}
                disabled={!canCheck || loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analyze Risk
              </Button>
              {!canCheck && (
                <p className="text-xs text-slate-600 text-center mt-2">Fill in printer model + material to enable analysis</p>
              )}
            </motion.div>
          ) : loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              <p className="text-sm text-slate-400">Analyzing your print history…</p>
            </motion.div>
          ) : result ? (
            <motion.div key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Risk badge */}
              <div className={cn('rounded-xl border p-3', riskBg[result.risk] || riskBg.low)}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={cn('w-4 h-4', riskColor[result.risk] || 'text-slate-400')} />
                  <span className={cn('text-sm font-semibold capitalize', riskColor[result.risk])}>
                    {result.risk} risk
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{result.reason}</p>
                {result.tip && (
                  <p className="mt-1.5 text-xs text-slate-500 italic">💡 {result.tip}</p>
                )}
              </div>

              {/* Suggestions */}
              {hasSuggestions && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-white">Suggested adjustments</p>
                  <StatRow label="Nozzle Temp" current={form.nozzle_temp} suggested={result.suggested_nozzle_temp} unit="°C" />
                  <StatRow label="Bed Temp" current={form.bed_temp} suggested={result.suggested_bed_temp} unit="°C" />
                  <StatRow label="Print Speed" current={form.print_speed} suggested={result.suggested_print_speed} unit=" mm/s" />
                  <StatRow label="Layer Height" current={form.layer_height} suggested={result.suggested_layer_height} unit=" mm" />
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onDismiss} className="flex-1 border-slate-700 text-slate-400">
                  Keep My Settings
                </Button>
                {hasSuggestions && (
                  <Button size="sm" onClick={handleApply} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white gap-1">
                    <Check className="w-3.5 h-3.5" /> Apply Suggestions
                  </Button>
                )}
              </div>

              <button
                onClick={() => { setChecked(false); setResult(null); }}
                className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Re-analyze
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}