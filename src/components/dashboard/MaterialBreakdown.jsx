import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#22d3ee', '#818cf8', '#fb923c', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#f87171'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function MaterialBreakdown({ data }) {
  if (!data?.length) return null;
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
        Prints by Material
      </h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="material" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Prints" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}