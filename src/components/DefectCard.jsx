import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertTriangle, AlertCircle, Info, Wrench, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig = {
  high: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-300"
  },
  medium: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-300"
  },
  low: {
    icon: Info,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    badge: "bg-cyan-500/20 text-cyan-300"
  }
};

export default function DefectCard({ defect, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const config = severityConfig[defect.severity] || severityConfig.low;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "rounded-xl border backdrop-blur-sm overflow-hidden transition-all duration-300",
        config.border,
        config.bg
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 text-left"
      >
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <Icon className={cn("w-5 h-5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{defect.name}</h3>
          <p className="text-slate-400 text-sm truncate">{defect.description}</p>
        </div>
        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium uppercase", config.badge)}>
          {defect.severity}
        </span>
        <ChevronDown className={cn(
          "w-5 h-5 text-slate-400 transition-transform duration-300",
          expanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {defect.causes && defect.causes.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-slate-300">Possible Causes</span>
                  </div>
                  <ul className="space-y-2">
                    {defect.causes.map((cause, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="text-slate-600 mt-1">•</span>
                        {cause}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {defect.solutions && defect.solutions.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-lg p-4 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-cyan-300">How to Fix</span>
                  </div>
                  <ol className="space-y-2">
                    {defect.solutions.map((solution, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </span>
                        {solution}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}