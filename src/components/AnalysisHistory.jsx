import React from 'react';
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CheckCircle2, AlertTriangle, AlertCircle, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

const qualityIcons = {
  excellent: { icon: CheckCircle2, color: "text-emerald-400" },
  good: { icon: CheckCircle2, color: "text-cyan-400" },
  fair: { icon: AlertCircle, color: "text-amber-400" },
  poor: { icon: AlertTriangle, color: "text-red-400" }
};

export default function AnalysisHistory({ analyses, onSelect, selectedId }) {
  if (!analyses || analyses.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500">No previous analyses yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analyses.map((analysis, index) => {
        const quality = qualityIcons[analysis.overall_quality] || qualityIcons.fair;
        const QualityIcon = quality.icon;
        const defectCount = analysis.defects?.length || 0;
        const isSelected = selectedId === analysis.id;

        return (
          <motion.button
            key={analysis.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(analysis)}
            className={cn(
              "w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all duration-200",
              isSelected 
                ? "bg-cyan-500/10 border border-cyan-500/30" 
                : "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
            )}
          >
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-700 flex items-center justify-center">
              {analysis.image_url ? (
                <img
                  src={analysis.image_url}
                  alt="Print"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-slate-500 text-xs">No image</div>';
                  }}
                />
              ) : (
                <span className="text-slate-500 text-xs">No image</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <QualityIcon className={cn("w-4 h-4", quality.color)} />
                <span className="text-sm font-medium text-white capitalize">
                  {analysis.overall_quality || 'Unknown'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {defectCount} {defectCount === 1 ? 'issue' : 'issues'} found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {format(new Date(analysis.created_date), "MMM d, h:mm a")}
              </p>
            </div>
            <ChevronRight className={cn(
              "w-5 h-5 transition-colors",
              isSelected ? "text-cyan-400" : "text-slate-600"
            )} />
          </motion.button>
        );
      })}
    </div>
  );
}