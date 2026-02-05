import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, Sparkles, RefreshCw, Loader2, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Tips() {
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(true);

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 20),
  });

  const generateTips = async (refresh = false) => {
    if (!refresh && tips) return;
    
    setLoading(true);
    try {
      // Analyze user's print history
      const defectSummary = analyses.reduce((acc, analysis) => {
        analysis.defects?.forEach(defect => {
          acc[defect.name] = (acc[defect.name] || 0) + 1;
        });
        return acc;
      }, {});

      const commonDefects = Object.entries(defectSummary)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name]) => name);

      const historyContext = analyses.length > 0 
        ? `User's print history shows ${analyses.length} analyses. Most common defects: ${commonDefects.join(', ') || 'none yet'}. Recent quality levels: ${analyses.slice(0, 5).map(a => a.overall_quality).join(', ')}.`
        : 'User is new with no print history yet.';

      const prompt = `You are an expert 3D printing advisor. Generate comprehensive, actionable tips for this user.

${historyContext}

Provide tips in the following categories:

1. **Personalized Recommendations** (3-4 tips based on their history):
   - If they have recurring defects, provide specific solutions
   - If they're new, provide beginner-friendly advice
   - Format: "Based on your [X], try [Y] because [Z]"

2. **Common Pitfalls** (3-4 tips):
   - Universal issues most 3D printer users face
   - How to prevent them
   - Early warning signs

3. **Material-Specific Tips** (3-4 tips):
   - Best practices for PLA, PETG, ABS, TPU
   - Temperature and speed recommendations
   - Storage and handling

4. **Pro Tips** (3-4 tips):
   - Advanced techniques for better prints
   - Settings optimizations
   - Time-saving tricks

Each tip should be:
- Specific and actionable (not generic)
- Include WHY it works
- Have a clear impact statement
- Be 2-3 sentences max

Make tips conversational and encouraging. Use "you" and "your" to personalize.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            personalized: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  impact: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            pitfalls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  severity: { type: "string", enum: ["critical", "important", "moderate"] }
                }
              }
            },
            material_tips: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  material: { type: "string" },
                  title: { type: "string" },
                  content: { type: "string" }
                }
              }
            },
            pro_tips: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] }
                }
              }
            }
          }
        }
      });

      setTips(result);
    } catch (error) {
      console.error('Failed to generate tips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateTips();
  }, [analyses.length]);

  const impactConfig = {
    high: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'High Impact' },
    medium: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Medium Impact' },
    low: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', label: 'Low Impact' }
  };

  const severityConfig = {
    critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle },
    important: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
    moderate: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: AlertTriangle }
  };

  const difficultyConfig = {
    beginner: { color: 'text-emerald-400', label: 'Beginner' },
    intermediate: { color: 'text-amber-400', label: 'Intermediate' },
    advanced: { color: 'text-purple-400', label: 'Advanced' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Tips</h1>
              <p className="text-sm text-slate-400">Personalized printing advice</p>
            </div>
          </div>
          
          <Button
            onClick={() => generateTips(true)}
            disabled={loading}
            variant="ghost"
            className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </Button>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
            <p className="text-slate-400">Generating personalized tips...</p>
          </div>
        ) : tips ? (
          <div className="space-y-8">
            {/* Personalized Recommendations */}
            {tips.personalized?.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-xl font-semibold text-white">For You</h2>
                </div>
                <div className="space-y-3">
                  {tips.personalized.map((tip, i) => {
                    const impact = impactConfig[tip.impact] || impactConfig.medium;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                          "bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border",
                          impact.border
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-white font-medium">{tip.title}</h3>
                          <Badge className={cn(impact.bg, impact.color, "border-0 text-xs")}>
                            {impact.label}
                          </Badge>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{tip.content}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Common Pitfalls */}
            {tips.pitfalls?.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl font-semibold text-white">Avoid These</h2>
                </div>
                <div className="space-y-3">
                  {tips.pitfalls.map((tip, i) => {
                    const severity = severityConfig[tip.severity] || severityConfig.moderate;
                    const Icon = severity.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className={cn(
                          "bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border",
                          severity.border
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", severity.color)} />
                          <div className="flex-1">
                            <h3 className="text-white font-medium mb-1">{tip.title}</h3>
                            <p className="text-slate-300 text-sm leading-relaxed">{tip.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Material-Specific Tips */}
            {tips.material_tips?.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">Material Guide</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {tips.material_tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50"
                    >
                      <Badge className="mb-2 bg-purple-500/20 text-purple-300 border-0">
                        {tip.material}
                      </Badge>
                      <h3 className="text-white font-medium text-sm mb-1">{tip.title}</h3>
                      <p className="text-slate-400 text-xs leading-relaxed">{tip.content}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Pro Tips */}
            {tips.pro_tips?.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl font-semibold text-white">Pro Tips</h2>
                </div>
                <div className="space-y-3">
                  {tips.pro_tips.map((tip, i) => {
                    const difficulty = difficultyConfig[tip.difficulty] || difficultyConfig.intermediate;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-white font-medium">{tip.title}</h3>
                          <Badge className={cn("border-0 text-xs", difficulty.color, "bg-slate-700/50")}>
                            {difficulty.label}
                          </Badge>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{tip.content}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <Lightbulb className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Failed to generate tips. Try refreshing.</p>
          </div>
        )}
      </div>
    </div>
  );
}