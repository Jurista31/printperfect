import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, Wrench, ChevronDown, ChevronUp, Bell, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

// Thresholds in print-hours
const MAINTENANCE_RULES = [
  { id: 'bed_leveling',      label: 'Bed Leveling',        hours: 40,  icon: '⬛', urgency: 'medium' },
  { id: 'nozzle_cleaning',   label: 'Nozzle Cleaning',     hours: 100, icon: '🔥', urgency: 'medium' },
  { id: 'lubrication',       label: 'Lubrication',         hours: 200, icon: '🛢️', urgency: 'medium' },
  { id: 'belt_tension',      label: 'Belt Tension Check',  hours: 300, icon: '⚙️', urgency: 'high'   },
  { id: 'nozzle_replacement',label: 'Nozzle Replacement',  hours: 400, icon: '🔩', urgency: 'high'   },
  { id: 'calibration',       label: 'Full Calibration',    hours: 500, icon: '📐', urgency: 'high'   },
];

const URGENCY_STYLE = {
  overdue: 'border-red-500/40 bg-red-500/10 text-red-400',
  soon:    'border-amber-500/40 bg-amber-500/10 text-amber-400',
  ok:      'border-green-500/30 bg-green-500/8 text-green-400',
};

function MaintenanceAlert({ rule, hoursSinceLast, totalHours, onLog }) {
  const hoursUntilDue = rule.hours - (hoursSinceLast % rule.hours);
  const pct = Math.min(100, ((hoursSinceLast % rule.hours) / rule.hours) * 100);
  const isOverdue = hoursSinceLast >= rule.hours && hoursUntilDue <= 0;
  const isSoon = !isOverdue && hoursUntilDue <= rule.hours * 0.15;
  const status = isOverdue ? 'overdue' : isSoon ? 'soon' : 'ok';

  return (
    <div className={cn('rounded-xl border p-3', URGENCY_STYLE[status])}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{rule.icon}</span>
          <div>
            <p className="text-sm font-medium text-white">{rule.label}</p>
            <p className="text-xs opacity-70">
              {isOverdue
                ? `${Math.round(hoursSinceLast - rule.hours)}h overdue`
                : `Due in ~${Math.round(hoursUntilDue)}h`}
            </p>
          </div>
        </div>
        {(isOverdue || isSoon) && (
          <Button
            size="sm"
            onClick={() => onLog(rule.id)}
            className="h-7 text-xs bg-slate-700 hover:bg-slate-600 text-white border-0 shrink-0"
          >
            Log Done
          </Button>
        )}
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOverdue ? 'bg-red-500' : isSoon ? 'bg-amber-500' : 'bg-green-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs opacity-50 mt-1">{Math.round(hoursSinceLast % rule.hours)}h / {rule.hours}h cycle</p>
    </div>
  );
}

