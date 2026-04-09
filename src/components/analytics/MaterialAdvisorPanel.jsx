import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FlaskConical, Loader2, RefreshCw, Star, ThermometerSun, Gauge, ChevronDown, ChevronUp, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SCORE_COLOR = (score) => {
  if (score >= 80) return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Excellent' };
  if (score >= 60) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Good' };
  if (score >= 40) return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Fair' };
  return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Poor' };
};

function ScoreRing({ score }) {
  const style = SCORE_COLOR(score);
  return (
    <div className={cn('w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 flex-shrink-0', style.bg, style.border)}>
      <span className={cn('text-lg font-bold leading-none', style.text)}>{score}</span>
      <span className={cn('text-[9px] font-semibold', style.text)}>{style.label}</span>
    </div>
  );
}

function buildMaterialStats(entries, profiles) {
  // Group journal entries by brand+material combo
  const combos = {};
  entries.forEach(e => {
    const key = `${e.filament_brand || 'Unknown Brand'}||${e.filament_material || 'Unknown'}`;
    if (!combos[key]) combos[key] = { brand: e.filament_brand || 'Unknown Brand', material: e.filament_material || 'Unknown', prints: [] };
    combos[key].prints.push(e);
  });

  // Also register filament profiles even if not yet printed
  profiles.forEach(p => {
    const key = `${p.brand}||${p.material}`;
    if (!combos[key]) combos[key] = { brand: p.brand, material: p.material, prints: [] };
    combos[key].profile = p;
  });

  return Object.values(combos).map(combo => {
    const { brand, material, prints, profile } = combo;
    const total = prints.length;
    const successes = prints.filter(p => p.outcome === 'success').length;
    const failures = prints.filter(p => p.outcome === 'failure').length;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : null;

    // Average settings on successful prints
    const successPrints = prints.filter(p => p.outcome === 'success');
    const avg = (arr, key) => {
      const vals = arr.map(p => p[key]).filter(Boolean);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };
    const avgNozzle = avg(successPrints, 'nozzle_temp');
    const avgBed = avg(successPrints, 'bed_temp');
    const avgSpeed = avg(successPrints, 'print_speed');
    const avgLayer = successPrints.length
      ? (successPrints.map(p => p.layer_height).filter(Boolean).reduce((a, b) => a + b, 0) / successPrints.filter(p => p.layer_height).length || null)
      : null;

    // Failure nozzle range to flag bad temps
    const failureNozzles = prints.filter(p => p.outcome === 'failure').map(p => p.nozzle_temp).filter(Boolean);
    const avgFailNozzle = failureNozzles.length ? Math.round(failureNozzles.reduce((a, b) => a + b, 0) / failureNozzles.length) : null;

    return {
      brand, material, total, successRate, failures,
      avgNozzle, avgBed, avgSpeed,
      avgLayer: avgLayer ? avgLayer.toFixed(2) : null,
      avgFailNozzle,
      profile: profile || null,
      hasPrintData: total > 0,
    };
  }).sort((a, b) => (b.total - a.total));
}

