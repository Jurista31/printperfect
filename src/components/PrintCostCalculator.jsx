import React, { useState } from 'react';
import { DollarSign, Zap, Package, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const MATERIAL_PRICE_PER_G = { PLA: 0.02, PETG: 0.025, ABS: 0.022, ASA: 0.028, TPU: 0.05, Nylon: 0.06, Resin: 0.08, Other: 0.025 };
const DEFAULT_RATES = { filamentPerG: 0.02, electricityKwh: 0.13, printerWatts: 150 };
const LS_KEY = 'printCostRates';

function loadRates() {
  try { return { ...DEFAULT_RATES, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }; } catch { return DEFAULT_RATES; }
}
function saveRates(r) { localStorage.setItem(LS_KEY, JSON.stringify(r)); }

export function estimateCost(entry, rates) {
  const r = rates || loadRates();
  // Estimate filament weight from duration if not provided (rough: ~1g/min for PLA at 50mm/s)
  const weightG = entry.filament_weight_g || (entry.duration_minutes ? entry.duration_minutes * 1.0 : null);
  const matRate = MATERIAL_PRICE_PER_G[entry.filament_material] || r.filamentPerG;
  const materialCost = weightG ? weightG * matRate : null;
  const elecCost = entry.duration_minutes ? (r.printerWatts / 1000) * (entry.duration_minutes / 60) * r.electricityKwh : null;
  const total = (materialCost || 0) + (elecCost || 0);
  return { materialCost, elecCost, total, weightG };
}

export default function PrintCostCalculator({ entries = [] }) {
  const [rates, setRates] = useState(loadRates);
  const [open, setOpen] = useState(false);

  const update = (key, val) => {
    const next = { ...rates, [key]: parseFloat(val) || 0 };
    setRates(next);
    saveRates(next);
  };

  const withCost = entries.filter(e => e.duration_minutes).map(e => ({
    ...e,
    cost: estimateCost(e, rates),
  })).sort((a, b) => b.cost.total - a.cost.total).slice(0, 5);

  const totalSpend = entries.reduce((s, e) => s + estimateCost(e, rates).total, 0);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden mt-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-700/30 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-white">Cost Calculator</p>
          <p className="text-xs text-slate-500">Est. total spend: <span className="text-emerald-400 font-semibold">${totalSpend.toFixed(2)}</span></p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-slate-700/50 p-4 space-y-4">
          {/* Rate inputs */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Cost Rates</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Filament ($/g)</label>
                <input type="number" step="0.001" value={rates.filamentPerG}
                  onChange={e => update('filamentPerG', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/60" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Electricity ($/kWh)</label>
                <input type="number" step="0.01" value={rates.electricityKwh}
                  onChange={e => update('electricityKwh', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/60" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Printer (W)</label>
                <input type="number" step="10" value={rates.printerWatts}
                  onChange={e => update('printerWatts', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/60" />
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">Filament weight estimated at ~1g/min if not recorded. Rates saved locally.</p>
          </div>

          {/* Top costly prints */}
          {withCost.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Most Expensive Prints</p>
              <div className="space-y-1.5">
                {withCost.map((e, i) => (
                  <div key={e.id || i} className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{e.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {e.cost.materialCost != null && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <Package className="w-2.5 h-2.5" />${e.cost.materialCost.toFixed(2)}
                          </span>
                        )}
                        {e.cost.elecCost != null && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" />${e.cost.elecCost.toFixed(2)}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />{e.duration_minutes}min
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">${e.cost.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}