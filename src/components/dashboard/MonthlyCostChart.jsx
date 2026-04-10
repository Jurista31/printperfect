import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-emerald-400 font-bold">${payload[0]?.value?.toFixed(2)} material</p>
      <p className="text-amber-400 font-semibold">${payload[1]?.value?.toFixed(2)} electricity</p>
    </div>
  );
};

export default function MonthlyCostChart({ data }) {
  if (!data || data.length === 0) return null;
  const hasData = data.some(d => d.materialCost > 0 || d.electricityCost > 0);
  if (!hasData) return null;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mt-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Monthly Cost Breakdown</p>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="materialCost" name="Material" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="electricityCost" name="Electricity" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 justify-center mt-2">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-[10px] text-slate-500">Material</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="text-[10px] text-slate-500">Electricity</span></div>
      </div>
    </div>
  );
}