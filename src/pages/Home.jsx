import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, History, X, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import CameraCapture from '@/components/CameraCapture';
import AnalysisResults from '@/components/AnalysisResults';
import AnalysisHistory from '@/components/AnalysisHistory';
import LoadingAnalysis from '@/components/LoadingAnalysis';

const ANALYSIS_PROMPT = `You are a master 3D printing engineer with 15+ years of experience troubleshooting FDM/FFF prints. Analyze this image(s) with extreme precision.

**IMAGE QUALITY & LIGHTING HANDLING:**
Before analyzing defects, mentally normalize for image conditions:
- Compensate for poor/bright lighting, shadows, or reflections
- Account for image blur, low resolution, or compression artifacts  
- Consider camera angle distortions and perspective
- If lighting makes analysis difficult, note lower confidence for affected areas
- Don't confuse lighting shadows with actual print defects

**ACCURACY & FALSE POSITIVE PREVENTION:**
- Only report defects you are CONFIDENT about (70%+ certainty)
- If unsure, lower the severity or skip it rather than create false alarms
- Cross-check: Does this defect make physical sense for FDM printing?
- Distinguish between actual defects vs. normal print characteristics (e.g., slight layer lines are normal at 0.2mm)
- When in doubt, mention in summary but don't add as a formal defect

**CRITICAL: For EACH defect found, you MUST provide the bounding box coordinates showing WHERE on the image the defect is located.**

Bounding box format: Provide x, y, width, height as percentages (0-100) of the image dimensions.
- x: left edge position (0 = left side, 100 = right side)
- y: top edge position (0 = top, 100 = bottom)  
- width: box width as percentage of image width
- height: box height as percentage of image height

Example: A defect in the center covering 20% area would be: {x: 40, y: 40, width: 20, height: 20}

If a defect spans the entire print or is global (like overall quality), use the full image: {x: 0, y: 0, width: 100, height: 100}

DEFECT DETECTION - Look for ALL of these issues:

**Layer Issues:**
- Z-banding (periodic horizontal lines/bands, often from Z-axis wobble or inconsistent layer height)
- Layer shifting (misaligned layers, usually from belt tension or stepper motor issues)
- Layer separation/delamination (gaps between layers, poor layer adhesion)
- Inconsistent extrusion (varying line width, partial under/over-extrusion)

**Surface Quality:**
- Ghosting/ringing/echoing (ripples after sharp corners, from vibration)
- Surface imperfections (blobs, zits, pimples from retraction issues)
- Rough top surface (pillowing, gaps in top layers)
- Visible layer lines (excessive or uneven)
- Moire patterns (diagonal wave patterns)

**Extrusion Problems:**
- Stringing/oozing (thin strings between parts)
- Under-extrusion (gaps in walls, weak infill, missing layers)
- Over-extrusion (bulging walls, rough surface, elephant foot on first layer)
- Inconsistent flow (varying line thickness)

**Structural Issues:**
- Warping (corners lifting, base curling)
- Elephant's foot (first layer too wide/squished)
- Cracking (material stress, poor layer adhesion)
- Sagging/drooping (insufficient support, overhangs failing)

**Bed Adhesion:**
- Poor first layer (not sticking, gaps, uneven squish)
- Corner lifting (warping on base corners)
- Skirt/brim separation

**Temperature-Related:**
- Heat creep (clogging, inconsistent extrusion in upper layers)
- Stringing from high temperature
- Layer adhesion issues from low temperature
- Burnt/discolored filament

**Mechanical:**
- Clogged nozzle indicators (skipped layers, grinding sound marks)
- Belt artifacts (repeating patterns from belt teeth)
- Wobble patterns (from loose components)

For EACH defect found, provide:
1. **Name**: Precise defect name
2. **Severity**: low/medium/high (be realistic - not everything is high)
3. **Description**: What you observe in detail (location, extent, pattern)
4. **Location**: Bounding box coordinates {x, y, width, height} as percentages (REQUIRED)
5. **Causes**: 3-5 specific root causes ranked by likelihood
6. **Solutions**: 4-7 step-by-step fixes, ordered by ease of implementation
7. **Settings Impact**: Which specific printer settings to adjust

PRINTER SETTINGS - For each suggestion, specify:
- Which setting to change
- Current suspected value (if visible)
- Recommended value or direction (increase/decrease by X%)
- Why this helps the specific defect
- Priority (critical/important/minor)

PREDICTIVE FAILURE ANALYSIS:
Based on current defect patterns, predict:
- Potential failures if defects worsen (next 5-10 prints)
- Early warning signs to watch for
- Critical parameters at risk
- Preventive maintenance recommendations

ADVANCED TROUBLESHOOTING:
Consider additional factors:
- Filament quality indicators (brittleness, moisture absorption, age)
- Environmental factors (temperature, humidity, drafts)
- Printer age and wear patterns
- Material-specific issues (PLA vs PETG vs ABS)
- Maintenance schedule adherence

COMMUNITY COMPARISON:
- Rate this print quality vs typical community standards (percentile: 1-100)
- Common issues for similar prints in the community
- Your print's standout strengths compared to average
- Areas where this print underperforms vs community

ANALYSIS OUTPUT:
- Overall quality: poor/fair/good/excellent (be honest, most prints have some issues)
- Summary: 2-3 sentences on print condition
- Confidence level: How certain are you about the analysis (low/medium/high)
- Settings suggestions: Context-aware, defect-specific recommendations (5-10 items)

If MULTIPLE IMAGES provided from different angles:
- Cross-reference findings across all angles
- Note which defects are visible from which image number (1-N) in the visible_angles array
- Increase confidence when same defect visible from multiple angles
- Flag any contradictions between angles
- Provide a consolidated analysis
- For location bounding boxes, use the coordinates from the PRIMARY image (first image) where the defect is most clearly visible

Be CRITICAL but HELPFUL. Don't just say "looks good" - find the subtle issues that could be improved.`;

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
          location: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" }
            },
            required: ["x", "y", "width", "height"]
          },
          causes: { type: "array", items: { type: "string" } },
          solutions: { type: "array", items: { type: "string" } },
          settings_impact: { type: "array", items: { type: "string" } },
          visible_angles: { type: "array", items: { type: "number" } }
        },
        required: ["name", "severity", "description", "location", "causes", "solutions"]
      }
    },
    overall_quality: { type: "string", enum: ["poor", "fair", "good", "excellent"] },
    summary: { type: "string" },
    confidence_level: { type: "string", enum: ["low", "medium", "high"] },
    multi_angle_analysis: { type: "boolean" },
    printer_settings_suggestions: { 
      type: "array", 
      items: { 
        type: "object",
        properties: {
          setting: { type: "string" },
          current_suspected: { type: "string" },
          recommended: { type: "string" },
          reason: { type: "string" },
          priority: { type: "string", enum: ["critical", "important", "minor"] },
          related_defects: { type: "array", items: { type: "string" } }
        }
      } 
    },
    predictive_analysis: {
      type: "object",
      properties: {
        potential_failures: { type: "array", items: { type: "string" } },
        warning_signs: { type: "array", items: { type: "string" } },
        critical_parameters: { type: "array", items: { type: "string" } },
        preventive_maintenance: { type: "array", items: { type: "string" } }
      },
      required: ["potential_failures", "warning_signs", "critical_parameters", "preventive_maintenance"]
    },
    advanced_troubleshooting: {
      type: "object",
      properties: {
        filament_quality_indicators: { type: "array", items: { type: "string" } },
        environmental_factors: { type: "array", items: { type: "string" } },
        printer_wear_patterns: { type: "array", items: { type: "string" } },
        material_specific_issues: { type: "array", items: { type: "string" } }
      },
      required: ["filament_quality_indicators", "environmental_factors"]
    },
    community_comparison: {
      type: "object",
      properties: {
        quality_percentile: { type: "number", minimum: 1, maximum: 100 },
        common_issues_comparison: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        improvement_areas: { type: "array", items: { type: "string" } }
      },
      required: ["quality_percentile", "common_issues_comparison", "strengths", "improvement_areas"]
    }
  },
  required: ["defects", "overall_quality", "summary", "confidence_level", "printer_settings_suggestions", "predictive_analysis", "advanced_troubleshooting", "community_comparison"]
};

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [multiAngleMode, setMultiAngleMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const queryClient = useQueryClient();

  const { data: analyses = [], refetch } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 50),
  });

  // Pull-to-refresh for history
  const [touchStart, setTouchStart] = useState(0);
  
  const handleHistoryTouchStart = (e) => {
    const scrollContainer = e.currentTarget;
    if (scrollContainer.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleHistoryTouchMove = (e) => {
    const scrollContainer = e.currentTarget;
    if (scrollContainer.scrollTop === 0 && touchStart > 0) {
      const distance = e.touches[0].clientY - touchStart;
      if (distance > 0) {
        // Prevent browser back gesture conflict
        if (distance > 10) {
          e.preventDefault();
        }
        setPullDistance(Math.min(distance, 100));
      }
    }
  };

  const handleHistoryTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      await refetch();
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
    setPullDistance(0);
    setTouchStart(0);
  };

  const createAnalysisMutation = useMutation({
    mutationFn: (data) => base44.entities.PrintAnalysis.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    }
  });

  const handleCapture = async (filesOrFile) => {
    setIsAnalyzing(true);
    
    try {
      const files = Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile];
      
      // Upload all images
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const uploads = await Promise.all(uploadPromises);
      const fileUrls = uploads.map(u => u.file_url);
      
      // Fetch learned patterns from community data
      let learnedSection = '';
      try {
        const learningResponse = await base44.functions.invoke('enhanceAnalysisPrompt', {});
        if (learningResponse.data?.enhancedSection) {
          learnedSection = learningResponse.data.enhancedSection;
        }
      } catch (error) {
        console.error('Failed to fetch learned patterns:', error);
        // Continue without learned patterns
      }
      
      // Enhanced prompt with multi-angle + learned patterns
      let enhancedPrompt = ANALYSIS_PROMPT;
      
      if (learnedSection) {
        enhancedPrompt = `${ANALYSIS_PROMPT}\n\n${learnedSection}`;
      }
      
      if (files.length > 1) {
        enhancedPrompt += `\n\nIMPORTANT: You are analyzing ${files.length} images of the SAME print from different angles. Cross-reference all angles and provide a unified, high-confidence analysis. Note which defects are visible from which image number (1-${files.length}).`;
      }
      
      // Analyze with AI using enhanced prompt
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: enhancedPrompt,
        file_urls: fileUrls,
        response_json_schema: ANALYSIS_SCHEMA
      });

      // Save to database (store primary image)
      const analysisData = {
        image_url: fileUrls[0],
        ...result,
        multi_angle_analysis: files.length > 1,
        total_images: files.length
      };
      
      const savedAnalysis = await createAnalysisMutation.mutateAsync(analysisData);
      setCurrentAnalysis({ 
        ...analysisData, 
        id: savedAnalysis.id, 
        created_date: new Date().toISOString(),
        all_image_urls: fileUrls
      });
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
              <div 
                className="mt-6 -mx-2 px-2 overflow-y-auto max-h-[calc(100vh-120px)] relative"
                onTouchStart={handleHistoryTouchStart}
                onTouchMove={handleHistoryTouchMove}
                onTouchEnd={handleHistoryTouchEnd}
              >
                {pullDistance > 0 && (
                  <div 
                    className="absolute top-0 left-0 right-0 flex justify-center transition-opacity"
                    style={{ 
                      opacity: Math.min(pullDistance / 60, 1),
                      transform: `translateY(${Math.max(pullDistance - 60, 0)}px)`
                    }}
                  >
                    <div className="bg-slate-800 rounded-full px-3 py-1.5 flex items-center gap-2">
                      <RefreshCw className={cn("w-3.5 h-3.5 text-cyan-400", isRefreshing && "animate-spin")} />
                      <span className="text-xs text-slate-300">
                        {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
                      </span>
                    </div>
                  </div>
                )}
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
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Analyze Your Print
                </h2>
                <p className="text-slate-400">
                  Take photos or upload images to identify defects and get fixes
                </p>
              </div>

              {/* Multi-angle toggle */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-3 mb-6 bg-slate-800/50 rounded-xl p-3 border border-slate-700/50"
              >
                <span className="text-sm text-slate-400">Single Angle</span>
                <button
                  onClick={() => setMultiAngleMode(!multiAngleMode)}
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors",
                    multiAngleMode ? "bg-cyan-500" : "bg-slate-600"
                  )}
                >
                  <motion.div
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full"
                    animate={{ left: multiAngleMode ? "26px" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
                <span className={cn(
                  "text-sm font-medium",
                  multiAngleMode ? "text-cyan-400" : "text-slate-400"
                )}>
                  Multi-Angle (Enhanced) ⭐
                </span>
              </motion.div>

              <CameraCapture
                onCapture={handleCapture}
                isAnalyzing={isAnalyzing}
                multiAngle={multiAngleMode}
              />

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50"
              >
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  {multiAngleMode ? '🎯 Multi-Angle Analysis Tips' : '📸 Tips for best results'}
                </h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  {multiAngleMode ? (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        Capture front, side, top, and bottom angles
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        Show problem areas from different perspectives
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        More angles = higher confidence analysis
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        AI cross-references all angles for accuracy
                      </li>
                    </>
                  ) : (
                    <>
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
                        Enable multi-angle mode for better accuracy
                      </li>
                    </>
                  )}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}