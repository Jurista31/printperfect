import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Thermometer, Zap, Layers, FlameKindling } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAILURE_THRESHOLD = 40; // % failure rate to flag as high-risk

// ── bucket helpers (mirror Analytics page logic) ─────────────────────────────
function getBucket(value, edges) {
  if (value == null || isNaN(value)) return null;
  for (let i = 0; i < edges.length - 1; i++) {
    if (value >= edges[i] && value < edges[i + 1]) return `${edges[i]}–${edges[i + 1]}`;
  }
  const last = edges[edges.length - 1];
  if (value >= last) return `≥${last}`;
  return `<${edges[0]}`;
}

function buildCells(entries, xKey, xEdges, yKey, yEdges) {
  const map = {};
  entries.forEach(e => {
    const x = getBucket(e[xKey], xEdges);
    const y = getBucket(e[yKey], yEdges);
    if (!x || !y) return;
    const k = `${x}||${y}`;
    if (!map[k]) map[k] = { x, y, total: 0, failures: 0 };
    map[k].total++;
    if (e.outcome === 'failure') map[k].failures++;
  });
  return Object.values(map).map(c => ({
    ...c,
    failureRate: c.total ? Math.round((c.failures / c.total) * 100) : 0,
  }));
}

// ── compute high-risk cells across all heatmaps ───────────────────────────────
function computeHighRiskZones(entries) {
  const MIN_SAMPLES = 3; // need at least 3 prints to flag

  const heatmaps = [
    {
      id: 'nozzle_speed',
      label: 'Nozzle Temp × Print Speed',
      icon: Thermometer,
      xKey: 'nozzle_temp', xEdges: [170, 190, 200, 210, 220, 240, 260], xUnit: '°C',
      yKey: 'print_speed', yEdges: [20, 40, 60, 80, 100, 120], yUnit: 'mm/s',
      xLabel: 'Nozzle', yLabel: 'Speed',
    },
    {
      id: 'bed_layer',
      label: 'Bed Temp × Layer Height',
      icon: Layers,
      xKey: 'bed_temp', xEdges: [40, 50, 60, 70, 80, 90, 110], xUnit: '°C',
      yKey: 'layer_height', yEdges: [0.1, 0.15, 0.2, 0.25, 0.3, 0.4], yUnit: 'mm',
      xLabel: 'Bed', yLabel: 'Layer',
    },
    {
      id: 'infill_speed',
      label: 'Infill % × Print Speed',
      icon: Zap,
      xKey: 'infill_percent', xEdges: [10, 20, 30, 40, 60, 80, 100], xUnit: '%',
      yKey: 'print_speed', yEdges: [20, 40, 60, 80, 100, 120], yUnit: 'mm/s',
      xLabel: 'Infill', yLabel: 'Speed',
    },
    {
      id: 'nozzle_layer',
      label: 'Nozzle Temp × Layer Height',
      icon: Thermometer,
      xKey: 'nozzle_temp', xEdges: [170, 190, 200, 210, 220, 240, 260], xUnit: '°C',
      yKey: 'layer_height', yEdges: [0.1, 0.15, 0.2, 0.25, 0.3, 0.4], yUnit: 'mm',
      xLabel: 'Nozzle', yLabel: 'Layer',
    },
  ];

  const zones = [];

  heatmaps.forEach(hm => {
    const cells = buildCells(entries, hm.xKey, hm.xEdges, hm.yKey, hm.yEdges);
    cells
      .filter(c => c.total >= MIN_SAMPLES && c.failureRate >= FAILURE_THRESHOLD)
      .sort((a, b) => b.failureRate - a.failureRate)
      .forEach(c => {
        zones.push({
          hmId: hm.id,
          hmLabel: hm.label,
          icon: hm.icon,
          xLabel: hm.xLabel,
          yLabel: hm.yLabel,
          xUnit: hm.xUnit,
          yUnit: hm.yUnit,
          xRange: c.x,
          yRange: c.y,
          failureRate: c.failureRate,
          total: c.total,
          failures: c.failures,
        });
      });
  });

  // Deduplicate by (hmId, x, y) to avoid duplicates if called multiple times
  const seen = new Set();
  return zones.filter(z => {
    const key = `${z.hmId}||${z.xRange}||${z.yRange}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.failureRate - a.failureRate);
}

// ── check a single journal entry against high-risk zones ─────────────────────
function checkEntryRisk(entry, zones) {
  const hits = zones.filter(z => {
    const xVal = entry[{
      'Nozzle': 'nozzle_temp', 'Bed': 'bed_temp', 'Infill': 'infill_percent'
    }[z.xLabel] || z.xLabel.toLowerCase()];
    const yVal = entry[{
      'Speed': 'print_speed', 'Layer': 'layer_height'
    }[z.yLabel] || z.yLabel.toLowerCase()];
    return (
      getBucket(xVal, getBucketEdges(z.hmId, 'x')) === z.xRange &&
      getBucket(yVal, getBucketEdges(z.hmId, 'y')) === z.yRange
    );
  });
  return hits;
}

// helper to get edges by hm id and axis
function getBucketEdges(hmId, axis) {
  const map = {
    nozzle_speed:  { x: [170,190,200,210,220,240,260], y: [20,40,60,80,100,120] },
    bed_layer:     { x: [40,50,60,70,80,90,110],       y: [0.1,0.15,0.2,0.25,0.3,0.4] },
    infill_speed:  { x: [10,20,30,40,60,80,100],       y: [20,40,60,80,100,120] },
    nozzle_layer:  { x: [170,190,200,210,220,240,260], y: [0.1,0.15,0.2,0.25,0.3,0.4] },
  };
  return map[hmId]?.[axis] ?? [];
}

// key lookup helper
const KEY_FOR = {
  Nozzle: 'nozzle_temp',
  Bed: 'bed_temp',
  Infill: 'infill_percent',
  Speed: 'print_speed',
  Layer: 'layer_height',
};

// ── badge color helper ─────────────────────────────────────────────────────────
function riskColor(rate) {
  if (rate >= 70) return { bg: 'bg-red-500/15 border-red-500/40', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' };
  if (rate >= 55) return { bg: 'bg-orange-500/15 border-orange-500/40', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' };
  return { bg: 'bg-amber-500/15 border-amber-500/40', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' };
}

// ── main component ─────────────────────────────────────────────────────────────
export default function HighRiskAlerts({ entries }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const zones = useMemo(() => computeHighRiskZones(entries), [entries]);

  // Find most-recent 10 journal entries that fall into a risk zone
  const flaggedEntries = useMemo(() => {
    const result = [];
    const recent = [...entries].sort((a, b) => (b.print_date || '').localeCompare(a.print_date || '')).slice(0, 50);
    recent.forEach(e => {
      const hits = zones.filter(z => {
        const xVal = e[KEY_FOR[z.xLabel]];
        const yVal = e[KEY_FOR[z.yLabel]];
        if (xVal == null || yVal == null) return false;
        return (
          getBucket(xVal, getBucketEdges(z.hmId, 'x')) === z.xRange &&
          getBucket(yVal, getBucketEdges(z.hmId, 'y')) === z.yRange
        );
      });
      if (hits.length) {
        result.push({ entry: e, hits });
      }
    });
    return result;
  }, [entries, zones]);

  if (zones.length === 0) return null;

  const visibleZones = showAll ? zones : zones.slice(0, 3);

  return (
    <div className="mb-5">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-1 hover:bg-red-500/15 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-red-300">High-Risk Configuration Alerts</p>
            <p className="text-[10px] text-slate-500">
              {zones.length} risky setting zone{zones.length !== 1 ? 's' : ''} · {flaggedEntries.length} recent print{flaggedEntries.length !== 1 ? 's' : ''} flagged
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {/* Risk zones */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Danger Zones (from your history)</p>
            <div className="space-y-2">
              {visibleZones.map((z, i) => {
                const Icon = z.icon;
                const colors = riskColor(z.failureRate);
                return (
                  <div key={i} className={cn('flex items-center justify-between rounded-lg border px-3 py-2.5', colors.bg)}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={cn('w-4 h-4 flex-shrink-0', colors.text)} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">{z.hmLabel}</p>
                        <p className="text-[10px] text-slate-500">
                          {z.xLabel} {z.xRange}{z.xUnit} · {z.yLabel} {z.yRange}{z.yUnit}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', colors.badge)}>
                        {z.failureRate}% fail
                      </span>
                      <span className="text-[10px] text-slate-600">({z.total})</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {zones.length > 3 && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                {showAll ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show {zones.length - 3} more zones</>}
              </button>
            )}
          </div>

          {/* Flagged recent prints */}
          {flaggedEntries.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Recent Prints in Risky Zones</p>
              <div className="space-y-2">
                {flaggedEntries.slice(0, 5).map(({ entry, hits }, i) => {
                  const maxRate = Math.max(...hits.map(h => h.failureRate));
                  const colors = riskColor(maxRate);
                  return (
                    <div key={i} className={cn('rounded-lg border px-3 py-2.5', colors.bg)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{entry.title}</p>
                          <p className="text-[10px] text-slate-500">{entry.print_date} · {entry.filament_material || '—'}</p>
                        </div>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5', colors.badge)}>
                          {entry.outcome === 'failure' ? '❌ Failed' : entry.outcome === 'partial' ? '⚠️ Partial' : '⚡ At-risk'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {hits.map((h, j) => (
                          <span key={j} className="text-[9px] text-slate-500 bg-slate-700/50 rounded px-1.5 py-0.5">
                            {h.xLabel} {h.xRange}{h.xUnit} + {h.yLabel} {h.yRange}{h.yUnit} → {h.failureRate}% fail
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}