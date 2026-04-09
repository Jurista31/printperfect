import React, { useState, useMemo } from 'react';
import { Zap, DollarSign, Flame, Settings2, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

// ─── Power model ──────────────────────────────────────────────────────────────
// Estimates wattage from print settings
function estimateWatts(entry) {
  const bedTemp = entry.bed_temp || 0;
  const nozzleTemp = entry.nozzle_temp || 200;
  // Heated bed: scales roughly 0W (no bed) to ~200W (110°C bed)
  const bedWatts = bedTemp > 0 ? 60 + (bedTemp / 110) * 130 : 0;
  // Hotend heater: ~25W base + extra for high temps
  const hotendWatts = 25 + Math.max(0, (nozzleTemp - 200) / 60) * 15;
  // Steppers + board + fans constant
  const baseWatts = 45;
  return Math.round(bedWatts + hotendWatts + baseWatts);
}

function estimateKwh(entry) {
  if (!entry.duration_minutes) return null;
  const watts = estimateWatts(entry);
  return parseFloat(((watts * entry.duration_minutes) / 60 / 1000).toFixed(3));
}

const COLORS = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#fb923c', '#fbbf24'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color || '#94a3b8' }}>
          {p.name}: <span className="font-semibold">{p.value}{p.unit || ''}</span>
        </p>
      ))}
    </div>
  );
}

