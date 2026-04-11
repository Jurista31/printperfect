import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Wrench, Plus, AlertTriangle, CheckCircle2, Clock, Trash2,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TASK_TYPES = [
  { value: 'nozzle_cleaning',  label: 'Nozzle Cleaning' },
  { value: 'belt_tensioning',  label: 'Belt Tensioning' },
  { value: 'bed_leveling',     label: 'Bed Leveling' },
  { value: 'lubrication',      label: 'Lubrication' },
  { value: 'ptfe_tube',        label: 'PTFE Tube Check' },
  { value: 'extruder_gear',    label: 'Extruder Gear' },
  { value: 'firmware_update',  label: 'Firmware Update' },
  { value: 'full_inspection',  label: 'Full Inspection' },
  { value: 'other',            label: 'Other' },
];

function getStatus(task, printerHours) {
  const now = new Date();
  let daysDue = null;
  let hoursDue = null;

  if (task.interval_days && task.last_performed_date) {
    const daysSince = differenceInDays(now, parseISO(task.last_performed_date));
    daysDue = task.interval_days - daysSince;
  }
  if (task.interval_hours && task.last_performed_print_hours != null && printerHours != null) {
    const hoursSince = printerHours - task.last_performed_print_hours;
    hoursDue = task.interval_hours - hoursSince;
  }

  if (!task.last_performed_date && !task.last_performed_print_hours) return 'never';

  const minDue = [daysDue, hoursDue].filter(v => v !== null).reduce((a, b) => Math.min(a, b), Infinity);
  if (minDue === Infinity) return 'ok';
  if (minDue <= 0) return 'overdue';
  if (minDue <= (task.interval_days ? task.interval_days * 0.2 : task.interval_hours * 0.2)) return 'warning';
  return 'ok';
}

