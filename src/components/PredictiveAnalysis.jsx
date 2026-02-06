import React, { useState } from 'react';
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Shield, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PredictiveAnalysis({ data }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Predictive Analysis</h3>
              <p className="text-xs text-slate-400">Future failure risk assessment</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Potential Failures */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-slate-300">Potential Failures</span>
          </div>
          {data.potential_failures?.slice(0, expanded ? undefined : 2).map((failure, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <p className="text-sm text-slate-300">{failure}</p>
            </div>
          ))}
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4"
          >
            {/* Warning Signs */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-300">Early Warning Signs</span>
              </div>
              <ul className="space-y-1">
                {data.warning_signs?.map((sign, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Critical Parameters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-slate-300">Critical Parameters at Risk</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.critical_parameters?.map((param, i) => (
                  <Badge key={i} className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                    {param}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preventive Maintenance */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-slate-300">Preventive Maintenance</span>
              </div>
              <ul className="space-y-1">
                {data.preventive_maintenance?.map((item, i) => (
                  <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}