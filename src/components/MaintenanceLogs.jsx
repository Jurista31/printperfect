import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Plus, Trash2, ChevronDown, ChevronUp, Loader2, Check, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const EVENT_TYPES = [
  { value: 'nozzle_replacement', label: 'Nozzle Replacement', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  { value: 'bed_leveling', label: 'Bed Leveling', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' },
  { value: 'belt_tension', label: 'Belt Tension', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' },
  { value: 'lubrication', label: 'Lubrication', color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' },
  { value: 'cleaning', label: 'Cleaning', color: 'text-teal-400', bg: 'bg-teal-500/15 border-teal-500/30' },
  { value: 'firmware_update', label: 'Firmware Update', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  { value: 'repair', label: 'Repair', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  { value: 'calibration', label: 'Calibration', color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30' },
  { value: 'filament_change', label: 'Filament Change', color: 'text-pink-400', bg: 'bg-pink-500/15 border-pink-500/30' },
  { value: 'other', label: 'Other', color: 'text-slate-400', bg: 'bg-slate-700/50 border-slate-600/50' },
];

const RESULT_OPTIONS = [
  { value: 'preventive', label: 'Preventive', color: 'text-green-400' },
  { value: 'resolved_issue', label: 'Fixed an issue', color: 'text-cyan-400' },
  { value: 'issue_persists', label: 'Issue persists', color: 'text-amber-400' },
  { value: 'caused_new_issue', label: 'Caused new issue', color: 'text-red-400' },
];

const getEventConfig = (type) => EVENT_TYPES.find(e => e.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];

const emptyForm = {
  event_type: '',
  performed_at: new Date().toISOString().split('T')[0],
  notes: '',
  printer_profile_id: '',
  printer_name: '',
  prints_since_last: '',
  result: 'preventive',
};

function LogForm({ profiles, onSave, onCancel, saving }) {
  const [form, setForm] = useState(emptyForm);

  const handleProfileChange = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    setForm(f => ({ ...f, printer_profile_id: profileId, printer_name: profile?.name || '' }));
  };

  return (
    <div className="space-y-4">
      {/* Event type */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-2 block">Maintenance Type *</label>
        <div className="grid grid-cols-2 gap-1.5">
          {EVENT_TYPES.map(evt => (
            <button
              key={evt.value}
              onClick={() => setForm(f => ({ ...f, event_type: evt.value }))}
              className={cn(
                "text-xs px-3 py-2 rounded-lg border text-left transition-colors",
                form.event_type === evt.value
                  ? `${evt.bg} ${evt.color} font-medium`
                  : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
              )}
            >
              {evt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Date Performed *</label>
        <Input
          type="date"
          value={form.performed_at}
          onChange={(e) => setForm(f => ({ ...f, performed_at: e.target.value }))}
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Printer profile */}
      {profiles.length > 0 && (
        <div>
          <label className="text-xs font-medium text-slate-400 mb-2 block">Printer (optional)</label>
          <div className="flex flex-wrap gap-1.5">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => handleProfileChange(form.printer_profile_id === p.id ? '' : p.id)}
                className={cn(
                  "text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                  form.printer_profile_id === p.id
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-2 block">Outcome</label>
        <div className="flex flex-wrap gap-1.5">
          {RESULT_OPTIONS.map(r => (
            <button
              key={r.value}
              onClick={() => setForm(f => ({ ...f, result: r.value }))}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                form.result === r.value
                  ? `bg-slate-700 border-slate-500 ${r.color} font-medium`
                  : "bg-slate-800 border-slate-700 text-slate-500"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Notes</label>
        <Input
          value={form.notes}
          onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="e.g. Replaced 0.4mm brass nozzle, 200h of use"
          className="bg-slate-800 border-slate-700 text-white text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={onCancel} variant="outline" size="sm" className="border-slate-700 text-slate-400">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          disabled={!form.event_type || !form.performed_at || saving}
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-500 flex-1"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Log Maintenance
        </Button>
      </div>
    </div>
  );
}

export default function MaintenanceLogs() {
  const [creating, setCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['maintenance-logs'],
    queryFn: () => base44.entities.MaintenanceLog.list('-performed_at', 50),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['printer-profiles'],
    queryFn: () => base44.entities.PrinterProfile.list('-created_date', 20),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
      setCreating(false);
      toast.success('Maintenance logged!');
    },
    onError: () => toast.error('Failed to save log'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
      toast.success('Log removed');
    },
  });

  const visibleLogs = showAll ? logs : logs.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-400" />
          <h3 className="text-white font-semibold">Maintenance Log</h3>
        </div>
        {!creating && (
          <Button
            size="sm"
            onClick={() => setCreating(true)}
            className="bg-orange-600 hover:bg-orange-500 h-8 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Log Event
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Track repairs, nozzle replacements, bed leveling, and more. This data helps the AI provide better root-cause analysis when defects are detected.
      </p>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-slate-800/70 border border-orange-500/30 rounded-xl p-4"
          >
            <p className="text-sm font-medium text-orange-400 mb-4">New Maintenance Entry</p>
            <LogForm
              profiles={profiles}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setCreating(false)}
              saving={createMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
        </div>
      ) : logs.length === 0 && !creating ? (
        <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No maintenance logged yet</p>
          <p className="text-xs text-slate-600 mt-1">Log nozzle changes, bed leveling, repairs…</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleLogs.map((log) => {
            const cfg = getEventConfig(log.event_type);
            const resultCfg = RESULT_OPTIONS.find(r => r.value === log.result);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn("rounded-xl border p-3 flex items-start gap-3", cfg.bg)}
              >
                <Wrench className={cn("w-4 h-4 mt-0.5 shrink-0", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-sm font-medium", cfg.color)}>{cfg.label}</span>
                    {log.printer_name && (
                      <span className="text-xs text-slate-500">{log.printer_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(log.performed_at), 'MMM d, yyyy')}
                    </span>
                    {resultCfg && (
                      <span className={cn("text-xs", resultCfg.color)}>{resultCfg.label}</span>
                    )}
                  </div>
                  {log.notes && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{log.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(log.id)}
                  className="text-slate-700 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}

          {logs.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors py-2"
            >
              {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAll ? 'Show less' : `Show ${logs.length - 5} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}