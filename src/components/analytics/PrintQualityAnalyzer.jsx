import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Microscope, Loader2, ImageOff, ChevronDown, ChevronUp, ScanSearch, AlertTriangle, Sliders, Lightbulb, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_STYLE = {
  high:   { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  medium: { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  low:    { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-400' },
};

function QualityScoreBadge({ score }) {
  const color = score >= 70 ? 'text-green-400 border-green-500/30 bg-green-500/10'
    : score >= 45 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    : 'text-red-400 border-red-500/30 bg-red-500/10';
  return (
    <div className={cn('flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 flex-shrink-0', color)}>
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="text-[9px] font-semibold">/ 100</span>
    </div>
  );
}

export default function PrintQualityAnalyzer({ entries }) {
  const [analysisMap, setAnalysisMap] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Only failed prints — prioritize those with images
  const failedPrints = useMemo(() => {
    const failures = entries.filter(e => e.outcome === 'failure');
    const withImg = failures.filter(e => e.image_url);
    const withoutImg = failures.filter(e => !e.image_url);
    return [...withImg, ...withoutImg].slice(0, 30);
  }, [entries]);

  async function analyze(entry) {
    setLoadingId(entry.id);
    setExpandedId(null);

    const settingsContext = `
Print: "${entry.title}"
Printer: ${entry.printer_model || 'Unknown'}
Material: ${entry.filament_material || 'Unknown'}${entry.filament_brand ? ' / ' + entry.filament_brand : ''}
Settings:
  - Nozzle temp: ${entry.nozzle_temp ? entry.nozzle_temp + '°C' : 'not recorded'}
  - Bed temp: ${entry.bed_temp ? entry.bed_temp + '°C' : 'not recorded'}
  - Print speed: ${entry.print_speed ? entry.print_speed + 'mm/s' : 'not recorded'}
  - Layer height: ${entry.layer_height ? entry.layer_height + 'mm' : 'not recorded'}
  - Infill: ${entry.infill_percent ? entry.infill_percent + '%' : 'not recorded'}
Ambient: ${entry.ambient_temp ? entry.ambient_temp + '°C room' : ''} ${entry.ambient_humidity ? entry.ambient_humidity + '% RH' : ''}
User notes: ${entry.notes || 'none'}`.trim();

    const prompt = `You are an expert FDM 3D printing quality analyst. Analyze this failed print${entry.image_url ? ' using the provided image and' : ' using only'} the print settings data below.

${settingsContext}

Provide a detailed quality analysis including:
1. An overall print quality score 0-100 (0=catastrophic failure, 100=perfect)
2. Up to 5 specific quality issues identified (from image if available, otherwise inferred from settings)
3. For each issue: name, severity (high/medium/low), root cause, and 1-2 specific setting adjustments to fix it
4. A concise overall summary
5. The single highest-priority fix the user should try first

Return JSON only.`;

    const payload = {
      prompt,
      ...(entry.image_url ? { file_urls: [entry.image_url] } : {}),
      response_json_schema: {
        type: 'object',
        properties: {
          quality_score: { type: 'number' },
          summary: { type: 'string' },
          top_priority_fix: { type: 'string' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                severity: { type: 'string' },
                root_cause: { type: 'string' },
                setting_adjustments: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    };

    const result = await base44.integrations.Core.InvokeLLM(payload);
    setAnalysisMap(prev => ({ ...prev, [entry.id]: result }));
    setExpandedId(entry.id);
    setLoadingId(null);
  }

  if (failedPrints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Microscope className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm font-semibold text-white">No failed prints logged</p>
        <p className="text-xs text-slate-500 mt-1">Log some failed prints in your Journal to get AI quality analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <ScanSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Print Quality Analyzer</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              AI inspects each failed print{failedPrints.some(e => e.image_url) ? ' — prints with photos get image analysis' : ''}. Select any failed print to run a deep quality breakdown with specific setting fix suggestions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 bg-slate-700/40 rounded-lg px-2.5 py-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[10px] text-slate-400">{failedPrints.filter(e => e.image_url).length} with photo</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-700/40 rounded-lg px-2.5 py-1">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-[10px] text-slate-400">{failedPrints.filter(e => !e.image_url).length} settings-only</span>
          </div>
        </div>
      </div>

      {/* Failed print cards */}
      {failedPrints.map((entry) => {
        const analysis = analysisMap[entry.id];
        const isLoading = loadingId === entry.id;
        const isExpanded = expandedId === entry.id;

        return (
          <div key={entry.id} className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="p-4">
              <div className="flex items-center gap-3">
                {/* Thumbnail or placeholder */}
                {entry.image_url ? (
                  <img src={entry.image_url} alt={entry.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-600/40" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-700/50 border border-slate-600/30 flex items-center justify-center flex-shrink-0">
                    <ImageOff className="w-5 h-5 text-slate-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{entry.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {entry.printer_model || 'Unknown printer'} · {entry.filament_material || 'Unknown material'}
                  </p>
                  {entry.print_date && (
                    <p className="text-[10px] text-slate-600 mt-0.5">{entry.print_date}</p>
                  )}
                  {entry.image_url && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5">
                      📷 Image analysis
                    </span>
                  )}
                </div>
                <button
                  onClick={() => analysis ? setExpandedId(isExpanded ? null : entry.id) : analyze(entry)}
                  disabled={isLoading}
                  className={cn(
                    'h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all',
                    analysis
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                  )}
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                   analysis ? (isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) :
                   <><Microscope className="w-3.5 h-3.5" /> Analyze</>}
                </button>
              </div>
            </div>

            {/* Analysis results */}
            {analysis && isExpanded && (
              <div className="border-t border-slate-700/40 px-4 py-3 space-y-3">
                {/* Score + summary */}
                <div className="flex items-start gap-3">
                  <QualityScoreBadge score={analysis.quality_score} />
                  <div className="flex-1">
                    <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>
                  </div>
                </div>

                {/* Top priority fix */}
                {analysis.top_priority_fix && (
                  <div className="flex items-start gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/25 rounded-xl p-3">
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">Top Priority Fix</p>
                      <p className="text-xs text-slate-200">{analysis.top_priority_fix}</p>
                    </div>
                  </div>
                )}

                {/* Issues */}
                {analysis.issues?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> Quality Issues
                    </p>
                    {analysis.issues.map((issue, i) => {
                      const sev = SEVERITY_STYLE[issue.severity] || SEVERITY_STYLE.low;
                      return (
                        <div key={i} className={cn('rounded-xl border p-3 space-y-2', sev.bg, sev.border)}>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', sev.dot)} />
                            <p className={cn('text-xs font-semibold', sev.text)}>{issue.name}</p>
                            <span className={cn('ml-auto text-[9px] font-bold uppercase', sev.text)}>{issue.severity}</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{issue.root_cause}</p>
                          {issue.setting_adjustments?.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                <Sliders className="w-3 h-3" /> Setting Adjustments
                              </p>
                              {issue.setting_adjustments.map((adj, j) => (
                                <div key={j} className="flex items-start gap-1.5 text-xs text-slate-300">
                                  <span className="text-cyan-400 mt-0.5 flex-shrink-0">→</span>
                                  <span>{adj}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => analyze(entry)}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400 transition-colors pt-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Re-analyze
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}