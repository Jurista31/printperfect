import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Award, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function SmartSolutionRecommendations({ defectType }) {
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (defectType) {
      fetchRankedSolutions();
    }
  }, [defectType]);

  const fetchRankedSolutions = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('rankSolutions', {
        defectType,
        limit: 5
      });
      
      if (response.data.solutions) {
        setSolutions(response.data.solutions);
      }
    } catch (error) {
      console.error('Failed to fetch ranked solutions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span className="text-slate-300">Analyzing community solutions...</span>
        </div>
      </Card>
    );
  }

  if (solutions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-xl hover:from-cyan-500/15 hover:to-teal-500/15 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold flex items-center gap-2">
              Smart Recommendations
              <Badge className="bg-cyan-500 text-white text-xs">AI-Powered</Badge>
            </h3>
            <p className="text-sm text-slate-400">
              Top {solutions.length} solutions from community
            </p>
          </div>
        </div>
        <TrendingUp className={cn(
          "w-5 h-5 text-cyan-400 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3"
          >
            {solutions.map((sol, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3"
              >
                {/* Solution Text */}
                <p className="text-slate-300 leading-relaxed">{sol.solution}</p>

                {/* Metrics */}
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <Award className="w-4 h-4" />
                    <span className="font-medium">{sol.upvotes}</span>
                    <span className="text-slate-500">upvotes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">{Math.round(sol.successRate * 100)}%</span>
                    <span className="text-slate-500">success</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <span className="font-medium">{sol.appearances}</span>
                    <span className="text-slate-500">uses</span>
                  </div>
                </div>

                {/* Effectiveness Badge */}
                {sol.effectivenessScore > 20 && (
                  <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30">
                    <Award className="w-3 h-3 mr-1" />
                    Highly Effective
                  </Badge>
                )}

                {/* Related Analyses */}
                {sol.analyses.length > 0 && (
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mb-1">
                      Used in {sol.analyses.length} {sol.analyses.length === 1 ? 'case' : 'cases'}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}