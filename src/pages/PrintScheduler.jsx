import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, FileCode, Clock, CheckCircle2, AlertTriangle, XCircle, Loader2, Trash2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import ScheduleForm from '@/components/scheduler/ScheduleForm';

const STATUS_CFG = {
  queued:      { color: 'text-cyan-400',  bg: 'bg-cyan-500/15 border-cyan-500/30',  icon: Clock },
  in_progress: { color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', icon: Play },
  completed:   { color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', icon: CheckCircle2 },
  cancelled:   { color: 'text-slate-500', bg: 'bg-slate-700/30 border-slate-600/30', icon: XCircle },
};

const VAL_ICON = { passed: CheckCircle2, warnings: AlertTriangle, failed: XCircle, pending: Clock, validating: Loader2 };
const VAL_COLOR = { passed: 'text-green-400', warnings: 'text-amber-400', failed: 'text-red-400', pending: 'text-slate-500', validating: 'text-cyan-400' };

function CalendarGrid({ month, schedules, onDayClick, selectedDay }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDow = startOfMonth(month).getDay();
  const blanks = Array(firstDow).fill(null);

  const schedulesByDay = useMemo(() => {
    const map = {};
    schedules.forEach(s => {
      if (!s.scheduled_date) return;
      const key = s.scheduled_date;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [schedules]);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-700/50">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-slate-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {blanks.map((_, i) => <div key={`b${i}`} className="h-12 border-r border-b border-slate-700/20 last:border-r-0" />)}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const daySchedules = schedulesByDay[key] || [];
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const today = isToday(day);
          return (
            <button key={key} onClick={() => onDayClick(day)}
              className={cn(
                'h-12 border-r border-b border-slate-700/20 last:border-r-0 flex flex-col items-center pt-1.5 gap-0.5 transition-colors relative',
                isSelected ? 'bg-cyan-500/15' : 'hover:bg-slate-700/30',
                today && !isSelected && 'bg-slate-700/20'
              )}>
              <span className={cn('text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
                today ? 'bg-cyan-500 text-white' : 'text-slate-400')}>
                {format(day, 'd')}
              </span>
              {daySchedules.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center px-0.5">
                  {daySchedules.slice(0, 3).map((s, i) => (
                    <div key={i} className={cn('w-1.5 h-1.5 rounded-full',
                      s.status === 'completed' ? 'bg-green-400' :
                      s.status === 'cancelled' ? 'bg-slate-600' :
                      s.validation_status === 'failed' ? 'bg-red-400' : 'bg-cyan-400'
                    )} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleCard({ schedule, onStatusChange, onDelete }) {
  const cfg = STATUS_CFG[schedule.status] || STATUS_CFG.queued;
  const StatusIcon = cfg.icon;
  const ValIcon = VAL_ICON[schedule.validation_status] || Clock;
  const [deleting, setDeleting] = useState(false);

  return (
    <div className={cn('rounded-xl border p-3 space-y-2', cfg.bg)}>
      <div className="flex items-start gap-2">
        <StatusIcon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{schedule.title}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {schedule.scheduled_time && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{schedule.scheduled_time}</span>}
            {schedule.estimated_duration_minutes && <span className="text-xs text-slate-500">{schedule.estimated_duration_minutes}min</span>}
            {schedule.filament_material && <span className="text-xs text-slate-500">{schedule.filament_material}</span>}
            {schedule.printer_model && <span className="text-xs text-slate-500">{schedule.printer_model}</span>}
          </div>
        </div>
        <button onClick={async () => { setDeleting(true); await onDelete(schedule.id); }}
          className="text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-0.5">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* G-Code validation badge */}
      {schedule.gcode_filename && (
        <div className="flex items-center gap-1.5 text-xs">
          <FileCode className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 truncate flex-1">{schedule.gcode_filename}</span>
          <ValIcon className={cn('w-3.5 h-3.5 shrink-0', VAL_COLOR[schedule.validation_status])} />
        </div>
      )}

      {/* Status buttons */}
      {schedule.status === 'queued' && (
        <div className="flex gap-1.5">
          <button onClick={() => onStatusChange(schedule.id, 'in_progress')}
            className="flex-1 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors">
            Start
          </button>
          <button onClick={() => onStatusChange(schedule.id, 'cancelled')}
            className="flex-1 py-1 rounded-lg bg-slate-700/50 border border-slate-600/30 text-slate-400 text-xs font-medium hover:bg-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      )}
      {schedule.status === 'in_progress' && (
        <button onClick={() => onStatusChange(schedule.id, 'completed')}
          className="w-full py-1 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-colors">
          Mark Complete
        </button>
      )}
      {schedule.notes && <p className="text-xs text-slate-500 italic">{schedule.notes}</p>}
    </div>
  );
}

export default function PrintScheduler() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['print-schedules'],
    queryFn: () => base44.entities.PrintSchedule.list('-scheduled_date', 200),
  });

  const monthSchedules = useMemo(() => {
    const mStr = format(month, 'yyyy-MM');
    return schedules.filter(s => s.scheduled_date?.startsWith(mStr));
  }, [schedules, month]);

  const daySchedules = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return schedules.filter(s => s.scheduled_date === key)
      .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));
  }, [schedules, selectedDay]);

  const upcomingQueued = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return schedules.filter(s => s.status === 'queued' && s.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [schedules]);

  const handleStatusChange = async (id, status) => {
    await base44.entities.PrintSchedule.update(id, { status });
    qc.invalidateQueries(['print-schedules']);
  };

  const handleDelete = async (id) => {
    await base44.entities.PrintSchedule.delete(id);
    qc.invalidateQueries(['print-schedules']);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-teal-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Print Scheduler</h1>
              <p className="text-xs text-slate-500">{upcomingQueued.length} print{upcomingQueued.length !== 1 ? 's' : ''} queued</p>
            </div>
          </div>
          <button onClick={() => { setShowForm(true); setSelectedDay(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Schedule
          </button>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4">
              <ScheduleForm
                defaultDate={selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                onSave={() => { setShowForm(false); qc.invalidateQueries(['print-schedules']); }}
                onCancel={() => setShowForm(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Month nav */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-white">{format(month, 'MMMM yyyy')}</p>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Calendar */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <CalendarGrid month={month} schedules={monthSchedules} selectedDay={selectedDay}
            onDayClick={d => { setSelectedDay(prev => prev && isSameDay(prev, d) ? null : d); }} />
        </motion.div>

        {/* Day detail */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">{format(selectedDay, 'EEEE, MMMM d')}</p>
                <button onClick={() => setShowForm(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {daySchedules.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">No prints scheduled. Tap Add to queue one.</p>
              ) : (
                <div className="space-y-2">
                  {daySchedules.map(s => (
                    <ScheduleCard key={s.id} schedule={s} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upcoming queue */}
        {!selectedDay && upcomingQueued.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Upcoming Queue</p>
            <div className="space-y-2">
              {upcomingQueued.slice(0, 6).map(s => (
                <ScheduleCard key={s.id} schedule={s} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          </motion.div>
        )}

        {!isLoading && schedules.length === 0 && !showForm && (
          <div className="mt-12 text-center text-slate-600">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No prints scheduled yet.</p>
            <p className="text-xs mt-1">Tap Schedule to queue your first print.</p>
          </div>
        )}
      </div>
    </div>
  );
}