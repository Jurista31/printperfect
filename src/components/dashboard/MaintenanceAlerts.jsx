import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Wrench, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

// Hours-since-last-service thresholds per event type
const SERVICE_THRESHOLDS = {
  nozzle_replacement: { hours: 200,  label: 'Nozzle Replacement',  warnHours: 160 },
  belt_tension:       { hours: 300,  label: 'Belt Tensioning',     warnHours: 240 },
  lubrication:        { hours: 150,  label: 'Lubrication',         warnHours: 120 },
  bed_leveling:       { hours: 100,  label: 'Bed Leveling',        warnHours: 80  },
  cleaning:           { hours: 50,   label: 'Cleaning',            warnHours: 40  },
  calibration:        { hours: 200,  label: 'Calibration',         warnHours: 160 },
};

// Severity helpers
function getSeverity(hoursSince, threshold) {
  if (hoursSince >= threshold.hours) return 'overdue';
  if (hoursSince >= threshold.warnHours) return 'warning';
  return 'ok';
}

function severityStyle(severity) {
  if (severity === 'overdue') return {
    border: 'border-red-500/40', bg: 'bg-red-500/10',
    text: 'text-red-400', badge: 'bg-red-500/20 text-red-300',
    icon: 'text-red-400',
  };
  if (severity === 'warning') return {
    border: 'border-amber-500/40', bg: 'bg-amber-500/10',
    text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300',
    icon: 'text-amber-400',
  };
  return {
    border: 'border-green-500/30', bg: 'bg-green-500/5',
    text: 'text-green-400', badge: 'bg-green-500/15 text-green-300',
    icon: 'text-green-400',
  };
}

