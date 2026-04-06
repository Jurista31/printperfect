import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, Loader2, RotateCcw, Sparkles, Upload, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ImageDropZone from '@/components/compare/ImageDropZone';
import CompareReport from '@/components/compare/CompareReport';
import HistoryCompare from '@/components/compare/HistoryCompare';
import { cn } from '@/lib/utils';

const COMPARE_SCHEMA = {
  type: "object",
  properties: {
    overall_verdict: { type: "string", enum: ["improved", "regressed", "unchanged"] },
    overall_summary: { type: "string" },
    quality_score_a: { type: "number", minimum: 1, maximum: 10 },
    quality_score_b: { type: "number", minimum: 1, maximum: 10 },
    dimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dimension: { type: "string" },
          verdict: { type: "string", enum: ["improved", "regressed", "unchanged"] },
          summary: { type: "string" },
          detail: { type: "string" },
          print_a_observation: { type: "string" },
          print_b_observation: { type: "string" },
        },
        required: ["dimension", "verdict", "summary", "print_a_observation", "print_b_observation"]
      }
    },
    improvements: { type: "array", items: { type: "string" } },
    regressions: { type: "array", items: { type: "string" } },
    adjustments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          setting: { type: "string" },
          action: { type: "string" },
          reason: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["setting", "action", "priority"]
      }
    },
    next_steps: { type: "array", items: { type: "string" } }
  },
  required: ["overall_verdict", "overall_summary", "quality_score_a", "quality_score_b", "dimensions", "improvements", "regressions", "adjustments", "next_steps"]
};

const COMPARE_PROMPT = `You are a master 3D printing engineer. You are given TWO images of FDM 3D prints.
Image 1 = Print A (baseline / older print).
Image 2 = Print B (newer print / the one being improved).

Your task is to perform a rigorous side-by-side comparison and produce a detailed comparative report.

COMPARE these specific dimensions:
1. Layer consistency & quality (z-banding, layer shifts, layer height uniformity)
2. Surface finish (stringing, blobs, zits, roughness, ghosting/ringing)
3. Extrusion quality (under/over-extrusion, flow consistency, wall quality)
4. Structural integrity (warping, delamination, cracking, infill visibility)
5. Bed adhesion & first layer quality
6. Overall print sharpness and detail reproduction
7. Any new defects introduced in Print B vs Print A

For EACH dimension:
- State what you observe in Print A vs Print B
- Deliver a verdict: improved / regressed / unchanged
- Give a concise 1-sentence summary and a detailed explanation

OVERALL VERDICT: Has Print B improved, regressed, or stayed the same compared to Print A?
Score both prints on a 1-10 quality scale.

IMPROVEMENTS: Bullet list of specific things that got better from A to B.
REGRESSIONS: Bullet list of specific things that got worse from A to B.

PRINTER ADJUSTMENTS: Based on remaining defects in Print B (and any regressions), provide 4-8 actionable printer setting adjustments. For each:
- Which setting to change
- What action to take (e.g. "Reduce print speed by 10-15mm/s")
- Why it will help
- Priority: high / medium / low

NEXT STEPS: 3-5 prioritized, specific next actions the user should take to continue improving print quality.

Be direct, technical, and specific. Reference what you actually see in the images.`;

export default function Compare() {
  const [mode, setMode] = useState('upload'); // 'upload' | 'history'
  const [printA, setPrintA] = useState(null);
  const [printB, setPrintB] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const canCompare = printA && printB;

  const handleCompare = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      // Upload both images in parallel
      const [uploadA, uploadB] = await Promise.all([
        base44.integrations.Core.UploadFile({ file: printA.file }),
        base44.integrations.Core.UploadFile({ file: printB.file }),
      ]);

      // Optionally include active printer profile for tailored advice
      let profileContext = '';
      try {
        const profiles = await base44.entities.PrinterProfile.filter({ is_active: true }, '-created_date', 1);
        if (profiles?.length > 0) {
          const p = profiles[0];
          profileContext = `\n\nUSER'S ACTIVE PRINTER PROFILE (use for tailored adjustment advice):
- Printer: ${p.printer_model} | Nozzle: ${p.nozzle_size || 'unknown'} | Material: ${p.default_material || 'unknown'}
${p.default_nozzle_temp ? `- Nozzle Temp: ${p.default_nozzle_temp}°C` : ''}
${p.default_print_speed ? `- Print Speed: ${p.default_print_speed}mm/s` : ''}
${p.notes ? `- Notes: ${p.notes}` : ''}
Reference this printer's known characteristics when suggesting adjustments.`;
        }
      } catch (_) {}

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: COMPARE_PROMPT + profileContext,
        file_urls: [uploadA.file_url, uploadB.file_url],
        response_json_schema: COMPARE_SCHEMA,
      });

      setReport(result);
    } catch (err) {
      setError('Analysis failed. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setPrintA(null);
    setPrintB(null);
    setReport(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Compare Prints</h1>
              <p className="text-xs text-slate-500">AI-powered side-by-side analysis</p>
            </div>
          </div>
          {(report || printA || printB) && mode === 'upload' && (
            <button onClick={handleReset} className="text-slate-500 hover:text-slate-300 transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </motion.div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 mb-6">
          {[
            { id: 'upload', label: 'Upload Photos', icon: Upload },
            { id: 'history', label: 'From History', icon: History },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                mode === id
                  ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === 'history' ? (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HistoryCompare />
            </motion.div>
          ) : isAnalyzing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-slate-700/50 flex items-center justify-center">
                  <GitCompare className="w-9 h-9 text-cyan-400" />
                </div>
                <div className="absolute inset-0 rounded-2xl border-2 border-cyan-500/30 animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-semibold">Comparing prints…</p>
                <p className="text-sm text-slate-500">AI is analyzing both images</p>
              </div>
              <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
            </motion.div>
          ) : report ? (
            <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CompareReport
                report={report}
                imageA={printA.preview}
                imageB={printB.preview}
              />
            </motion.div>
          ) : (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Instructions */}
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-sm text-slate-400 leading-relaxed">
                Upload two prints to compare. <span className="text-cyan-400 font-medium">Print A</span> is your baseline, <span className="text-purple-400 font-medium">Print B</span> is the newer one. The AI will identify what improved, what regressed, and exactly what to adjust.
              </div>

              {/* Upload zones */}
              <div className="flex gap-4">
                <ImageDropZone
                  label="Baseline"
                  side="A"
                  image={printA}
                  onImage={setPrintA}
                  onClear={() => setPrintA(null)}
                />
                <ImageDropZone
                  label="New Print"
                  side="B"
                  image={printB}
                  onImage={setPrintB}
                  onClear={() => setPrintB(null)}
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}

              {/* Compare button */}
              <Button
                onClick={handleCompare}
                disabled={!canCompare}
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {canCompare ? 'Compare with AI' : 'Upload both prints to compare'}
              </Button>

              {/* Tips */}
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 space-y-2">
                <p className="text-xs font-medium text-slate-400">Tips for best results</p>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="flex items-start gap-1.5"><span className="text-cyan-400 mt-0.5">•</span>Use similar lighting and angles for both shots</li>
                  <li className="flex items-start gap-1.5"><span className="text-cyan-400 mt-0.5">•</span>Print the same model for a fair comparison</li>
                  <li className="flex items-start gap-1.5"><span className="text-cyan-400 mt-0.5">•</span>Capture the same defect areas from both prints</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}