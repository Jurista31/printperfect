import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Loader2, ChevronDown, ChevronUp,
  AlertTriangle, Star, FlaskConical, BarChart3, Zap, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Other'];

const Input = ({ className, ...props }) => (
  <input
    className={cn('w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition-colors', className)}
    {...props}
  />
);

function Section({ icon: Icon, color, title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', color)} />
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({ label, variant = 'default' }) {
  const styles = {
    danger: 'bg-red-500/10 border-red-500/30 text-red-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    info: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
    default: 'bg-slate-700/50 border-slate-600/40 text-slate-300',
  };
  return (
    <span className={cn('inline-flex items-center text-xs px-2.5 py-1 rounded-full border', styles[variant])}>
      {label}
    </span>
  );
}

export default function DeepInsightsPanel({ analysis }) {
  const [settings, setSettings] = useState({
    material: analysis.filament_material || '',
    nozzle_temp: '',
    bed_temp: '',
    print_speed: '',
    layer_height: '',
    infill: '',
    goal: '',
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  async function runDeepAnalysis() {
    setLoading(true);
    setReport(null);

    const defectSummary = analysis.defects?.length
      ? analysis.defects.map(d => `${d.name} (${d.severity}): ${d.description}`).join('\n')
      : 'No defects detected.';

    const settingsSummary = [
      settings.material && `Material: ${settings.material}`,
      settings.nozzle_temp && `Nozzle temp: ${settings.nozzle_temp}°C`,
      settings.bed_temp && `Bed temp: ${settings.bed_temp}°C`,
      settings.print_speed && `Print speed: ${settings.print_speed}mm/s`,
      settings.layer_height && `Layer height: ${settings.layer_height}mm`,
      settings.infill && `Infill: ${settings.infill}%`,
    ].filter(Boolean).join(', ') || 'Not provided';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a senior 3D printing materials and process engineer. Perform a deep quality assessment based on the following data.

=== PRINT QUALITY ===
Overall: ${analysis.overall_quality || 'unknown'}
Confidence: ${analysis.confidence_level || 'unknown'}
Summary: ${analysis.summary || 'N/A'}

=== DETECTED DEFECTS ===
${defectSummary}

=== PRINT SETTINGS ===
${settingsSummary}

=== USER GOAL ===
${settings.goal || 'General high-quality print'}

=== YOUR TASK ===
1. FAILURE POINT PREDICTION: Identify the 3-5 most likely failure points if current settings/defects are not addressed. Be specific about what will fail and under what conditions.

2. MATERIAL RECOMMENDATIONS: Suggest 3 optimal material choices for the stated goal. For each: name, why it fits, key tradeoffs, and ideal settings range.

3. QUALITY REPORT: Produce a detailed multi-dimensional quality score (0-100) across: dimensional accuracy, surface finish, structural integrity, layer adhesion, and overall consistency. Provide a brief justification for each score and an overall grade.

4. PROCESS OPTIMIZATION: Give 3-5 specific, data-driven optimizations to the current settings that would most improve quality.

Return JSON only.`,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          failure_predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                failure: { type: 'string' },
                likelihood: { type: 'string', enum: ['low', 'medium', 'high'] },
                trigger_condition: { type: 'string' },
                prevention: { type: 'string' },
              },
            },
          },
          material_recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                material: { type: 'string' },
                why_it_fits: { type: 'string' },
                tradeoffs: { type: 'string' },
                ideal_nozzle: { type: 'string' },
                ideal_bed: { type: 'string' },
                ideal_speed: { type: 'string' },
              },
            },
          },
          quality_scores: {
            type: 'object',
            properties: {
              dimensional_accuracy: { type: 'number' },
              surface_finish: { type: 'number' },
              structural_integrity: { type: 'number' },
              layer_adhesion: { type: 'number' },
              overall_consistency: { type: 'number' },
              justifications: { type: 'object' },
              overall_grade: { type: 'string' },
            },
          },
          process_optimizations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                parameter: { type: 'string' },
                current: { type: 'string' },
                recommended: { type: 'string' },
                impact: { type: 'string' },
              },
            },
          },
        },
      },
    });

    setReport(result);
    setLoading(false);
  }

  const LIKELIHOOD_STYLE = { high: 'danger', medium: 'warning', low: 'default' };
  const scoreColor = (s) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-cyan-400' : s >= 40 ? 'text-amber-400' : 'text-red-400';
  const scoreBar = (s) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-cyan-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="bg-gradient-to-br from-violet-600/15 to-indigo-600/15 border border-violet-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-violet-500/5 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white">Deep AI Insights</p>
          <p className="text-xs text-slate-400">Failure predictions · Material advice · Quality report</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Optional settings form */}
              <div className="bg-slate-800/40 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Print context (optional — improves accuracy)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Material</label>
                    <select
                      value={settings.material}
                      onChange={e => set('material', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/60"
                    >
                      <option value="">Unknown</option>
                      {MATERIALS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Nozzle (°C)</label>
                    <Input value={settings.nozzle_temp} onChange={e => set('nozzle_temp', e.target.value)} placeholder="210" type="number" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Bed (°C)</label>
                    <Input value={settings.bed_temp} onChange={e => set('bed_temp', e.target.value)} placeholder="60" type="number" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Speed (mm/s)</label>
                    <Input value={settings.print_speed} onChange={e => set('print_speed', e.target.value)} placeholder="50" type="number" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Layer (mm)</label>
                    <Input value={settings.layer_height} onChange={e => set('layer_height', e.target.value)} placeholder="0.2" type="number" step="0.01" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Infill (%)</label>
                    <Input value={settings.infill} onChange={e => set('infill', e.target.value)} placeholder="20" type="number" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Print goal (e.g. "functional part", "display model", "flexible grip")</label>
                  <Input value={settings.goal} onChange={e => set('goal', e.target.value)} placeholder="e.g. strong functional part for outdoor use" />
                </div>
              </div>

              <button
                onClick={runDeepAnalysis}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                  : report
                  ? <><Sparkles className="w-4 h-4" /> Re-analyze</>
                  : <><Sparkles className="w-4 h-4" /> Run Deep Analysis</>}
              </button>

              {/* Results */}
              {report && (
                <div className="space-y-3">

                  {/* Quality Scores */}
                  {report.quality_scores && (
                    <Section icon={BarChart3} color="text-cyan-400" title={`Quality Report — Grade: ${report.quality_scores.overall_grade || '—'}`}>
                      {[
                        ['Dimensional Accuracy', report.quality_scores.dimensional_accuracy],
                        ['Surface Finish', report.quality_scores.surface_finish],
                        ['Structural Integrity', report.quality_scores.structural_integrity],
                        ['Layer Adhesion', report.quality_scores.layer_adhesion],
                        ['Overall Consistency', report.quality_scores.overall_consistency],
                      ].map(([label, score]) => score != null && (
                        <div key={label}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400">{label}</span>
                            <span className={cn('text-xs font-bold', scoreColor(score))}>{score}/100</span>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', scoreBar(score))} style={{ width: `${score}%` }} />
                          </div>
                          {report.quality_scores.justifications?.[label.toLowerCase().replace(/ /g, '_')] && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{report.quality_scores.justifications[label.toLowerCase().replace(/ /g, '_')]}</p>
                          )}
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Failure Predictions */}
                  {report.failure_predictions?.length > 0 && (
                    <Section icon={AlertTriangle} color="text-red-400" title="Failure Point Predictions">
                      {report.failure_predictions.map((fp, i) => (
                        <div key={i} className="bg-slate-700/30 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{fp.failure}</p>
                            <Pill label={fp.likelihood} variant={LIKELIHOOD_STYLE[fp.likelihood] || 'default'} />
                          </div>
                          {fp.trigger_condition && <p className="text-xs text-slate-400"><span className="text-slate-500">Trigger: </span>{fp.trigger_condition}</p>}
                          {fp.prevention && <p className="text-xs text-green-400"><span className="text-slate-500">Prevention: </span>{fp.prevention}</p>}
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Material Recommendations */}
                  {report.material_recommendations?.length > 0 && (
                    <Section icon={Star} color="text-yellow-400" title="Optimal Material Suggestions">
                      {report.material_recommendations.map((m, i) => (
                        <div key={i} className="bg-slate-700/30 rounded-lg p-3 space-y-1.5">
                          <p className="text-sm font-bold text-white">{m.material}</p>
                          <p className="text-xs text-slate-300">{m.why_it_fits}</p>
                          {m.tradeoffs && <p className="text-xs text-amber-400/80"><span className="text-slate-500">Tradeoffs: </span>{m.tradeoffs}</p>}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {m.ideal_nozzle && <Pill label={`🌡 ${m.ideal_nozzle}`} variant="info" />}
                            {m.ideal_bed && <Pill label={`🛏 ${m.ideal_bed}`} variant="info" />}
                            {m.ideal_speed && <Pill label={`⚡ ${m.ideal_speed}`} variant="info" />}
                          </div>
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Process Optimizations */}
                  {report.process_optimizations?.length > 0 && (
                    <Section icon={Zap} color="text-violet-400" title="Process Optimizations">
                      {report.process_optimizations.map((opt, i) => (
                        <div key={i} className="flex gap-3 py-2 border-b border-slate-700/40 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{opt.parameter}</p>
                            {(opt.current || opt.recommended) && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {opt.current && <span className="text-red-400/80">{opt.current}</span>}
                                {opt.current && opt.recommended && <span className="text-slate-600"> → </span>}
                                {opt.recommended && <span className="text-green-400">{opt.recommended}</span>}
                              </p>
                            )}
                            {opt.impact && <p className="text-xs text-slate-500 mt-0.5">{opt.impact}</p>}
                          </div>
                        </div>
                      ))}
                    </Section>
                  )}

                  <p className="text-[10px] text-slate-600 flex items-center gap-1 pt-1">
                    <Sparkles className="w-3 h-3" /> Powered by Claude Sonnet — uses more integration credits.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}