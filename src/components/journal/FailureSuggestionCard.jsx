import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Thermometer, Layers, Gauge, Wrench, Package, Sliders, Wind, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_CONFIG = {
  temperature: { icon: Thermometer, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  adhesion:    { icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  speed:       { icon: Gauge, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  hardware:    { icon: Wrench, color: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/20' },
  material:    { icon: Package, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  calibration: { icon: Sliders, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
  environment: { icon: Wind, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
};

function SuggestionModal({ suggestion, onClose, onMarkRead }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Troubleshooting: {suggestion.print_title}</p>
            {suggestion.printer_model && <p className="text-xs text-slate-500">{suggestion.printer_model}{suggestion.filament_material ? ` · ${suggestion.filament_material}` : ''}</p>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {suggestion.summary && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-sm text-red-200">{suggestion.summary}</p>
            </div>
          )}

          <div className="space-y-2.5">
            {(suggestion.steps || []).map((step, i) => {
              const cfg = CATEGORY_CONFIG[step.category] || CATEGORY_CONFIG.hardware;
              const Icon = cfg.icon;
              return (
                <div key={i} className={cn("border rounded-xl p-3 flex gap-3", cfg.bg)}>
                  <div className="flex-shrink-0 mt-0.5">
                    <span className={cn("text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center bg-slate-800/60", cfg.color)}>{i + 1}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      <p className="text-xs font-semibold text-white">{step.title}</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={() => { onMarkRead(suggestion.id); onClose(); }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-sm font-medium transition-all"
          >
            Got it — Mark as reviewed
          </button>
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
    refetchInterval: 15000, // poll every 15s for new suggestions
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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 space-y-2"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-sm font-semibold text-red-300">Failure Suggestions</p>
            <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full font-medium">{unread.length} new</span>
          </div>
          {unread.map(s => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setSelected(s)}
              className="w-full text-left bg-red-500/10 border border-red-500/30 rounded-xl p-3 hover:bg-red-500/15 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{s.print_title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{s.summary}</p>
                </div>
                <span className="flex-shrink-0 text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{s.steps?.length || 0} tips</span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {selected && (
          <SuggestionModal
            suggestion={selected}
            onClose={() => setSelected(null)}
            onMarkRead={markRead}
          />
        )}
      </AnimatePresence>
    </>
  );
}