export default function MaintenanceAlerts({ entries }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ['maintenance-logs-dashboard'],
    queryFn: () => base44.entities.MaintenanceLog.list('-performed_at', 200),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['printer-profiles-dashboard'],
    queryFn: () => base44.entities.PrinterProfile.list('-created_date', 20),
  });

  const { data: customTasks = [] } = useQuery({
    queryKey: ['printer-maintenance-dashboard'],
    queryFn: () => base44.entities.PrinterMaintenance.list('-created_date', 200),
  });

  const alerts = useMemo(() => {
    if (!profiles.length && !logs.length) return [];

    // Compute total print hours per printer from journal entries
    // Group by printer_model — best we can do without a foreign key
    const hoursByPrinter = {};
    entries.forEach(e => {
      if (!e.printer_model || !e.duration_minutes) return;
      hoursByPrinter[e.printer_model] = (hoursByPrinter[e.printer_model] || 0) + e.duration_minutes / 60;
    });

    // For each printer, find the last log date per service type
    const results = [];

    // Build a set of printer names to track (from profiles + logs)
    const printerNames = new Set([
      ...profiles.map(p => p.name),
      ...logs.filter(l => l.printer_name).map(l => l.printer_name),
    ]);

    printerNames.forEach(printerName => {
      const profile = profiles.find(p => p.name === printerName);
      const printerModel = profile?.printer_model || printerName;
      const totalPrintHours = Math.round((hoursByPrinter[printerModel] || 0) * 10) / 10;

      const printerLogs = logs.filter(l => l.printer_name === printerName);

      Object.entries(SERVICE_THRESHOLDS).forEach(([type, threshold]) => {
        const lastLog = printerLogs
          .filter(l => l.event_type === type)
          .sort((a, b) => b.performed_at.localeCompare(a.performed_at))[0];

        let hoursSince;
        if (lastLog) {
          // Calculate print hours accumulated since the last service date
          const serviceDate = parseISO(lastLog.performed_at);
          const printHoursAfterService = entries
            .filter(e => {
              if (!e.printer_model || !e.duration_minutes) return false;
              if (e.printer_model !== printerModel) return false;
              if (!e.print_date) return false;
              return parseISO(e.print_date) > serviceDate;
            })
            .reduce((s, e) => s + e.duration_minutes / 60, 0);
          hoursSince = Math.round(printHoursAfterService * 10) / 10;
        } else {
          // Never serviced — use total print hours
          hoursSince = totalPrintHours;
        }

        const severity = getSeverity(hoursSince, threshold);
        if (severity !== 'ok' || !lastLog) {
          results.push({
            printerName,
            printerModel,
            type,
            threshold,
            lastLog,
            hoursSince,
            totalPrintHours,
            severity: lastLog ? severity : (totalPrintHours > 0 ? 'overdue' : 'warning'),
          });
        }
      });
    });

    // --- Custom PrinterMaintenance tasks (user-defined intervals) ---
    const modelByName = {};
    profiles.forEach(p => { modelByName[p.name] = p.printer_model; });

    customTasks.filter(t => t.is_active !== false).forEach(task => {
      if (!task.interval_hours) return; // skip day-only tasks here (already handled by days check in page)
      const printerName = task.printer_name || 'Unknown';
      const model = modelByName[printerName] || printerName;

      // Compute hours since last performed
      let hoursSince;
      if (task.last_performed_print_hours != null) {
        const totalForPrinter = Math.round(
          entries
            .filter(e => e.printer_model && e.duration_minutes &&
              (e.printer_model.toLowerCase().trim() === model.toLowerCase().trim() ||
               e.printer_model.toLowerCase().trim() === printerName.toLowerCase().trim()))
            .reduce((s, e) => s + e.duration_minutes / 60, 0) * 10
        ) / 10;
        hoursSince = Math.max(0, totalForPrinter - task.last_performed_print_hours);
      } else {
        // Never logged — use total
        hoursSince = Math.round(
          entries
            .filter(e => e.printer_model && e.duration_minutes &&
              (e.printer_model.toLowerCase().trim() === model.toLowerCase().trim() ||
               e.printer_model.toLowerCase().trim() === printerName.toLowerCase().trim()))
            .reduce((s, e) => s + e.duration_minutes / 60, 0) * 10
        ) / 10;
      }

      const hoursUntilDue = task.interval_hours - hoursSince;
      let severity = 'ok';
      if (hoursUntilDue <= 0) severity = 'overdue';
      else if (hoursUntilDue <= task.interval_hours * 0.2) severity = 'warning';
      else if (!task.last_performed_date && !task.last_performed_print_hours) severity = 'warning';

      if (severity !== 'ok') {
        // Avoid duplicate if already in hardcoded results
        const alreadyAdded = results.some(r => r.printerName === printerName && r.threshold?.label === task.task_name);
        if (!alreadyAdded) {
          results.push({
            printerName,
            printerModel: model,
            type: task.task_type,
            threshold: { label: task.task_name, hours: task.interval_hours, warnHours: task.interval_hours * 0.8 },
            lastLog: null,
            hoursSince,
            totalPrintHours: hoursSince,
            severity,
            isCustomTask: true,
          });
        }
      }
    });

    return results.sort((a, b) => {
      const order = { overdue: 0, warning: 1, ok: 2 };
      return order[a.severity] - order[b.severity] || b.hoursSince - a.hoursSince;
    });
  }, [entries, logs, profiles, customTasks]);

  const overdueCount = alerts.filter(a => a.severity === 'overdue').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  if (alerts.length === 0) return null;

  const visible = showAll ? alerts : alerts.slice(0, 4);

  return (
    <div className="mb-5">
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          "w-full flex items-center justify-between rounded-xl px-4 py-3 mb-1 transition-colors border",
          overdueCount > 0
            ? "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15"
            : "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", overdueCount > 0 ? "bg-orange-500/20" : "bg-amber-500/20")}>
            <Wrench className={cn("w-4 h-4", overdueCount > 0 ? "text-orange-400" : "text-amber-400")} />
          </div>
          <div className="text-left">
            <p className={cn("text-sm font-semibold", overdueCount > 0 ? "text-orange-300" : "text-amber-300")}>
              Printer Maintenance Alerts
            </p>
            <p className="text-[10px] text-slate-500">
              {overdueCount > 0 && `${overdueCount} overdue · `}
              {warningCount > 0 && `${warningCount} due soon · `}
              based on print hours
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
          {visible.map((alert, i) => {
            const styles = severityStyle(alert.severity);
            const pct = Math.min(100, Math.round((alert.hoursSince / alert.threshold.hours) * 100));
            return (
              <div key={i} className={cn("rounded-lg border p-3", styles.bg, styles.border)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {alert.severity === 'overdue'
                      ? <AlertTriangle className={cn("w-4 h-4 mt-0.5 flex-shrink-0", styles.icon)} />
                      : alert.severity === 'warning'
                      ? <Clock className={cn("w-4 h-4 mt-0.5 flex-shrink-0", styles.icon)} />
                      : <CheckCircle2 className={cn("w-4 h-4 mt-0.5 flex-shrink-0", styles.icon)} />
                    }
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{alert.threshold.label}</p>
                      <p className="text-[10px] text-slate-500">{alert.printerName}</p>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", styles.badge)}>
                    {alert.severity === 'overdue' ? 'Overdue' : 'Due Soon'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5">
                  <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                    <span>{alert.hoursSince}h since last service</span>
                    <span>Limit: {alert.threshold.hours}h</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", alert.severity === 'overdue' ? 'bg-red-500' : 'bg-amber-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {!alert.lastLog && (
                  <p className="mt-1.5 text-[9px] text-slate-600 italic">Never serviced — recommend scheduling this maintenance.</p>
                )}
                {alert.lastLog?.notes && (
                  <p className="mt-1.5 text-[9px] text-slate-500 truncate">Last note: {alert.lastLog.notes}</p>
                )}
              </div>
            );
          })}

          {alerts.length > 4 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1 pt-1"
            >
              {showAll ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show {alerts.length - 4} more</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}