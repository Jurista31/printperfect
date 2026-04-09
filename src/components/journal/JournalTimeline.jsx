import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const OUTCOME_CONFIG = {
  success: { color: 'bg-green-400', dot: 'bg-green-400', border: 'border-green-500/40', label: 'Success', icon: CheckCircle2, textColor: 'text-green-400' },
  partial: { color: 'bg-amber-400', dot: 'bg-amber-400', border: 'border-amber-500/40', label: 'Partial', icon: AlertCircle, textColor: 'text-amber-400' },
  failure: { color: 'bg-red-400', dot: 'bg-red-400', border: 'border-red-500/40', label: 'Failure', icon: XCircle, textColor: 'text-red-400' },
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarMonth({ year, month, entries, onDayClick, selectedDay }) {
  const firstDay = startOfMonth(new Date(year, month, 1));
  const lastDay = endOfMonth(firstDay);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startPad = getDay(firstDay);

  const entriesByDay = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!e.print_date) return;
      const key = e.print_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs text-slate-600 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEntries = entriesByDay[key] || [];
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={key}
              onClick={() => onDayClick(dayEntries.length > 0 ? day : null)}
              className={cn(
                "relative flex flex-col items-center justify-start py-1 rounded-lg transition-all min-h-[38px]",
                dayEntries.length > 0 ? 'hover:bg-slate-700/60 cursor-pointer' : 'cursor-default',
                isSelected && 'bg-slate-700/80 ring-1 ring-cyan-500/50',
                isToday && !isSelected && 'ring-1 ring-slate-600'
              )}
            >
              <span className={cn(
                "text-xs font-medium",
                isToday ? 'text-cyan-400 font-bold' : dayEntries.length > 0 ? 'text-white' : 'text-slate-600'
              )}>{format(day, 'd')}</span>
              {dayEntries.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {dayEntries.slice(0, 3).map((e, i) => (
                    <span key={i} className={cn("w-1.5 h-1.5 rounded-full", OUTCOME_CONFIG[e.outcome]?.dot || 'bg-slate-400')} />
                  ))}
                  {dayEntries.length > 3 && <span className="text-xs text-slate-500">+{dayEntries.length - 3}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimelineList({ entries, onEdit, onDelete }) {
  return (
    <div className="space-y-3">
      {entries.map((entry, i) => {
        const cfg = OUTCOME_CONFIG[entry.outcome] || OUTCOME_CONFIG.success;
        const Icon = cfg.icon;
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn("bg-slate-800/60 border rounded-xl p-4 flex gap-3", cfg.border)}
          >
            {entry.image_url ? (
              <img src={entry.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
            ) : entry.video_url ? (
              <video src={entry.video_url} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-black" muted playsInline />
            ) : (
              <div className={cn("w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-700/50")}>
                <Icon className={cn("w-6 h-6", cfg.textColor)} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white truncate">{entry.title}</p>
                <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                  entry.outcome === 'success' ? 'bg-green-500/20 text-green-300' :
                  entry.outcome === 'failure' ? 'bg-red-500/20 text-red-300' :
                  'bg-amber-500/20 text-amber-300'
                )}>{cfg.label}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {entry.print_date && <span className="text-xs text-slate-500">{format(parseISO(entry.print_date), 'MMM d, yyyy')}</span>}
                {entry.printer_model && <span className="text-xs text-slate-500">{entry.printer_model}</span>}
                {entry.filament_material && <span className="text-xs text-slate-500">{entry.filament_material}{entry.filament_color ? ` · ${entry.filament_color}` : ''}</span>}
                {entry.duration_minutes && (
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{entry.duration_minutes}m</span>
                )}
              </div>
              {entry.notes && <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{entry.notes}</p>}
              {entry.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {entry.tags.map(t => (
                    <span key={t} className="text-xs bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button onClick={() => onEdit(entry)} className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">Edit</button>
                <button onClick={() => onDelete(entry.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function JournalTimeline({ entries, onEdit, onDelete }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [selectedDay, setSelectedDay] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthEntries = entries.filter(e => {
    if (!e.print_date) return false;
    const d = parseISO(e.print_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const selectedEntries = selectedDay
    ? entries.filter(e => e.print_date && isSameDay(parseISO(e.print_date), selectedDay))
    : monthEntries;

  const successCount = monthEntries.filter(e => e.outcome === 'success').length;
  const failCount = monthEntries.filter(e => e.outcome === 'failure').length;
  const partialCount = monthEntries.filter(e => e.outcome === 'partial').length;

  return (
    <div className="space-y-5">
      {/* Calendar header */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <button onClick={() => { setViewDate(subMonths(viewDate, 1)); setSelectedDay(null); }} className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{format(viewDate, 'MMMM yyyy')}</p>
            {monthEntries.length > 0 && (
              <div className="flex items-center justify-center gap-3 mt-0.5">
                {successCount > 0 && <span className="text-xs text-green-400">{successCount} ✅</span>}
                {partialCount > 0 && <span className="text-xs text-amber-400">{partialCount} ⚠️</span>}
                {failCount > 0 && <span className="text-xs text-red-400">{failCount} ❌</span>}
              </div>
            )}
          </div>
          <button onClick={() => { setViewDate(addMonths(viewDate, 1)); setSelectedDay(null); }} className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3">
          <CalendarMonth year={year} month={month} entries={entries} onDayClick={setSelectedDay} selectedDay={selectedDay} />
        </div>

        {/* Legend */}
        <div className="px-4 pb-3 flex gap-4">
          {Object.entries(OUTCOME_CONFIG).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={cn("w-2 h-2 rounded-full", v.dot)} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      {/* List */}
      {selectedDay && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-300">
            {format(selectedDay, 'MMMM d')} — {selectedEntries.length} {selectedEntries.length === 1 ? 'print' : 'prints'}
          </p>
          <button onClick={() => setSelectedDay(null)} className="text-xs text-slate-500 hover:text-slate-300">Show all</button>
        </div>
      )}

      {selectedEntries.length > 0 ? (
        <TimelineList entries={selectedEntries} onEdit={onEdit} onDelete={onDelete} />
      ) : (
        <div className="text-center py-8 text-slate-600 text-sm">
          {selectedDay ? 'No prints logged on this day.' : 'No prints logged this month.'}
        </div>
      )}
    </div>
  );
}