export default function EnergyMonitoringPanel({ entries }) {
  const [ratePerKwh, setRatePerKwh] = useState(0.13); // $/kWh
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState('0.13');

  const printsWithEnergy = useMemo(() => {
    return entries
      .filter(e => e.duration_minutes)
      .map(e => ({
        ...e,
        watts: estimateWatts(e),
        kwh: estimateKwh(e),
        cost: parseFloat((estimateKwh(e) * ratePerKwh).toFixed(4)),
      }))
      .sort((a, b) => (b.kwh || 0) - (a.kwh || 0));
  }, [entries, ratePerKwh]);

  const stats = useMemo(() => {
    if (!printsWithEnergy.length) return null;
    const totalKwh = printsWithEnergy.reduce((s, e) => s + (e.kwh || 0), 0);
    const totalCost = printsWithEnergy.reduce((s, e) => s + (e.cost || 0), 0);
    const avgKwh = totalKwh / printsWithEnergy.length;
    const avgCost = totalCost / printsWithEnergy.length;
    const maxEntry = printsWithEnergy[0];
    return { totalKwh, totalCost, avgKwh, avgCost, maxEntry, count: printsWithEnergy.length };
  }, [printsWithEnergy]);

  // Cost by material
  const byCost = useMemo(() => {
    const map = {};
    printsWithEnergy.forEach(e => {
      const k = e.filament_material || 'Unknown';
      if (!map[k]) map[k] = { material: k, kwh: 0, cost: 0, count: 0 };
      map[k].kwh += e.kwh || 0;
      map[k].cost += e.cost || 0;
      map[k].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.cost - a.cost)
      .map(m => ({ ...m, kwh: parseFloat(m.kwh.toFixed(2)), cost: parseFloat(m.cost.toFixed(2)), avgCost: parseFloat((m.cost / m.count).toFixed(3)) }));
  }, [printsWithEnergy]);

  // Cost by printer
  const byPrinter = useMemo(() => {
    const map = {};
    printsWithEnergy.forEach(e => {
      const k = e.printer_model || 'Unknown';
      if (!map[k]) map[k] = { printer: k, kwh: 0, cost: 0, count: 0 };
      map[k].kwh += e.kwh || 0;
      map[k].cost += e.cost || 0;
      map[k].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.cost - a.cost)
      .map(p => ({ ...p, kwh: parseFloat(p.kwh.toFixed(2)), cost: parseFloat(p.cost.toFixed(2)), avgCost: parseFloat((p.cost / p.count).toFixed(3)) }));
  }, [printsWithEnergy]);

  // Power-hungry profiles: top 5 by watts
  const powerHungry = useMemo(() => {
    return [...printsWithEnergy].sort((a, b) => b.watts - a.watts).slice(0, 5);
  }, [printsWithEnergy]);

  if (entries.filter(e => e.duration_minutes).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Zap className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-sm font-semibold text-white">No duration data yet</p>
        <p className="text-xs text-slate-500 mt-1">Log print duration in your Journal to enable energy estimates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + rate setting */}
      <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Energy Monitor</h3>
              <p className="text-xs text-slate-400 mt-0.5">Estimates power usage from bed temp, nozzle temp, and print duration.</p>
            </div>
          </div>
          {/* Rate editor */}
          <div className="flex-shrink-0">
            {editingRate ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tempRate}
                  onChange={e => setTempRate(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
                <span className="text-xs text-slate-400">/kWh</span>
                <button
                  onClick={() => { setRatePerKwh(parseFloat(tempRate) || 0.13); setEditingRate(false); }}
                  className="text-[10px] font-semibold text-yellow-400 hover:text-yellow-300"
                >Save</button>
              </div>
            ) : (
              <button
                onClick={() => { setTempRate(ratePerKwh.toString()); setEditingRate(true); }}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-300 bg-slate-700/50 border border-slate-600/40 rounded-lg px-2 py-1"
              >
                <Settings2 className="w-2.5 h-2.5" />
                ${ratePerKwh}/kWh
              </button>
            )}
          </div>
        </div>

        {/* Summary pills */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { label: 'Total Energy', value: `${stats.totalKwh.toFixed(2)} kWh`, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
              { label: 'Total Cost', value: `$${stats.totalCost.toFixed(2)}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              { label: 'Avg / Print', value: `${stats.avgKwh.toFixed(3)} kWh`, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
              { label: 'Avg Cost', value: `$${stats.avgCost.toFixed(3)}`, icon: DollarSign, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-xl border p-3 flex items-center gap-2.5', s.bg)}>
                <s.icon className={cn('w-4 h-4 flex-shrink-0', s.color)} />
                <div>
                  <p className={cn('text-sm font-bold', s.color)}>{s.value}</p>
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost by material */}
      {byCost.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-orange-400" /> Cost by Material
          </h4>
          <ResponsiveContainer width="100%" height={byCost.length * 36 + 20}>
            <BarChart data={byCost} layout="vertical" barSize={14} margin={{ left: 0, right: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis dataKey="material" type="category" width={56} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} formatter={v => [`$${v}`, 'Total Cost']} />
              <Bar dataKey="cost" name="Total Cost" radius={[0, 4, 4, 0]}>
                {byCost.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1">
            {byCost.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{m.material}</span>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-slate-500">{m.kwh} kWh · {m.count} prints</span>
                  <span className="text-slate-300 font-semibold w-16 text-right">${m.avgCost}/part avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost by printer */}
      {byPrinter.length > 1 && (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-green-400" /> Cost by Printer
          </h4>
          <div className="space-y-2">
            {byPrinter.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300 truncate">{p.printer}</span>
                    <span className="text-xs font-semibold text-green-400 ml-2 flex-shrink-0">${p.cost.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-cyan-500"
                      style={{ width: `${Math.min(100, (p.cost / byPrinter[0].cost) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-slate-500">{p.kwh} kWh</p>
                  <p className="text-[10px] text-slate-500">${p.avgCost}/part</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Power-hungry profiles */}
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Most Power-Hungry Prints
        </h4>
        <div className="space-y-2">
          {powerHungry.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 bg-slate-700/30 rounded-xl px-3 py-2.5">
              <span className="text-[10px] font-bold text-slate-600 w-4 flex-shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{e.title}</p>
                <p className="text-[10px] text-slate-500">
                  {e.printer_model || 'Unknown'} · {e.filament_material || '?'} · {e.duration_minutes}min
                </p>
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
                <p className="text-xs font-bold text-red-400">{e.watts}W</p>
                <p className="text-[10px] text-yellow-400">{e.kwh} kWh</p>
                <p className="text-[10px] text-green-400">${e.cost}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-3">
          * Estimates based on bed temp, nozzle temp, and duration. Actual usage varies by printer hardware.
        </p>
      </div>
    </div>
  );
}