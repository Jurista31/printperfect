import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis
} from 'recharts';

const OUTCOME_COLORS = { success: '#34d399', partial: '#fbbf24', failure: '#f87171' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-lg">
      <p className="text-slate-300 font-medium mb-1 capitalize">{d.outcome}</p>
      <p className="text-slate-400">Nozzle: <span className="text-white">{d.x}°C</span></p>
      <p className="text-slate-400">Speed: <span className="text-white">{d.y} mm/s</span></p>
    </div>
  );
};

export default function PerformanceMetrics({ data }) {
  if (!data?.length) return null;

  const byOutcome = ['success', 'partial', 'failure'].map(outcome => ({
    outcome,
    points: data.filter(d => d.outcome === outcome),
  })).filter(g => g.points.length > 0);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
        Temp vs Speed by Outcome
      </h2>
      <p className="text-xs text-slate-500 mb-4">Nozzle °C (x-axis) vs print speed mm/s (y-axis)</p>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="x" name="Nozzle Temp" type="number" domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: '°C', position: 'insideRight', offset: 4, fill: '#64748b', fontSize: 10 }} />
          <YAxis dataKey="y" name="Speed" type="number" domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <ZAxis range={[40, 40]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          {byOutcome.map(({ outcome, points }) => (
            <Scatter
              key={outcome}
              name={outcome}
              data={points}
              fill={OUTCOME_COLORS[outcome]}
              opacity={0.8}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        {Object.entries(OUTCOME_COLORS).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-400 capitalize">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}