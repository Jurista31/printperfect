import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const OUTCOMES = ['success', 'partial', 'failure'];
const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Other'];

const OUTCOME_STYLE = {
  success: { on: 'bg-green-500/20 border-green-500/50 text-green-300', off: 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-300' },
  partial: { on: 'bg-amber-500/20 border-amber-500/50 text-amber-300', off: 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-300' },
  failure: { on: 'bg-red-500/20 border-red-500/50 text-red-300', off: 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-300' },
};

export const EMPTY_FILTERS = {
  keyword: '',
  outcomes: [],
  material: '',
  printer: '',
  dateFrom: '',
  dateTo: '',
  tag: '',
};

export function applyFilters(entries, filters) {
  const kw = filters.keyword.toLowerCase().trim();
  return entries.filter(e => {
    if (kw && !e.title?.toLowerCase().includes(kw) && !e.notes?.toLowerCase().includes(kw)) return false;
    if (filters.outcomes.length > 0 && !filters.outcomes.includes(e.outcome)) return false;
    if (filters.material && e.filament_material !== filters.material) return false;
    if (filters.printer && !e.printer_model?.toLowerCase().includes(filters.printer.toLowerCase())) return false;
    if (filters.dateFrom && e.print_date && e.print_date < filters.dateFrom) return false;
    if (filters.dateTo && e.print_date && e.print_date > filters.dateTo) return false;
    if (filters.tag) {
      const t = filters.tag.toLowerCase();
      if (!e.tags?.some(tag => tag.toLowerCase().includes(t))) return false;
    }
    return true;
  });
}

export default function JournalSearch({ filters, onChange, totalCount, filteredCount }) {
  const [open, setOpen] = useState(false);

  const set = (k, v) => onChange({ ...filters, [k]: v });

  const toggleOutcome = (o) => {
    const next = filters.outcomes.includes(o)
      ? filters.outcomes.filter(x => x !== o)
      : [...filters.outcomes, o];
    set('outcomes', next);
  };

  const activeCount = [
    filters.outcomes.length > 0,
    !!filters.material,
    !!filters.printer,
    !!filters.dateFrom || !!filters.dateTo,
    !!filters.tag,
  ].filter(Boolean).length;

  const isFiltered = !!filters.keyword || activeCount > 0;

  return (
    <div className="space-y-2 mb-4">
      {/* Search bar + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={filters.keyword}
            onChange={e => set('keyword', e.target.value)}
            placeholder="Search titles, notes…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors"
          />
          {filters.keyword && (
            <button onClick={() => set('keyword', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
            open || activeCount > 0
              ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[10px] flex items-center justify-center">{activeCount}</span>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Filter panel */}
      {open && (
        <div className="bg-slate-800/70 border border-slate-700/50 rounded-xl p-4 space-y-4">
          {/* Outcome */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Outcome</p>
            <div className="flex gap-2">
              {OUTCOMES.map(o => (
                <button
                  key={o}
                  onClick={() => toggleOutcome(o)}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded-lg border capitalize transition-all',
                    filters.outcomes.includes(o) ? OUTCOME_STYLE[o].on : OUTCOME_STYLE[o].off
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Material */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Material</p>
            <select
              value={filters.material}
              onChange={e => set('material', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
            >
              <option value="">Any material</option>
              {MATERIALS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {/* Printer */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Printer Model</p>
            <input
              value={filters.printer}
              onChange={e => set('printer', e.target.value)}
              placeholder="e.g. Ender 3"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>

          {/* Date range */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Date Range</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600 block mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => set('dateFrom', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => set('dateTo', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
                />
              </div>
            </div>
          </div>

          {/* Tag */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tag</p>
            <input
              value={filters.tag}
              onChange={e => set('tag', e.target.value)}
              placeholder="Filter by tag…"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
          </div>

          {/* Reset */}
          {isFiltered && (
            <button
              onClick={() => onChange(EMPTY_FILTERS)}
              className="w-full text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center justify-center gap-1 pt-1"
            >
              <X className="w-3.5 h-3.5" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Result count */}
      {isFiltered && (
        <p className="text-xs text-slate-500 px-1">
          Showing <span className="text-teal-400 font-semibold">{filteredCount}</span> of {totalCount} entries
        </p>
      )}
    </div>
  );
}