export default function MaterialAdvisorPanel({ entries }) {
  const [adviceMap, setAdviceMap] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);
  const [expanded, setExpanded] = useState({});

  const { data: profiles = [] } = useQuery({
    queryKey: ['filament-profiles-advisor'],
    queryFn: () => base44.entities.FilamentProfile.list('-created_date', 100),
  });

  const materials = useMemo(() => buildMaterialStats(entries, profiles), [entries, profiles]);

  async function getAdvice(combo) {
    const key = `${combo.brand}||${combo.material}`;
    setLoadingKey(key);

    const prompt = `You are an expert FDM 3D printing materials scientist. Based on real print history data, generate a compatibility score and optimized settings for this filament.

Filament: ${combo.brand} ${combo.material}
Total prints: ${combo.total}
Success rate: ${combo.successRate !== null ? combo.successRate + '%' : 'No data yet'}
Failed prints: ${combo.failures}
Average settings on SUCCESSFUL prints:
  - Nozzle temp: ${combo.avgNozzle ? combo.avgNozzle + '°C' : 'not recorded'}
  - Bed temp: ${combo.avgBed ? combo.avgBed + '°C' : 'not recorded'}
  - Print speed: ${combo.avgSpeed ? combo.avgSpeed + 'mm/s' : 'not recorded'}
  - Layer height: ${combo.avgLayer ? combo.avgLayer + 'mm' : 'not recorded'}
Average settings on FAILED prints:
  - Nozzle temp: ${combo.avgFailNozzle ? combo.avgFailNozzle + '°C' : 'not recorded'}
Stored filament profile settings: ${combo.profile
  ? `nozzle ${combo.profile.nozzle_temp || '?'}°C, bed ${combo.profile.bed_temp || '?'}°C, speed ${combo.profile.print_speed || '?'}mm/s`
  : 'none saved'}

Generate:
1. A compatibility score (0-100) reflecting how reliably this material prints based on the data
2. Ideal nozzle temperature range
3. Ideal flow rate / print speed recommendation
4. 2-3 specific insights or warnings drawn directly from the failure vs success data
5. One "pro tip" specific to this brand/material combo

Return JSON only.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          compatibility_score: { type: 'number' },
          ideal_nozzle_min: { type: 'number' },
          ideal_nozzle_max: { type: 'number' },
          ideal_speed_min: { type: 'number' },
          ideal_speed_max: { type: 'number' },
          ideal_bed_temp: { type: 'number' },
          insights: { type: 'array', items: { type: 'string' } },
          pro_tip: { type: 'string' },
        },
      },
    });

    setAdviceMap(prev => ({ ...prev, [key]: result }));
    setExpanded(prev => ({ ...prev, [key]: true }));
    setLoadingKey(null);
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <PackageSearch className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm font-semibold text-white">No filament data yet</p>
        <p className="text-xs text-slate-500 mt-1">Log prints with filament details or add profiles to the Material Library to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600/20 to-pink-600/20 border border-violet-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Material Advisor</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              AI calculates a compatibility score and ideal settings for each filament brand/type using your actual print history.
            </p>
          </div>
        </div>
      </div>

      {/* Material cards */}
      {materials.map((combo) => {
        const key = `${combo.brand}||${combo.material}`;
        const advice = adviceMap[key];
        const isLoading = loadingKey === key;
        const isExpanded = expanded[key];
        const scoreStyle = advice ? SCORE_COLOR(advice.compatibility_score) : null;

        return (
          <div key={key} className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="p-4">
              <div className="flex items-center gap-3">
                {advice ? (
                  <ScoreRing score={advice.compatibility_score} />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-700/50 border-2 border-slate-600/40 flex flex-col items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{combo.brand}</p>
                  <p className="text-xs text-slate-400">{combo.material}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {combo.hasPrintData ? (
                      <>
                        <span className="text-[10px] text-slate-500">{combo.total} prints</span>
                        <span className="text-slate-600">·</span>
                        <span className={cn('text-[10px] font-semibold',
                          combo.successRate >= 80 ? 'text-green-400' :
                          combo.successRate >= 50 ? 'text-amber-400' : 'text-red-400'
                        )}>{combo.successRate}% success</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">No print history yet</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => advice ? setExpanded(p => ({ ...p, [key]: !p[key] })) : getAdvice(combo)}
                  disabled={isLoading}
                  className={cn(
                    'h-8 text-xs flex-shrink-0',
                    advice
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white'
                  )}
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                   advice ? (isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) :
                   'Analyze'}
                </Button>
              </div>

              {/* Quick settings row (from history) */}
              {combo.hasPrintData && (combo.avgNozzle || combo.avgSpeed) && (
                <div className="flex gap-2 mt-3">
                  {combo.avgNozzle && (
                    <div className="flex items-center gap-1 bg-slate-700/40 rounded-lg px-2 py-1">
                      <ThermometerSun className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] text-slate-400">{combo.avgNozzle}°C avg nozzle</span>
                    </div>
                  )}
                  {combo.avgSpeed && (
                    <div className="flex items-center gap-1 bg-slate-700/40 rounded-lg px-2 py-1">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      <span className="text-[10px] text-slate-400">{combo.avgSpeed}mm/s avg speed</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI advice panel */}
            {advice && isExpanded && (
              <div className={cn('border-t px-4 py-3 space-y-3', scoreStyle?.border, scoreStyle?.bg)}>
                {/* Ideal settings */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                    <ThermometerSun className="w-3.5 h-3.5 text-orange-400 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-500">Nozzle</p>
                    <p className="text-xs font-bold text-white">{advice.ideal_nozzle_min}–{advice.ideal_nozzle_max}°C</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                    <ThermometerSun className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-500">Bed</p>
                    <p className="text-xs font-bold text-white">{advice.ideal_bed_temp}°C</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-500">Speed</p>
                    <p className="text-xs font-bold text-white">{advice.ideal_speed_min}–{advice.ideal_speed_max}mm/s</p>
                  </div>
                </div>

                {/* Insights */}
                {advice.insights?.length > 0 && (
                  <div className="space-y-1.5">
                    {advice.insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{ins}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pro tip */}
                {advice.pro_tip && (
                  <div className="bg-slate-800/60 border border-violet-500/20 rounded-lg p-2.5 flex items-start gap-2">
                    <Star className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300"><span className="font-semibold text-violet-300">Pro tip: </span>{advice.pro_tip}</p>
                  </div>
                )}

                <button
                  onClick={() => getAdvice(combo)}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
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