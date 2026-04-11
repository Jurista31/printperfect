import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import { AlertTriangle, TrendingUp, Filter, X, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFECT_COLORS = [
  '#f87171','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#818cf8','#e879f9','#f472b6'
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function FilterChip({ label, value, onRemove }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-300">
      <span className="text-cyan-500 font-medium">{label}:</span> {value}
      <button onClick={onRemove} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
    </div>
  );
}

function InsightCard({ insight }) {
  const [open, setOpen] = useState(false);
  const sev = insight.strength === 'strong' ? 'text-red-400 bg-red-500/10 border-red-500/30'
    : insight.strength === 'moderate' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-slate-400 bg-slate-700/40 border-slate-600/40';
  return (
    <div className={cn('rounded-xl border overflow-hidden', sev)}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(!open)}>
        <Lightbulb className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium">{insight.headline}</span>
        <span className="text-xs opacity-60 mr-2">{insight.count}x</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs opacity-80 space-y-1 border-t border-current/20 pt-3">
          <p>{insight.detail}</p>
          {insight.suggestion && <p className="font-semibold mt-2">💡 {insight.suggestion}</p>}
        </div>
      )}
    </div>
  );
}

export default function DefectAnalytics() {
  const [filters, setFilters] = useState({ printer: '', material: '', layerHeight: '', speed: '' });
  const [activeFilters, setActiveFilters] = useState({});

  const { data: entries = [] } = useQuery({
    queryKey: ['journal_entries_analytics'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 200),
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses_analytics'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 200),
  });

  // Build combined dataset
  const combined = useMemo(() => {
    const analysisMap = Object.fromEntries(analyses.map(a => [a.id, a]));
    return entries.map(e => ({
      ...e,
      analysis: e.analysis_id ? analysisMap[e.analysis_id] : null,
    }));
  }, [entries, analyses]);

  // Filter options
  const printers = useMemo(() => [...new Set(combined.map(e => e.printer_model).filter(Boolean))], [combined]);
  const materials = useMemo(() => [...new Set(combined.map(e => e.filament_material).filter(Boolean))], [combined]);

  // Apply active filters
  const filtered = useMemo(() => combined.filter(e => {
    if (activeFilters.printer && e.printer_model !== activeFilters.printer) return false;
    if (activeFilters.material && e.filament_material !== activeFilters.material) return false;
    if (activeFilters.layerHeight) {
      const val = parseFloat(activeFilters.layerHeight);
      if (!e.layer_height || Math.abs(e.layer_height - val) > 0.05) return false;
    }
    if (activeFilters.speed) {
      const val = parseFloat(activeFilters.speed);
      if (!e.print_speed || Math.abs(e.print_speed - val) > 10) return false;
    }
    return true;
  }), [combined, activeFilters]);

  // Defect frequency total
  const defectFrequency = useMemo(() => {
    const counts = {};
    filtered.forEach(e => {
      e.analysis?.defects?.forEach(d => {
        counts[d.name] = (counts[d.name] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [filtered]);

  // Defect frequency over time (monthly buckets)
  const timelineData = useMemo(() => {
    const buckets = {};
    filtered.forEach(e => {
      if (!e.print_date) return;
      const month = e.print_date.slice(0, 7);
      if (!buckets[month]) buckets[month] = {};
      e.analysis?.defects?.forEach(d => {
        buckets[month][d.name] = (buckets[month][d.name] || 0) + 1;
      });
    });
    return Object.entries(buckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, defects]) => ({ month, ...defects }));
  }, [filtered]);

  const topDefects = defectFrequency.slice(0, 5).map(d => d.name);

  // Defect by material
  const byMaterial = useMemo(() => {
    const data = {};
    filtered.forEach(e => {
      const mat = e.filament_material || 'Unknown';
      if (!data[mat]) data[mat] = {};
      e.analysis?.defects?.forEach(d => {
        data[mat][d.name] = (data[mat][d.name] || 0) + 1;
      });
    });
    return Object.entries(data).map(([material, defects]) => ({
      material,
      total: Object.values(defects).reduce((s, v) => s + v, 0),
      ...defects,
    })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Defect by printer
  const byPrinter = useMemo(() => {
    const data = {};
    filtered.forEach(e => {
      const printer = e.printer_model || 'Unknown';
      if (!data[printer]) data[printer] = {};
      e.analysis?.defects?.forEach(d => {
        data[printer][d.name] = (data[printer][d.name] || 0) + 1;
      });
    });
    return Object.entries(data).map(([printer, defects]) => ({
      printer,
      total: Object.values(defects).reduce((s, v) => s + v, 0),
      ...defects,
    })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Root cause correlations / insights
  const insights = useMemo(() => {
    const results = [];
    // Material × defect correlations
    const matDefects = {};
    filtered.forEach(e => {
      const mat = e.filament_material;
      if (!mat) return;
      e.analysis?.defects?.forEach(d => {
        const key = `${mat}::${d.name}`;
        matDefects[key] = (matDefects[key] || 0) + 1;
      });
    });
    const matTotal = {};
    filtered.forEach(e => { if (e.filament_material) matTotal[e.filament_material] = (matTotal[e.filament_material] || 0) + 1; });

    Object.entries(matDefects).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([key, count]) => {
      const [mat, defect] = key.split('::');
      const total = matTotal[mat] || 1;
      const rate = Math.round((count / total) * 100);
      if (rate >= 30) {
        results.push({
          headline: `${mat} → "${defect}" (${rate}% of prints)`,
          detail: `${count} out of ${total} prints with ${mat} filament resulted in ${defect}.`,
          suggestion: `Check temperature profile and drying conditions for ${mat}.`,
          count, strength: rate >= 60 ? 'strong' : rate >= 40 ? 'moderate' : 'weak',
        });
      }
    });

    // Printer × defect correlations
    const printerDefects = {};
    const printerTotal = {};
    filtered.forEach(e => {
      const p = e.printer_model;
      if (!p) return;
      printerTotal[p] = (printerTotal[p] || 0) + 1;
      e.analysis?.defects?.forEach(d => {
        const key = `${p}::${d.name}`;
        printerDefects[key] = (printerDefects[key] || 0) + 1;
      });
    });
    Object.entries(printerDefects).sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([key, count]) => {
      const [printer, defect] = key.split('::');
      const total = printerTotal[printer] || 1;
      const rate = Math.round((count / total) * 100);
      if (rate >= 30 && count >= 2) {
        results.push({
          headline: `${printer} → "${defect}" (${rate}% of prints)`,
          detail: `${count} out of ${total} prints on ${printer} resulted in ${defect}.`,
          suggestion: `Consider calibrating ${printer} or adjusting its profile settings.`,
          count, strength: rate >= 60 ? 'strong' : rate >= 40 ? 'moderate' : 'weak',
        });
      }
    });

    // Speed correlation
    const highSpeedDefects = filtered.filter(e => e.print_speed > 80 && e.analysis?.defects?.length > 0);
    if (highSpeedDefects.length >= 2) {
      results.push({
        headline: `High print speed (>80mm/s) correlates with defects`,
        detail: `${highSpeedDefects.length} prints at >80mm/s had defects detected.`,
        suggestion: 'Try reducing print speed for problem materials.',
        count: highSpeedDefects.length, strength: 'moderate',
      });
    }

    return results.sort((a, b) => b.count - a.count);
  }, [filtered]);

  const applyFilter = (key) => {
    const val = filters[key];
    if (val) setActiveFilters(prev => ({ ...prev, [key]: val }));
  };

  const removeFilter = (key) => {
    setActiveFilters(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const hasData = filtered.length > 0 && defectFrequency.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white">Defect Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Identify root causes by correlating defects with settings</p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Filter Prints</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Printer</label>
              <select
                value={filters.printer}
                onChange={e => setFilters(f => ({ ...f, printer: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white appearance-none"
              >
                <option value="">All Printers</option>
                {printers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Material</label>
              <select
                value={filters.material}
                onChange={e => setFilters(f => ({ ...f, material: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white appearance-none"
              >
                <option value="">All Materials</option>
                {materials.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Layer Height (mm)</label>
              <input type="number" step="0.05" placeholder="e.g. 0.2"
                value={filters.layerHeight}
                onChange={e => setFilters(f => ({ ...f, layerHeight: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Print Speed (mm/s ±10)</label>
              <input type="number" placeholder="e.g. 60"
                value={filters.speed}
                onChange={e => setFilters(f => ({ ...f, speed: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['printer', 'material', 'layerHeight', 'speed'].map(k => filters[k] && (
              <button key={k} onClick={() => applyFilter(k)}
                className="text-xs px-3 py-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
                Apply {k === 'layerHeight' ? 'Layer' : k === 'speed' ? 'Speed' : k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
            {Object.keys(activeFilters).length > 0 && (
              <button onClick={() => setActiveFilters({})} className="text-xs px-3 py-1.5 rounded-full bg-slate-700 text-slate-300 hover:text-white">
                Clear All
              </button>
            )}
          </div>
          {Object.keys(activeFilters).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(activeFilters).map(([k, v]) => (
                <FilterChip key={k} label={k} value={v} onRemove={() => removeFilter(k)} />
              ))}
              <span className="text-xs text-slate-500 self-center">{filtered.length} prints matching</span>
            </div>
          )}
        </motion.div>

        {!hasData ? (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No defect data yet</p>
            <p className="text-slate-500 text-sm mt-1">Analyze some prints and log them in your journal to see analytics here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Root Cause Insights */}
            {insights.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Root Cause Correlations</h2>
                </div>
                {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
              </motion.div>
            )}

            {/* Defect Frequency Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-4">Most Frequent Defects</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={defectFrequency} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {defectFrequency.map((_, i) => (
                      <Cell key={i} fill={DEFECT_COLORS[i % DEFECT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Defects Over Time */}
            {timelineData.length >= 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-4">Defect Frequency Over Time</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                    {topDefects.map((name, i) => (
                      <Line key={name} type="monotone" dataKey={name} stroke={DEFECT_COLORS[i]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Defects by Material */}
            {byMaterial.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-4">Defects by Material</h2>
                <ResponsiveContainer width="100%" height={Math.max(180, byMaterial.length * 50)}>
                  <BarChart data={byMaterial} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="material" tick={{ fill: '#94a3b8', fontSize: 11 }} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                    {topDefects.map((name, i) => (
                      <Bar key={name} dataKey={name} stackId="a" fill={DEFECT_COLORS[i]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Defects by Printer */}
            {byPrinter.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-4">Defects by Printer</h2>
                <ResponsiveContainer width="100%" height={Math.max(180, byPrinter.length * 50)}>
                  <BarChart data={byPrinter} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="printer" tick={{ fill: '#94a3b8', fontSize: 10 }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
                    {topDefects.map((name, i) => (
                      <Bar key={name} dataKey={name} stackId="a" fill={DEFECT_COLORS[i]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Summary Stats */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3">
              {[
                { label: 'Prints Analyzed', value: filtered.length },
                { label: 'Unique Defects', value: defectFrequency.length },
                { label: 'Total Defects', value: defectFrequency.reduce((s, d) => s + d.count, 0) },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}