import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp, Star, Zap, Shield, Palette, Wind, FlameKindling } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHARACTERISTICS = [
  { id: 'strength', label: 'High Strength', icon: Shield, color: 'text-red-400' },
  { id: 'flexibility', label: 'Flexibility', icon: Wind, color: 'text-cyan-400' },
  { id: 'smooth_finish', label: 'Smooth Finish', icon: Palette, color: 'text-pink-400' },
  { id: 'heat_resistance', label: 'Heat Resistance', icon: FlameKindling, color: 'text-orange-400' },
  { id: 'low_energy', label: 'Low Energy Use', icon: Zap, color: 'text-yellow-400' },
  { id: 'easy_print', label: 'Easy to Print', icon: Star, color: 'text-green-400' },
];

const SCORE_COLOR = (score) =>
  score >= 80 ? 'text-green-400 border-green-500/40 bg-green-500/10'
  : score >= 60 ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'
  : score >= 40 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
  : 'text-red-400 border-red-500/40 bg-red-500/10';

function buildHistoryContext(entries) {
  const byMaterial = {};
  entries.forEach(e => {
    const k = e.filament_material || 'Unknown';
    if (!byMaterial[k]) byMaterial[k] = { total: 0, failures: 0, brands: {}, nozzleTemps: [], speeds: [], durations: [] };
    byMaterial[k].total++;
    if (e.outcome === 'failure') byMaterial[k].failures++;
    if (e.filament_brand) byMaterial[k].brands[e.filament_brand] = (byMaterial[k].brands[e.filament_brand] || 0) + 1;
    if (e.nozzle_temp) byMaterial[k].nozzleTemps.push(e.nozzle_temp);
    if (e.print_speed) byMaterial[k].speeds.push(e.print_speed);
    if (e.duration_minutes) byMaterial[k].durations.push(e.duration_minutes);
  });

  return Object.entries(byMaterial).map(([mat, d]) => {
    const failRate = Math.round((d.failures / d.total) * 100);
    const topBrand = Object.entries(d.brands).sort((a, b) => b[1] - a[1])[0]?.[0];
    const avgNozzle = d.nozzleTemps.length ? Math.round(d.nozzleTemps.reduce((s, v) => s + v, 0) / d.nozzleTemps.length) : null;
    const avgSpeed = d.speeds.length ? Math.round(d.speeds.reduce((s, v) => s + v, 0) / d.speeds.length) : null;
    const avgDuration = d.durations.length ? Math.round(d.durations.reduce((s, v) => s + v, 0) / d.durations.length) : null;
    return { material: mat, total: d.total, failRate, topBrand, avgNozzle, avgSpeed, avgDuration };
  }).sort((a, b) => b.total - a.total);
}

