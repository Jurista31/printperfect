import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, Info, Zap, ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY = {
  critical: { icon: Zap,           color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',    dot: 'bg-red-400',    label: 'Critical' },
  warning:  { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400',  label: 'Warning' },
  info:     { icon: Info,          color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/30',   dot: 'bg-cyan-400',   label: 'Info' },
};

function AlertCard({ alert }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const cfg = SEVERITY[alert.severity] || SEVERITY.info;
  const Icon = cfg.icon;

  const markRead = useMutation({
    mutationFn: () => base44.entities.TrendAlert.update(alert.id, { is_read: true }),
    onSuccess: () => qc.invalidateQueries(['trend-alerts']),
  });

  const dismiss = useMutation({
    mutationFn: () => base44.entities.TrendAlert.update(alert.id, { is_dismissed: true, is_read: true }),
    onSuccess: () => qc.invalidateQueries(['trend-alerts']),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn('border rounded-xl p-3 relative', cfg.bg)}
      onClick={() => { if (!alert.is_read) markRead.mutate(); }}
    >
      {!alert.is_read && (
        <span className={cn('absolute top-3 right-9 w-2 h-2 rounded-full', cfg.dot)} />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss.mutate(); }}
        className="absolute top-2.5 right-2.5 text-slate-600 hover:text-slate-400 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-2.5 pr-6">
        <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold leading-snug', cfg.color)}>{cfg.label}</p>
          <p className="text-sm font-medium text-white mt-0.5 leading-snug">{alert.message}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {alert.printer_model && <span className="text-xs text-slate-500">{alert.printer_model}</span>}
            {alert.material      && <span className="text-xs text-slate-500">{alert.material}</span>}
            {alert.failure_rate_recent != null && (
              <span className="text-xs text-slate-500">
                Recent: <span className="text-red-400 font-semibold">{alert.failure_rate_recent}% fail</span>
                {alert.failure_rate_prior != null && <span className="text-slate-600"> (was {alert.failure_rate_prior}%)</span>}
              </span>
            )}
          </div>

          {alert.details && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1.5"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{alert.details}</p>
                {alert.recommended_action && (
                  <div className="mt-2 bg-slate-800/60 rounded-lg px-2.5 py-2">
                    <p className="text-xs text-slate-500 font-semibold mb-0.5">Recommended Action</p>
                    <p className="text-xs text-slate-300">{alert.recommended_action}</p>
                  </div>
                )}
                {alert.period_analyzed && (
                  <p className="text-xs text-slate-600 mt-1.5">Period: {alert.period_analyzed}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function useTrendAlerts() {
  return useQuery({
    queryKey: ['trend-alerts'],
    queryFn: () => base44.entities.TrendAlert.filter({ is_dismissed: false }, '-created_date', 20),
    refetchInterval: 5 * 60 * 1000,
  });
}

export default function TrendAlertsPanel({ onClose }) {
  const { data: alerts = [], isLoading, refetch } = useTrendAlerts();
  const [running, setRunning] = useState(false);
  const qc = useQueryClient();

  const unread = alerts.filter(a => !a.is_read);

  const runNow = async () => {
    setRunning(true);
    await base44.functions.invoke('analyzeTrends', {});
    await refetch();
    setRunning(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Trend Alerts</span>
          {unread.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {unread.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runNow}
            disabled={running}
            title="Run analysis now"
            className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
          {onClose && <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
          <Bell className="w-10 h-10 text-slate-700" />
          <div>
            <p className="text-sm font-medium text-slate-400">No alerts yet</p>
            <p className="text-xs text-slate-600 mt-1">Alerts auto-generate daily. Tap refresh to analyze now.</p>
          </div>
          <button
            onClick={runNow}
            disabled={running}
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-40"
          >
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Analyze my prints now
          </button>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pb-2">
          <AnimatePresence>
            {alerts.map(a => <AlertCard key={a.id} alert={a} />)}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}