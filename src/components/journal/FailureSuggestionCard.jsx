import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Thermometer, Layers, Gauge, Wrench, Package, Sliders, Wind,
  X, CheckCircle2, Circle, ChevronRight, Loader2, Link2, FlaskConical, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_CONFIG = {
  temperature: { icon: Thermometer, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  adhesion:    { icon: Layers,      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  speed:       { icon: Gauge,       color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20' },
  hardware:    { icon: Wrench,      color: 'text-slate-300',  bg: 'bg-slate-500/10 border-slate-500/20' },
  material:    { icon: Package,     color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  calibration: { icon: Sliders,     color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20' },
  environment: { icon: Wind,        color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
};

function TroubleshootingModal({ suggestion, onClose, onMarkRead }) {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(new Set(suggestion.completed_steps || []));
  const [saving, setSaving] = useState(false);

  const steps = suggestion.steps || [];
  const allDone = steps.length > 0 && checked.size === steps.length;
  const progress = steps.length > 0 ? Math.round((checked.size / steps.length) * 100) : 0;

  const toggle = async (i) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChecked(next);

    // Auto-save on every toggle
    setSaving(true);
    await base44.entities.FailureSuggestion.update(suggestion.id, {
      completed_steps: Array.from(next),
    });
    queryClient.invalidateQueries({ queryKey: ['failure-suggestions'] });
    setSaving(false);
  };

  const handleMarkRead = async () => {
    await onMarkRead(suggestion.id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Fix: {suggestion.print_title}</p>
            {suggestion.printer_model && (
              <p className="text-xs text-slate-500">
                {suggestion.printer_model}{suggestion.filament_material ? ` · ${suggestion.filament_material}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saving && <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Diagnosis */}
        {suggestion.summary && (
          <div className="mx-5 mt-4 flex-shrink-0 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-sm text-red-200 leading-relaxed">{suggestion.summary}</p>
          </div>
        )}

        {/* Progress bar */}
        {steps.length > 0 && (
          <div className="mx-5 mt-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-400 font-medium">Progress</span>
              <span className="text-xs font-semibold text-white">{checked.size}/{steps.length} steps</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full transition-colors",
                  allDone ? "bg-gradient-to-r from-teal-400 to-emerald-400" : "bg-gradient-to-r from-red-500 to-orange-400"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        )}

        {/* Step checklist */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2.5">
          {steps.map((step, i) => {
            const cfg = CATEGORY_CONFIG[step.category] || CATEGORY_CONFIG.hardware;
            const Icon = cfg.icon;
            const done = checked.has(i);
            return (
              <motion.button
                key={i}
                onClick={() => toggle(i)}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full text-left border rounded-xl p-3.5 flex gap-3 transition-all duration-200",
                  done
                    ? "bg-teal-500/10 border-teal-500/30 opacity-75"
                    : cfg.bg
                )}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0 mt-0.5">
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    : <Circle className={cn("w-5 h-5", cfg.color)} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", done ? "text-teal-400" : cfg.color)} />
                    <p className={cn("text-xs font-semibold", done ? "line-through text-slate-500" : "text-white")}>
                      {step.title}
                    </p>
                    {step.priority === 'critical' && !done && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</span>
                    )}
                  </div>

                  {/* Defect link */}
                  {step.defect_link && (
                    <div className="flex items-center gap-1 mt-1 mb-1">
                      <Link2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="text-[11px] text-slate-500">Addresses: </span>
                      <span className="text-[11px] font-medium text-orange-400">{step.defect_link}</span>
                    </div>
                  )}

                  <p className={cn("text-xs leading-relaxed", done ? "text-slate-600" : "text-slate-400")}>
                    {step.detail}
                  </p>

                  {/* Settings hint */}
                  {(step.setting_to_adjust || step.setting_change) && (
                    <div className={cn("mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border",
                      done ? 'bg-slate-800/30 border-slate-700/30 text-slate-600' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                    )}>
                      <Sliders className="w-3 h-3 flex-shrink-0" />
                      <span className="font-mono font-semibold">{step.setting_to_adjust}</span>
                      {step.setting_change && (
                        <><ArrowRight className="w-3 h-3 text-slate-500" /><span>{step.setting_change}</span></>
                      )}
                    </div>
                  )}

                  {/* Material property */}
                  {step.material_property && (
                    <div className={cn("mt-1.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border",
                      done ? 'bg-slate-800/30 border-slate-700/30 text-slate-600' : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                    )}>
                      <FlaskConical className="w-3 h-3 flex-shrink-0" />
                      <span>Investigate: <span className="font-semibold">{step.material_property}</span></span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 self-center">
                  <span className={cn(
                    "text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center",
                    done ? "bg-teal-500/20 text-teal-400" : "bg-slate-800/60 text-slate-500"
                  )}>{i + 1}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
          {allDone ? (
            <button
              onClick={handleMarkRead}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              All done — Mark as resolved
            </button>
          ) : (
            <button
              onClick={handleMarkRead}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              Dismiss for now
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function FailureSuggestions() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['failure-suggestions'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.FailureSuggestion.filter({ created_by_user: user.email }, '-created_date', 20);
    },
    refetchInterval: 15000,
  });

  const unread = suggestions.filter(s => !s.is_read);

  const markRead = async (id) => {
    await base44.entities.FailureSuggestion.update(id, { is_read: true });
    queryClient.invalidateQueries({ queryKey: ['failure-suggestions'] });
  };

  if (isLoading || suggestions.length === 0) return null;

  return (
    <>
      {unread.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-sm font-semibold text-red-300">Failure Troubleshooting</p>
            <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full font-medium">{unread.length} new</span>
          </div>
          {unread.map(s => {
            const total = s.steps?.length || 0;
            const done = (s.completed_steps || []).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelected(s)}
                className="w-full text-left bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 hover:bg-red-500/15 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{s.print_title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{s.summary}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-slate-500">{done}/{total}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
                {total > 0 && (
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct === 100 ? "bg-teal-400" : "bg-red-500/70"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      )}

      <AnimatePresence>
        {selected && (
          <TroubleshootingModal
            suggestion={selected}
            onClose={() => setSelected(null)}
            onMarkRead={markRead}
          />
        )}
      </AnimatePresence>
    </>
  );
}