export default function FilamentRecommendationPanel({ entries }) {
  const [selected, setSelected] = useState([]);
  const [customNote, setCustomNote] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const { data: profiles = [] } = useQuery({
    queryKey: ['filament-profiles-fa'],
    queryFn: () => base44.entities.FilamentProfile.list('-created_date', 100),
  });

  const historyContext = useMemo(() => buildHistoryContext(entries), [entries]);

  const toggle = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  async function getRecommendations() {
    setLoading(true);
    setReport(null);

    const selectedLabels = selected.map(id => CHARACTERISTICS.find(c => c.id === id)?.label).filter(Boolean);

    const profileSummary = profiles.length
      ? profiles.map(p => `${p.brand} ${p.material} — nozzle ${p.nozzle_temp || '?'}°C, bed ${p.bed_temp || '?'}°C, speed ${p.print_speed || '?'}mm/s, rated ${p.rating || '?'}/5`).join('\n')
      : 'No filament profiles saved.';

    const prompt = `You are an expert 3D printing materials scientist. Based on this user's complete print history, failure data, energy usage, and saved filament profiles, provide highly personalized filament recommendations.

=== PRINT HISTORY BY MATERIAL ===
${historyContext.map(m =>
  `${m.material}: ${m.total} prints, ${m.failRate}% fail rate` +
  (m.topBrand ? `, top brand: ${m.topBrand}` : '') +
  (m.avgNozzle ? `, avg nozzle: ${m.avgNozzle}°C` : '') +
  (m.avgSpeed ? `, avg speed: ${m.avgSpeed}mm/s` : '') +
  (m.avgDuration ? `, avg duration: ${m.avgDuration}min` : '')
).join('\n') || 'No history yet.'}

=== SAVED FILAMENT PROFILES ===
${profileSummary}

=== USER'S DESIRED PRINT CHARACTERISTICS ===
${selectedLabels.length ? selectedLabels.join(', ') : 'No specific preferences selected'}

=== ADDITIONAL USER NOTES ===
${customNote.trim() || 'None'}

=== TASK ===
Provide 4-5 specific filament recommendations. For each:
1. Suggest a specific material type AND up to 2 real brand names known for quality
2. Give a match score 0-100 based on history success rates and desired characteristics
3. Explain why it fits this user's specific history and goals
4. Provide optimized print settings (nozzle temp, bed temp, speed)
5. Note any risks based on the user's failure patterns
6. List 2-3 key strengths for this user's use case

Also provide a brief overall insight summary about this user's filament usage patterns.

Return JSON only.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          insight_summary: { type: 'string' },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                material: { type: 'string' },
                brands: { type: 'array', items: { type: 'string' } },
                match_score: { type: 'number' },
                why_it_fits: { type: 'string' },
                settings: {
                  type: 'object',
                  properties: {
                    nozzle_temp: { type: 'string' },
                    bed_temp: { type: 'string' },
                    speed: { type: 'string' },
                  },
                },
                risks: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    setReport(result);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-fuchsia-600/20 to-violet-600/20 border border-fuchsia-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Filament Advisor</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized recommendations based on your {entries.length} prints, failure trends, and energy data.
            </p>
          </div>
        </div>

        {/* Characteristic selector */}
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Desired characteristics (optional)</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {CHARACTERISTICS.map(c => {
            const Icon = c.icon;
            const active = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                  active
                    ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-white'
                    : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:text-slate-300'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', active ? c.color : 'text-slate-600')} />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Custom notes */}
        <textarea
          value={customNote}
          onChange={e => setCustomNote(e.target.value)}
          placeholder="Any specific requirements? (e.g. 'outdoor use', 'food safe', 'transparent parts')"
          rows={2}
          className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-fuchsia-500/50 resize-none mb-3"
        />

        <button
          onClick={getRecommendations}
          disabled={loading || entries.length === 0}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing your history…</>
            : report
            ? <><RefreshCw className="w-3.5 h-3.5" /> Re-analyze</>
            : <><Sparkles className="w-3.5 h-3.5" /> Get Personalized Recommendations</>}
        </button>
        {entries.length === 0 && (
          <p className="text-[10px] text-slate-600 text-center mt-1.5">Log some prints in your Journal first.</p>
        )}
      </div>

      {/* Results */}
      {report && (
        <>
          {/* Insight summary */}
          {report.insight_summary && (
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-fuchsia-400" /> Your Filament Usage Insights
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">{report.insight_summary}</p>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.map((rec, i) => {
            const isOpen = expanded[i];
            const scoreStyle = SCORE_COLOR(rec.match_score);
            return (
              <button
                key={i}
                onClick={() => setExpanded(p => ({ ...p, [i]: !p[i] }))}
                className="w-full text-left bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 transition-colors hover:border-slate-600/60"
              >
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className={cn('w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center flex-shrink-0 text-center', scoreStyle)}>
                    <span className="text-sm font-bold leading-none">{rec.match_score}</span>
                    <span className="text-[8px]">/ 100</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{rec.material}</p>
                    {rec.brands?.length > 0 && (
                      <p className="text-[10px] text-fuchsia-400 mt-0.5">{rec.brands.join(' · ')}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rec.strengths?.map((s, j) => (
                        <span key={j} className="text-[9px] bg-slate-700/60 border border-slate-600/40 rounded px-1.5 py-0.5 text-slate-400">{s}</span>
                      ))}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />}
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-slate-700/40">
                    <p className="text-xs text-slate-300 leading-relaxed">{rec.why_it_fits}</p>

                    {/* Settings */}
                    {rec.settings && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Nozzle', value: rec.settings.nozzle_temp },
                          { label: 'Bed', value: rec.settings.bed_temp },
                          { label: 'Speed', value: rec.settings.speed },
                        ].map(s => s.value && (
                          <div key={s.label} className="bg-slate-700/40 rounded-lg p-2 text-center">
                            <p className="text-xs font-semibold text-white">{s.value}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Risks */}
                    {rec.risks && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-semibold text-amber-400 mb-0.5">⚠ Watch out</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{rec.risks}</p>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          <p className="text-[10px] text-slate-600 flex items-center gap-1.5 pt-1">
            <Sparkles className="w-3 h-3" /> Powered by Claude Sonnet — uses more integration credits.
          </p>
        </>
      )}
    </div>
  );
}