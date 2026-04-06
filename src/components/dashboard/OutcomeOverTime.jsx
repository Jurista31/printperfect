import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const OUTCOME_COLORS = { success: '#34d399', partial: '#fbbf24', failure: '#f87171' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-semibold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function OutcomeOverTime({ data }) {
  if (!data?.length) return null;
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        Outcomes Over Time
      </h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="success" stackId="a" fill={OUTCOME_COLORS.success} name="Success" />
          <Bar dataKey="partial" stackId="a" fill={OUTCOME_COLORS.partial} name="Partial" />
          <Bar dataKey="failure" stackId="a" fill={OUTCOME_COLORS.failure} radius={[3, 3, 0, 0]} name="Failure" />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        {Object.entries(OUTCOME_COLORS).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-400 capitalize">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}