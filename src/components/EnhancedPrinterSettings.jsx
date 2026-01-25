import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, ChevronDown, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const priorityConfig = {
  critical: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-300"
  },
  important: {
    icon: Info,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-300"
  },
  minor: {
    icon: CheckCircle2,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    badge: "bg-cyan-500/20 text-cyan-300"
  }
};

export default function EnhancedPrinterSettings({ suggestions }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Handle both old format (array of strings) and new format (array of objects)
  const isEnhancedFormat = suggestions && suggestions.length > 0 && typeof suggestions[0] === 'object';

  if (!suggestions || suggestions.length === 0) return null;

  if (!isEnhancedFormat) {
    // Legacy format - simple list
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Settings2 className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="text-white font-semibold">Recommended Settings</h3>
        </div>
        <ul className="space-y-3">
          {suggestions.map((suggestion, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2" />
              {suggestion}
            </li>
          ))}
        </ul>
      </motion.div>
    );
  }

  // Enhanced format with priority grouping
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const priorityOrder = { critical: 0, important: 1, minor: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10">
          <Settings2 className="w-5 h-5 text-cyan-400" />
        </div>
        <h3 className="text-white font-semibold">Printer Settings Recommendations</h3>
      </div>

      <div className="space-y-2">
        {sortedSuggestions.map((suggestion, index) => {
          const config = priorityConfig[suggestion.priority] || priorityConfig.minor;
          const Icon = config.icon;
          const isExpanded = expandedIndex === index;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-xl border backdrop-blur-sm overflow-hidden transition-all",
                config.border,
                config.bg
              )}
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <Icon className={cn("w-5 h-5", config.color)} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium">{suggestion.setting}</h4>
                  <p className="text-sm text-slate-400 truncate">
                    {suggestion.recommended}
                  </p>
                </div>
                <Badge className={cn("uppercase text-xs", config.badge)}>
                  {suggestion.priority}
                </Badge>
                <ChevronDown className={cn(
                  "w-5 h-5 text-slate-400 transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
                      {suggestion.current_suspected && (
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <p className="text-xs text-slate-500 uppercase mb-1">Current (Suspected)</p>
                          <p className="text-sm text-slate-300">{suggestion.current_suspected}</p>
                        </div>
                      )}
                      
                      <div className="bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-lg p-3 border border-cyan-500/20">
                        <p className="text-xs text-cyan-400 uppercase mb-1">Recommended</p>
                        <p className="text-sm text-slate-200 font-medium">{suggestion.recommended}</p>
                      </div>

                      {suggestion.reason && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase mb-2">Why This Helps</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{suggestion.reason}</p>
                        </div>
                      )}

                      {suggestion.related_defects && suggestion.related_defects.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase mb-2">Addresses These Issues</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestion.related_defects.map((defect, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-slate-800/50 text-xs text-slate-300 rounded border border-slate-700"
                              >
                                {defect}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}