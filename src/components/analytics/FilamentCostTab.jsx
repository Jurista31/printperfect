import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { DollarSign, Package, Settings2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// A standard 1kg spool is ~330m for PLA (1.75mm). We estimate grams used from duration.
// Average FDM print uses ~10g/hour at moderate settings. We use that as a default estimate.
const GRAMS_PER_MINUTE = 10 / 60; // ~0.167 g/min
const GRAMS_PER_SPOOL = 1000; // 1 kg spool

const PALETTE = ['#22d3ee', '#818cf8', '#34d399', '#fb923c', '#f472b6', '#a78bfa', '#fbbf24', '#f87171'];

const MATERIAL_DEFAULTS = {
  PLA:   20,
  PETG:  22,
  ABS:   22,
  ASA:   25,
  TPU:   30,
  Nylon: 35,
  Resin: 40,
  Other: 22,
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#94a3b8' }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function FilamentCostTab({ entries }) {
  // Per-material price per spool (user-editable)
  const [pricesPerSpool, setPricesPerSpool] = useState(() => {
    try {
      const saved = localStorage.getItem('filament_spool_prices');
      return saved ? JSON.parse(saved) : { ...MATERIAL_DEFAULTS };
    } catch {
      return { ...MATERIAL_DEFAULTS };
    }
  });
  const [editingMat, setEditingMat] = useState(null);
  const [editVal, setEditVal] = useState('');

  const savePrice = (mat) => {
    const num = parseFloat(editVal);
    if (!isNaN(num) && num > 0) {
      const updated = { ...pricesPerSpool, [mat]: num };
      setPricesPerSpool(updated);
      localStorage.setItem('filament_spool_prices', JSON.stringify(updated));
    }
    setEditingMat(null);
  };

  // Aggregate filament usage per material from duration_minutes
  const materialData = useMemo(() => {
    const byMat = {};
    entries.forEach(e => {
      const mat = e.filament_material || 'Other';
      if (!byMat[mat]) byMat[mat] = { material: mat, totalMinutes: 0, printCount: 0 };
      byMat[mat].printCount++;
      if (e.duration_minutes) byMat[mat].totalMinutes += e.duration_minutes;
    });

    return Object.values(byMat)
      .map(m => {
        const estimatedGrams = Math.round(m.totalMinutes * GRAMS_PER_MINUTE);
        const spoolsUsed = estimatedGrams / GRAMS_PER_SPOOL;
        const pricePerSpool = pricesPerSpool[m.material] ?? pricesPerSpool['Other'] ?? 22;
        const estimatedCost = spoolsUsed * pricePerSpool;
        return {
          ...m,
          estimatedGrams,
          spoolsUsed: Math.round(spoolsUsed * 100) / 100,
          estimatedCost: Math.round(estimatedCost * 100) / 100,
          pricePerSpool,
        };
      })
      .sort((a, b) => b.estimatedCost - a.estimatedCost);
  }, [entries, pricesPerSpool]);

  const totalCost = materialData.reduce((s, m) => s + m.estimatedCost, 0);
  const totalGrams = materialData.reduce((s, m) => s + m.estimatedGrams, 0);
  const totalMinutes = entries.filter(e => e.duration_minutes).reduce((s, e) => s + e.duration_minutes, 0);
  const hasAnyDuration = totalMinutes > 0;

  const uniqueMaterials = [...new Set(entries.map(e => e.filament_material || 'Other'))];

  return (
    <div>
      {/* Info banner */}
      <div className="flex gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 mb-5">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Filament usage is estimated from logged print duration (~10 g/hr average). 
          Set your actual price-per-spool below for accurate cost tracking.
        </p>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">${totalCost.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Est. Total Cost</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{totalGrams}g</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Est. Filament Used</p>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-cyan-400">{(totalGrams / GRAMS_PER_SPOOL).toFixed(2)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Spools Used</p>
        </div>
      </div>

      {!hasAnyDuration ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center mb-5">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-semibold">No duration data logged</p>
          <p className="text-slate-500 text-xs mt-1">Add print duration when logging prints to estimate filament usage.</p>
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Estimated Cost by Material
            </h2>
            <ResponsiveContainer width="100%" height={materialData.length * 44 + 20}>
              <BarChart data={materialData} layout="vertical" barSize={16} margin={{ left: 0, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <YAxis dataKey="material" type="category" width={56} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(v, name) => [`$${v}`, 'Est. Cost']}
                />
                <Bar dataKey="estimatedCost" name="Est. Cost" radius={[0, 4, 4, 0]}>
                  {materialData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              Usage Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700/50">
                    <th className="text-left pb-2 font-medium">Material</th>
                    <th className="text-center pb-2">Prints</th>
                    <th className="text-center pb-2">Est. g</th>
                    <th className="text-center pb-2">Spools</th>
                    <th className="text-right pb-2 text-emerald-400">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {materialData.map((m, i) => (
                    <tr key={i}>
                      <td className="py-2 text-slate-300 font-medium">{m.material}</td>
                      <td className="py-2 text-center text-slate-400">{m.printCount}</td>
                      <td className="py-2 text-center text-slate-400">{m.estimatedGrams}g</td>
                      <td className="py-2 text-center text-slate-400">{m.spoolsUsed}</td>
                      <td className="py-2 text-right text-emerald-400 font-bold">${m.estimatedCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-600/50">
                    <td className="pt-2 text-slate-300 font-semibold">Total</td>
                    <td className="pt-2 text-center text-slate-400">{entries.length}</td>
                    <td className="pt-2 text-center text-slate-400">{totalGrams}g</td>
                    <td className="pt-2 text-center text-slate-400">{(totalGrams / 1000).toFixed(2)}</td>
                    <td className="pt-2 text-right text-emerald-400 font-bold">${totalCost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Price-per-spool settings */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-400" />
          Price Per Spool (1 kg)
        </h2>
        <p className="text-xs text-slate-500 mb-4">Tap any value to edit. Saved locally in your browser.</p>
        <div className="grid grid-cols-2 gap-2">
          {uniqueMaterials.map(mat => (
            <div key={mat} className="flex items-center justify-between bg-slate-700/40 border border-slate-600/40 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-300 font-medium">{mat}</span>
              {editingMat === mat ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">$</span>
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    step="0.5"
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={() => savePrice(mat)}
                    onKeyDown={e => { if (e.key === 'Enter') savePrice(mat); if (e.key === 'Escape') setEditingMat(null); }}
                    className="w-16 bg-slate-800 border border-cyan-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setEditingMat(mat); setEditVal(String(pricesPerSpool[mat] ?? MATERIAL_DEFAULTS[mat] ?? 22)); }}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  ${pricesPerSpool[mat] ?? MATERIAL_DEFAULTS[mat] ?? 22}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}