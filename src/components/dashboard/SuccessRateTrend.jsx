import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke }}>{p.name}: <span className="font-semibold">{p.value}%</span></p>
      ))}
    </div>
  );
};

export default function SuccessRateTrend({ data }) {
  if (!data?.length) return null;
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
        Rolling Success Rate (monthly)
      </h2>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
          <ReferenceLine y={80} stroke="#34d39933" strokeDasharray="4 4" />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="successRate" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 3 }} name="Success Rate" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}