const STATUS_CONFIG = {
  ok:      { label: 'OK',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  warning: { label: 'Due Soon',color: 'text-amber-400',   bg: 'bg-amber-500/10  border-amber-500/20',  icon: Clock },
  overdue: { label: 'Overdue', color: 'text-red-400',     bg: 'bg-red-500/10    border-red-500/20',    icon: AlertTriangle },
  never:   { label: 'Never Done', color: 'text-slate-400', bg: 'bg-slate-700/30 border-slate-700',     icon: AlertTriangle },
};

function TaskCard({ task, printerHours, onLogDone, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const status = getStatus(task, printerHours);
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className={cn('rounded-xl border p-4 transition-all', cfg.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className={cn('w-4 h-4 shrink-0', cfg.color)} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{task.task_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {task.last_performed_date
                ? `Last: ${format(parseISO(task.last_performed_date), 'MMM d, yyyy')}`
                : 'Never performed'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={cn('text-xs border', cfg.bg, cfg.color)}>{cfg.label}</Badge>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-white">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs text-slate-400">
          {task.interval_days && <p>Interval: every <strong className="text-slate-200">{task.interval_days} days</strong></p>}
          {task.interval_hours && <p>Interval: every <strong className="text-slate-200">{task.interval_hours} print hours</strong></p>}
          {task.last_performed_print_hours != null && <p>Last at: <strong className="text-slate-200">{task.last_performed_print_hours}h total</strong></p>}
          {task.notes && <p className="italic">{task.notes}</p>}
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => onLogDone(task)} className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-xs">
              ✓ Mark Done Today
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(task.id)} className="text-red-400 hover:text-red-300 h-7 text-xs">
              <Trash2 className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  printer_name: '', task_name: '', task_type: 'nozzle_cleaning',
  interval_days: '', interval_hours: '', last_performed_date: '', notes: ''
};

export default function PrinterMaintenancePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [printerHoursMap, setPrinterHoursMap] = useState({});

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['printer-maintenance'],
    queryFn: () => base44.entities.PrinterMaintenance.list('-created_date', 200),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['printer-profiles-maint'],
    queryFn: () => base44.entities.PrinterProfile.list('-created_date', 50),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['print-journal'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 500),
  });

  // Auto-calculate print hours per printer name from journal entries
  const computedHoursMap = useMemo(() => {
    const map = {};
    // Build a lookup: profile.name -> profile.printer_model
    const modelByName = {};
    profiles.forEach(p => { modelByName[p.name] = p.printer_model; });

    // For each task's printer_name, sum journal hours matching that printer model
    const printerNames = [...new Set(tasks.map(t => t.printer_name).filter(Boolean))];
    printerNames.forEach(name => {
      const model = modelByName[name] || name;
      const hours = journalEntries
        .filter(e => e.printer_model && e.duration_minutes &&
          (e.printer_model.toLowerCase().trim() === model.toLowerCase().trim() ||
           e.printer_model.toLowerCase().trim() === name.toLowerCase().trim()))
        .reduce((s, e) => s + e.duration_minutes / 60, 0);
      map[name] = Math.round(hours * 10) / 10;
    });
    return map;
  }, [journalEntries, tasks, profiles]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PrinterMaintenance.create(data),
    onSuccess: () => { qc.invalidateQueries(['printer-maintenance']); setShowForm(false); setForm(EMPTY_FORM); toast.success('Task added'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PrinterMaintenance.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['printer-maintenance']); toast.success('Marked as done'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrinterMaintenance.delete(id),
    onSuccess: () => { qc.invalidateQueries(['printer-maintenance']); toast.success('Removed'); },
  });

  const handleLogDone = (task) => {
    const hours = computedHoursMap[task.printer_name];
    updateMutation.mutate({
      id: task.id,
      data: {
        last_performed_date: new Date().toISOString().slice(0, 10),
        ...(hours != null ? { last_performed_print_hours: hours } : {}),
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      interval_days: form.interval_days ? Number(form.interval_days) : undefined,
      interval_hours: form.interval_hours ? Number(form.interval_hours) : undefined,
      last_performed_date: form.last_performed_date || undefined,
      is_active: true,
    });
  };

  // Group by printer
  const grouped = useMemo(() => {
    const g = {};
    tasks.forEach(t => {
      const key = t.printer_name || 'Unknown Printer';
      if (!g[key]) g[key] = [];
      g[key].push(t);
    });
    return g;
  }, [tasks]);

  const alertCount = tasks.filter(t => {
    const s = getStatus(t, computedHoursMap[t.printer_name]);
    return s === 'overdue' || s === 'never';
  }).length;

  const printerNames = [...new Set([
    ...profiles.map(p => p.name),
    ...tasks.map(t => t.printer_name),
  ])].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Maintenance</h1>
                <p className="text-xs text-slate-500">
                  {alertCount > 0
                    ? <span className="text-red-400 font-medium">{alertCount} task{alertCount > 1 ? 's' : ''} need attention</span>
                    : 'All printers up to date'}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowForm(s => !s)}
              className="bg-orange-600 hover:bg-orange-500 text-white gap-1">
              <Plus className="w-4 h-4" /> Add Task
            </Button>
          </div>
        </motion.div>

        {/* Add Task Form */}
        {showForm && (
          <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="mb-6 rounded-2xl bg-slate-800/60 border border-slate-700 p-4 space-y-3">
            <p className="text-sm font-semibold text-white">New Maintenance Task</p>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Printer Name *</label>
              <Input list="printer-list" value={form.printer_name}
                onChange={e => setForm(f => ({ ...f, printer_name: e.target.value }))}
                placeholder="e.g. My Ender 3" required
                className="bg-slate-700 border-slate-600 text-white text-sm" />
              <datalist id="printer-list">{printerNames.map(n => <option key={n} value={n} />)}</datalist>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Task *</label>
              <select value={form.task_type}
                onChange={e => {
                  const label = TASK_TYPES.find(t => t.value === e.target.value)?.label || '';
                  setForm(f => ({ ...f, task_type: e.target.value, task_name: label }));
                }}
                className="w-full rounded-md bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2">
                {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Alert after (days)</label>
                <Input type="number" min="1" value={form.interval_days}
                  onChange={e => setForm(f => ({ ...f, interval_days: e.target.value }))}
                  placeholder="e.g. 30"
                  className="bg-slate-700 border-slate-600 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Alert after (hours)</label>
                <Input type="number" min="1" value={form.interval_hours}
                  onChange={e => setForm(f => ({ ...f, interval_hours: e.target.value }))}
                  placeholder="e.g. 100"
                  className="bg-slate-700 border-slate-600 text-white text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Last performed (optional)</label>
              <Input type="date" value={form.last_performed_date}
                onChange={e => setForm(f => ({ ...f, last_performed_date: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white text-sm" />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <Input value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
                className="bg-slate-700 border-slate-600 text-white text-sm" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={createMutation.isPending}
                className="bg-orange-600 hover:bg-orange-500 text-white flex-1">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Task'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400">
                Cancel
              </Button>
            </div>
          </motion.form>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-20">
            <Wrench className="w-14 h-14 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No maintenance tasks yet.</p>
            <p className="text-slate-600 text-xs mt-1">Add a task to start tracking printer health.</p>
          </div>
        )}

        {/* Grouped by printer */}
        {Object.entries(grouped).map(([printerName, printerTasks]) => (
          <motion.div key={printerName}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-300">{printerName}</h2>
              <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-300 font-semibold">{computedHoursMap[printerName] ?? 0}h</span>
                <span className="text-xs text-slate-500">from journal</span>
              </div>
            </div>
            <div className="space-y-2">
              {printerTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  printerHours={computedHoursMap[printerName] ?? null}
                  onLogDone={handleLogDone}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}