export default function PrinterHoursTracker() {
  const [expanded, setExpanded] = useState({});
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ['printer-profiles'],
    queryFn: () => base44.entities.PrinterProfile.list('-created_date', 20),
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['print-journal'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 500),
  });

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ['maintenance-logs'],
    queryFn: () => base44.entities.MaintenanceLog.list('-performed_at', 200),
  });

  const logDoneMutation = useMutation({
    mutationFn: ({ printerName, profileId, eventType }) =>
      base44.entities.MaintenanceLog.create({
        printer_profile_id: profileId,
        printer_name: printerName,
        event_type: eventType,
        performed_at: new Date().toISOString().split('T')[0],
        result: 'preventive',
        notes: 'Logged via maintenance tracker',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-logs'] });
      toast.success('Maintenance logged!');
    },
  });

  // Calculate per-printer stats
  const printerStats = useMemo(() => {
    return profiles.map(profile => {
      // Match journal entries by printer model name
      const entries = journalEntries.filter(e =>
        e.printer_model && profile.printer_model &&
        e.printer_model.toLowerCase().trim() === profile.printer_model.toLowerCase().trim()
      );

      const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
      const totalHours = totalMinutes / 60;
      const totalPrints = entries.length;
      const failureRate = totalPrints > 0
        ? Math.round((entries.filter(e => e.outcome === 'failure').length / totalPrints) * 100)
        : 0;

      // Per-rule: hours since last maintenance of that type
      const ruleAlerts = MAINTENANCE_RULES.map(rule => {
        const logsForRule = maintenanceLogs
          .filter(l =>
            (l.printer_profile_id === profile.id || l.printer_name === profile.name) &&
            l.event_type === rule.id
          )
          .sort((a, b) => new Date(b.performed_at) - new Date(a.performed_at));

        const lastLog = logsForRule[0];

        // Hours of prints since last maintenance (or all-time if never done)
        let hoursSinceLast = totalHours;
        if (lastLog) {
          const lastDate = parseISO(lastLog.performed_at);
          const relevantEntries = entries.filter(e =>
            e.print_date && parseISO(e.print_date) > lastDate
          );
          hoursSinceLast = relevantEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0) / 60;
        }

        return { rule, hoursSinceLast, lastLog };
      });

      const alerts = ruleAlerts.filter(a => {
        const pct = (a.hoursSinceLast % a.rule.hours) / a.rule.hours;
        return pct >= 0.85 || a.hoursSinceLast >= a.rule.hours;
      });

      return { profile, totalHours, totalPrints, failureRate, ruleAlerts, alerts };
    });
  }, [profiles, journalEntries, maintenanceLogs]);

  if (profiles.length === 0) return null;

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-400" />
        <h3 className="text-white font-semibold">Print Hours & Maintenance</h3>
      </div>
      <p className="text-xs text-slate-500">
        Based on your journal entries. Alerts fire when a printer approaches routine maintenance thresholds.
      </p>

      {printerStats.map(({ profile, totalHours, totalPrints, failureRate, ruleAlerts, alerts }) => {
        const isOpen = expanded[profile.id];
        return (
          <div key={profile.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setExpanded(e => ({ ...e, [profile.id]: !e[profile.id] }))}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-700/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile.name}</p>
                <p className="text-xs text-slate-500">{profile.printer_model}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-slate-500">{totalPrints} prints</p>
                </div>
                {alerts.length > 0 && (
                  <div className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
                    <Bell className="w-3 h-3 text-red-400" />
                    <span className="text-xs text-red-400 font-semibold">{alerts.length}</span>
                  </div>
                )}
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </div>
            </button>

            {/* Summary bar */}
            <div className="px-4 pb-3 flex gap-4">
              {[
                { label: 'Total Hours', value: `${totalHours.toFixed(1)}h`, color: 'text-amber-400' },
                { label: 'Prints', value: totalPrints, color: 'text-cyan-400' },
                { label: 'Fail Rate', value: `${failureRate}%`, color: failureRate > 30 ? 'text-red-400' : 'text-green-400' },
                { label: 'Alerts', value: alerts.length, color: alerts.length > 0 ? 'text-red-400' : 'text-slate-500' },
              ].map(s => (
                <div key={s.label} className="flex-1 text-center">
                  <p className={cn('text-sm font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-slate-600">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Expanded: all rules */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-slate-700/50"
                >
                  <div className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Maintenance Schedule</p>
                    {ruleAlerts.map(({ rule, hoursSinceLast, lastLog }) => (
                      <MaintenanceAlert
                        key={rule.id}
                        rule={rule}
                        hoursSinceLast={hoursSinceLast}
                        totalHours={totalHours}
                        onLog={(eventType) => logDoneMutation.mutate({
                          printerName: profile.name,
                          profileId: profile.id,
                          eventType,
                        })}
                      />
                    ))}
                    {totalPrints === 0 && (
                      <p className="text-xs text-slate-500 text-center py-3">
                        No journal entries found for this printer model. Log prints with "<span className="text-white">{profile.printer_model}</span>" as the printer model to track hours.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}