import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COMMON_DEFECTS = [
  { id: 'stringing', name: 'Stringing/Oozing', description: 'Thin strings between parts' },
  { id: 'warping', name: 'Warping', description: 'Corners lifting or curling' },
  { id: 'layer_shift', name: 'Layer Shifting', description: 'Misaligned layers' },
  { id: 'under_extrusion', name: 'Under-Extrusion', description: 'Gaps in walls, weak print' },
  { id: 'over_extrusion', name: 'Over-Extrusion', description: 'Bulging, rough surface' },
  { id: 'poor_adhesion', name: 'Bed Adhesion', description: 'Print not sticking' },
  { id: 'z_banding', name: 'Z-Banding', description: 'Horizontal lines/bands' },
  { id: 'ghosting', name: 'Ghosting/Ringing', description: 'Ripples after corners' },
  { id: 'elephant_foot', name: "Elephant's Foot", description: 'First layer too wide' },
  { id: 'sagging', name: 'Sagging/Drooping', description: 'Overhangs failing' },
  { id: 'rough_top', name: 'Rough Top Surface', description: 'Gaps or pillowing on top' },
  { id: 'cracking', name: 'Cracking/Splitting', description: 'Material stress cracks' }
];

export default function Wizard() {
  const [step, setStep] = useState('select'); // select, questions, diagnosis, solution
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);

  const startWizard = async (defect) => {
    setSelectedDefect(defect);
    setLoading(true);
    setStep('questions');

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a 3D printing diagnostic expert. Generate 4-6 diagnostic questions to troubleshoot "${defect.name}" (${defect.description}).

Questions should:
- Progress from general to specific
- Help narrow down root cause
- Be answerable with yes/no or multiple choice
- Cover: printer settings, material, environment, hardware condition

For each question, provide 2-4 answer options that help diagnose the issue.`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        value: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      setQuestions(result.questions || []);
    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const answerQuestion = (answer) => {
    const newAnswers = { ...answers, [currentQuestionIndex]: answer };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      generateDiagnosis(newAnswers);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const generateDiagnosis = async (finalAnswers) => {
    setLoading(true);
    setStep('diagnosis');

    try {
      const answersText = questions.map((q, i) => 
        `Q: ${q.question}\nA: ${finalAnswers[i]?.label || 'Not answered'}`
      ).join('\n\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on these diagnostic answers for "${selectedDefect.name}", provide a detailed diagnosis and solutions:

${answersText}

Provide:
1. Root cause analysis (2-3 most likely causes ranked by probability)
2. Step-by-step solutions (5-8 specific actions)
3. Settings to adjust (with exact values or ranges)
4. Prevention tips (how to avoid this in future)

Be specific, actionable, and prioritize solutions by ease of implementation.`,
        response_json_schema: {
          type: "object",
          properties: {
            root_causes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cause: { type: "string" },
                  probability: { type: "string", enum: ["high", "medium", "low"] },
                  explanation: { type: "string" }
                }
              }
            },
            solutions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "number" },
                  action: { type: "string" },
                  details: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "moderate", "advanced"] }
                }
              }
            },
            settings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  setting: { type: "string" },
                  current_issue: { type: "string" },
                  recommended: { type: "string" }
                }
              }
            },
            prevention: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setDiagnosis(result);
      setStep('solution');
    } catch (error) {
      console.error('Failed to generate diagnosis:', error);
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep('select');
    setSelectedDefect(null);
    setQuestions([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setDiagnosis(null);
  };

  const probabilityConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    low: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' }
  };

  const difficultyConfig = {
    easy: { color: 'text-emerald-400', label: '✓ Easy' },
    moderate: { color: 'text-amber-400', label: '◆ Moderate' },
    advanced: { color: 'text-purple-400', label: '★ Advanced' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Troubleshooting Wizard</h1>
            <p className="text-sm text-slate-400">Step-by-step defect diagnosis</p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Defect */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">What issue are you experiencing?</h2>
                <p className="text-slate-400 text-sm">Select a defect to start diagnostics</p>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {COMMON_DEFECTS.map((defect) => (
                  <motion.button
                    key={defect.id}
                    onClick={() => startWizard(defect)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/50 transition-all text-left"
                  >
                    <h3 className="text-white font-medium mb-1">{defect.name}</h3>
                    <p className="text-slate-400 text-sm">{defect.description}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Questions */}
          {step === 'questions' && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                  <p className="text-slate-400">Generating diagnostic questions...</p>
                </div>
              ) : questions.length > 0 ? (
                <div className="space-y-6">
                  {/* Progress */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Question {currentQuestionIndex + 1} of {questions.length}</span>
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-0">
                        {selectedDefect?.name}
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Question */}
                  <motion.div
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
                  >
                    <h3 className="text-lg font-semibold text-white mb-4">
                      {questions[currentQuestionIndex]?.question}
                    </h3>
                    <div className="space-y-2">
                      {questions[currentQuestionIndex]?.options.map((option, i) => (
                        <button
                          key={i}
                          onClick={() => answerQuestion(option)}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-lg border-2 transition-all",
                            answers[currentQuestionIndex]?.value === option.value
                              ? "border-cyan-500 bg-cyan-500/10"
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                          )}
                        >
                          <span className="text-white">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <Button
                      onClick={previousQuestion}
                      disabled={currentQuestionIndex === 0}
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      onClick={restart}
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                    >
                      Start Over
                    </Button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Step 3: Diagnosis Loading */}
          {step === 'diagnosis' && loading && (
            <motion.div
              key="diagnosis-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
              <p className="text-slate-400">Analyzing your answers...</p>
            </motion.div>
          )}

          {/* Step 4: Solution */}
          {step === 'solution' && diagnosis && (
            <motion.div
              key="solution"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-6 border border-cyan-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-xl font-semibold text-white">Diagnosis Complete</h2>
                </div>
                <p className="text-slate-300 text-sm">Here's what we found and how to fix it</p>
              </div>

              {/* Root Causes */}
              {diagnosis.root_causes?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Most Likely Causes</h3>
                  <div className="space-y-3">
                    {diagnosis.root_causes.map((cause, i) => {
                      const prob = probabilityConfig[cause.probability] || probabilityConfig.medium;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "bg-slate-800/50 rounded-xl p-4 border",
                            prob.border
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <AlertCircle className={cn("w-5 h-5 mt-0.5 flex-shrink-0", prob.color)} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium">{cause.cause}</span>
                                <Badge className={cn(prob.bg, prob.color, "border-0 text-xs")}>
                                  {cause.probability} probability
                                </Badge>
                              </div>
                              <p className="text-slate-300 text-sm">{cause.explanation}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Solutions */}
              {diagnosis.solutions?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Step-by-Step Solutions</h3>
                  <div className="space-y-3">
                    {diagnosis.solutions.map((solution, i) => {
                      const diff = difficultyConfig[solution.difficulty] || difficultyConfig.moderate;
                      return (
                        <div
                          key={i}
                          className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-cyan-400 font-semibold text-sm">{solution.step}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium">{solution.action}</span>
                                <span className={cn("text-xs", diff.color)}>{diff.label}</span>
                              </div>
                              <p className="text-slate-300 text-sm">{solution.details}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settings */}
              {diagnosis.settings?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Settings to Adjust</h3>
                  <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    {diagnosis.settings.map((setting, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-4",
                          i !== diagnosis.settings.length - 1 && "border-b border-slate-700/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium">{setting.setting}</span>
                          <ArrowRight className="w-4 h-4 text-cyan-400" />
                        </div>
                        <p className="text-slate-400 text-sm mb-1">{setting.current_issue}</p>
                        <p className="text-cyan-300 text-sm font-medium">{setting.recommended}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prevention */}
              {diagnosis.prevention?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Prevention Tips</h3>
                  <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                    <ul className="space-y-2">
                      {diagnosis.prevention.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-emerald-200 text-sm">
                          <span className="text-emerald-400 mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Restart Button */}
              <Button
                onClick={restart}
                className="w-full h-12 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
              >
                Diagnose Another Issue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}