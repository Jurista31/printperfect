import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = { success: '#34d399', partial: '#fbbf24', failure: '#f87171' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p style={{ color: payload[0].payload.fill }} className="font-semibold capitalize">
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  );
};

export default function OutcomePie({ data }) {
  if (!data?.length) return null;
  const pieData = data.filter(d => d.value > 0);
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
        Overall Outcome Breakdown
      </h2>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={150}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
              {pieData.map((entry, i) => (
                <Cell key={i} fill={COLORS[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2.5">
          {pieData.map(({ name, value }) => (
            <div key={name} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[name] || '#94a3b8' }} />
                {name}
              </span>
              <span className="text-xs font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}