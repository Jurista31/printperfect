import React from 'react';
import { motion } from "framer-motion";
import { TrendingUp, Award, Target, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CommunityComparison({ data }) {
  if (!data) return null;

  const getPercentileColor = (percentile) => {
    if (percentile >= 80) return "text-emerald-400";
    if (percentile >= 60) return "text-cyan-400";
    if (percentile >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getPercentileLabel = (percentile) => {
    if (percentile >= 80) return "Excellent";
    if (percentile >= 60) return "Above Average";
    if (percentile >= 40) return "Average";
    return "Below Average";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-cyan-500/30 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Community Comparison</h3>
            <p className="text-xs text-slate-400">How your print ranks vs community</p>
          </div>
        </div>

        {/* Quality Percentile */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-300">Quality Ranking</span>
            </div>
            <span className={`text-2xl font-bold ${getPercentileColor(data.quality_percentile)}`}>
              {data.quality_percentile}th
            </span>
          </div>
          <Progress value={data.quality_percentile} className="h-2 mb-2" />
          <p className="text-xs text-slate-400 text-right">
            {getPercentileLabel(data.quality_percentile)} - Better than {data.quality_percentile}% of community prints
          </p>
        </div>

        {/* Common Issues Comparison */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Community Context</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {data.common_issues_comparison}
          </p>
        </div>

        {/* Strengths */}
        {data.strengths && data.strengths.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-slate-300">Your Strengths</span>
            </div>
            <div className="space-y-2">
              {data.strengths.map((strength, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mt-0.5">✓</Badge>
                  <span className="text-sm text-slate-300">{strength}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement Areas */}
        {data.improvement_areas && data.improvement_areas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-slate-300">Room for Improvement</span>
            </div>
            <ul className="space-y-1">
              {data.improvement_areas.map((area, i) => (
                <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                  <span className="text-amber-400 mt-1">→</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </motion.div>
  );
}