import React, { useState } from 'react';
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, RotateCcw, Share2, Camera, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DefectCard from "./DefectCard";
import ShareDialog from "./community/ShareDialog";
import EnhancedPrinterSettings from "./EnhancedPrinterSettings";
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const quality = qualityConfig[analysis.overall_quality] || qualityConfig.fair;
  const QualityIcon = quality.icon;
  const defectCount = analysis.defects?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header with Image(s) */}
      <div className="space-y-3">
        {analysis.all_image_urls && analysis.all_image_urls.length > 1 ? (
          <>
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={analysis.all_image_urls[0]}
                alt="Analyzed print - primary angle"
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm",
                  quality.bg,
                  quality.border
                )}>
                  <QualityIcon className={cn("w-5 h-5", quality.color)} />
                  <span className={cn("font-semibold", quality.color)}>{quality.label}</span>
                </div>
                <Badge className="bg-cyan-500/90 text-white border-0 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  {analysis.all_image_urls.length} Angles
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {analysis.all_image_urls.slice(1).map((url, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden aspect-square">
                  <img src={url} alt={`Angle ${i + 2}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 right-1 bg-slate-900/80 text-white px-2 py-0.5 rounded text-xs">
                    #{i + 2}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
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
        )}

        {/* Confidence Badge */}
        {analysis.confidence_level && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              analysis.confidence_level === 'high' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
              analysis.confidence_level === 'medium' && "bg-amber-500/10 text-amber-400 border border-amber-500/30",
              analysis.confidence_level === 'low' && "bg-slate-700/50 text-slate-400 border border-slate-600"
            )}
          >
            <Award className="w-4 h-4" />
            {analysis.confidence_level.charAt(0).toUpperCase() + analysis.confidence_level.slice(1)} Confidence
          </motion.div>
        )}
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
        <EnhancedPrinterSettings suggestions={analysis.printer_settings_suggestions} />
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => setShareDialogOpen(true)}
          className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all duration-300"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share with Community
        </Button>
        <Button
          onClick={onNewAnalysis}
          className="h-14 px-6 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-all duration-300"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        analysis={analysis}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </motion.div>
  );
}