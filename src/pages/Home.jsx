import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, History, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import CameraCapture from '@/components/CameraCapture';
import AnalysisResults from '@/components/AnalysisResults';
import AnalysisHistory from '@/components/AnalysisHistory';
import LoadingAnalysis from '@/components/LoadingAnalysis';

const ANALYSIS_PROMPT = `You are an expert 3D printing troubleshooter. Analyze this image of a 3D print and identify any defects or quality issues.

For each defect found, provide:
1. The name of the defect (e.g., "Stringing", "Layer Shifting", "Under-extrusion", "Warping", "Elephant's Foot", "Z-Banding", "Ghosting/Ringing", "Bed Adhesion Issues", "Over-extrusion", "Clogged Nozzle Signs")
2. Severity level (low, medium, or high)
3. A brief description of what you see
4. Possible causes (2-4 causes)
5. Step-by-step solutions to fix it (2-5 actionable steps)

Also provide:
- An overall quality assessment (poor, fair, good, or excellent)
- A brief summary of the print's condition
- Recommended printer settings adjustments if applicable

Be thorough but practical. Focus on actionable advice that a hobbyist can implement.`;

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    defects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
          causes: { type: "array", items: { type: "string" } },
          solutions: { type: "array", items: { type: "string" } }
        }
      }
    },
    overall_quality: { type: "string", enum: ["poor", "fair", "good", "excellent"] },
    summary: { type: "string" },
    printer_settings_suggestions: { type: "array", items: { type: "string" } }
  }
};

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 50),
  });

  const createAnalysisMutation = useMutation({
    mutationFn: (data) => base44.entities.PrintAnalysis.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    }
  });

  const handleCapture = async (file) => {
    setIsAnalyzing(true);
    
    try {
      // Upload the image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Analyze with AI
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: ANALYSIS_PROMPT,
        file_urls: [file_url],
        response_json_schema: ANALYSIS_SCHEMA
      });

      // Save to database
      const analysisData = {
        image_url: file_url,
        ...result
      };
      
      const savedAnalysis = await createAnalysisMutation.mutateAsync(analysisData);
      setCurrentAnalysis({ ...analysisData, id: savedAnalysis.id, created_date: new Date().toISOString() });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewAnalysis = () => {
    setCurrentAnalysis(null);
  };

  const handleSelectFromHistory = (analysis) => {
    setCurrentAnalysis(analysis);
    setHistoryOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PrintDoc</h1>
              <p className="text-xs text-slate-500">3D Print Analyzer</p>
            </div>
          </div>

          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <History className="w-5 h-5" />
                {analyses.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">
                    {analyses.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-900 border-slate-800 w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  Analysis History
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 -mx-2 px-2 overflow-y-auto max-h-[calc(100vh-120px)]">
                <AnalysisHistory
                  analyses={analyses}
                  onSelect={handleSelectFromHistory}
                  selectedId={currentAnalysis?.id}
                />
              </div>
            </SheetContent>
          </Sheet>
        </motion.header>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadingAnalysis />
            </motion.div>
          ) : currentAnalysis ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AnalysisResults
                analysis={currentAnalysis}
                onNewAnalysis={handleNewAnalysis}
              />
            </motion.div>
          ) : (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Analyze Your Print
                </h2>
                <p className="text-slate-400">
                  Take a photo or upload an image of your 3D print to identify defects and get fixes
                </p>
              </div>

              <CameraCapture
                onCapture={handleCapture}
                isAnalyzing={isAnalyzing}
              />

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50"
              >
                <h3 className="text-sm font-medium text-slate-300 mb-3">📸 Tips for best results</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    Use good lighting to capture details
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    Focus on areas with visible defects
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    Include multiple angles if possible
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}