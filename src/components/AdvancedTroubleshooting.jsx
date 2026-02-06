import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Droplets, Thermometer, Clock, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AdvancedTroubleshooting({ data }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/30 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Advanced Troubleshooting</h3>
              <p className="text-xs text-slate-400">Environmental & material factors</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Filament Quality */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Filament Quality Indicators</span>
          </div>
          {data.filament_quality_indicators?.slice(0, expanded ? undefined : 2).map((indicator, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-sm text-slate-300">{indicator}</p>
            </div>
          ))}
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4"
          >
            {/* Environmental Factors */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-slate-300">Environmental Factors</span>
              </div>
              <ul className="space-y-1">
                {data.environmental_factors?.map((factor, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Printer Wear Patterns */}
            {data.printer_wear_patterns && data.printer_wear_patterns.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-slate-300">Printer Wear Patterns</span>
                </div>
                <ul className="space-y-1">
                  {data.printer_wear_patterns.map((pattern, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>{pattern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Material Specific Issues */}
            {data.material_specific_issues && data.material_specific_issues.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-slate-300">Material-Specific Issues</span>
                </div>
                <ul className="space-y-1">
                  {data.material_specific_issues.map((issue, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}