import React from 'react';
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DefectCard from "./DefectCard";
import { cn } from "@/lib/utils";

const qualityConfig = {
  excellent: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    label: "Excellent Quality"
  },
  good: {
    icon: CheckCircle2,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    label: "Good Quality"
  },
  fair: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    label: "Fair Quality"
  },
  poor: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "Poor Quality"
  }
};

export default function AnalysisResults({ analysis, onNewAnalysis }) {
  const quality = qualityConfig[analysis.overall_quality] || qualityConfig.fair;
  const QualityIcon = quality.icon;
  const defectCount = analysis.defects?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header with Image */}
      <div className="relative rounded-2xl overflow-hidden">
        <img
          src={analysis.image_url}
          alt="Analyzed print"
          className="w-full aspect-video object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm",
            quality.bg,
            quality.border
          )}>
            <QualityIcon className={cn("w-5 h-5", quality.color)} />
            <span className={cn("font-semibold", quality.color)}>{quality.label}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {analysis.summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50"
        >
          <p className="text-slate-300 leading-relaxed">{analysis.summary}</p>
        </motion.div>
      )}

      {/* Defects Section */}
      {defectCount > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {defectCount} {defectCount === 1 ? 'Issue' : 'Issues'} Detected
            </h2>
          </div>
          <div className="space-y-3">
            {analysis.defects.map((defect, index) => (
              <DefectCard key={index} defect={defect} index={index} />
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-emerald-300 mb-2">No Defects Found!</h3>
          <p className="text-slate-400">Your print looks great. Keep up the good work!</p>
        </motion.div>
      )}

      {/* Printer Settings Suggestions */}
      {analysis.printer_settings_suggestions && analysis.printer_settings_suggestions.length > 0 && (
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
            {analysis.printer_settings_suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2" />
                {suggestion}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* New Analysis Button */}
      <Button
        onClick={onNewAnalysis}
        className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-all duration-300"
      >
        <RotateCcw className="w-5 h-5 mr-2" />
        Analyze Another Print
      </Button>
    </motion.div>
  );
}