import React from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="leading-relaxed">
          {p.name}: <span className="font-bold">{p.value}{p.name === 'Success Rate' ? '%' : ' min'}</span>
        </p>
      ))}
    </div>
  );
};

export default function PerformanceOverTime({ data }) {
  if (!data || data.length < 2) return null;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-teal-400" />
        Performance Over Time
      </h2>
      <p className="text-xs text-slate-500 mb-4">Monthly success rate & avg print duration — tracks calibration progress</p>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ left: -8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          {/* Left axis: duration */}
          <YAxis
            yAxisId="dur"
            orientation="left"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}m`}
          />
          {/* Right axis: success rate */}
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
          />
          <Bar
            yAxisId="dur"
            dataKey="avgDuration"
            name="Avg Duration"
            fill="#6366f1"
            fillOpacity={0.5}
            radius={[3, 3, 0, 0]}
            barSize={18}
          />
          <Line
            yAxisId="rate"
            dataKey="successRate"
            name="Success Rate"
            stroke="#2dd4bf"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#2dd4bf', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* trend insight */}
      {data.length >= 3 && (() => {
        const first = data[0].successRate;
        const last = data[data.length - 1].successRate;
        const delta = last - first;
        if (delta === 0) return null;
        return (
          <div className={`mt-3 rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${delta > 0 ? 'bg-teal-500/10 border border-teal-500/20 text-teal-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
            Success rate {delta > 0 ? 'improved' : 'declined'} by <span className="font-bold mx-1">{Math.abs(delta)}%</span> over {data.length} months
          </div>
        );
      })()}
    </div>
  );
}