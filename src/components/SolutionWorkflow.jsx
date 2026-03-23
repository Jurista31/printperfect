import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, ArrowRight, ArrowLeft, Check, Upload, 
  Loader2, X, Wand2, Printer, FlaskConical, AlertTriangle, Lightbulb, Gauge
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import CategorySelector from './CategorySelector';

const STEPS = ['Problem', 'Solution', 'Hardware', 'Categories', 'Images', 'Review'];

const NOZZLE_SIZES = ['0.2mm', '0.4mm', '0.6mm', '0.8mm', '1.0mm'];

export default function SolutionWorkflow({ analysis, open, onOpenChange, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    problemDescription: '',
    solutionDescription: '',
    defectType: '',
    categories: [],
    customTags: [],
    formattedSteps: [],
    keyActions: [],
    difficulty: '',
    estimatedTime: null,
    troubleshootingNotes: [],
    commonPitfalls: [],
    suggestedPrinterModels: [],
    suggestedMaterials: [],
    filamentType: '',
    nozzleSize: '',
    printSpeed: '',
    beforeImage: null,
    afterImage: null,
    beforeImageUrl: '',
    afterImageUrl: ''
  });

  useEffect(() => {
    if (analysis && open) {
      setFormData(prev => ({
        ...prev,
        defectType: analysis.defects?.[0]?.name || '',
        title: `Fixed: ${analysis.defects?.[0]?.name || 'Print Issue'}`,
        beforeImageUrl: analysis.image_url || ''
      }));
    }
  }, [analysis, open]);

  const formatSolutionMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('formatSolution', {
        problemDescription: formData.problemDescription,
        solutionDescription: formData.solutionDescription,
        defectType: formData.defectType
      });
      return response.data;
    },
    onSuccess: (data) => {
      setFormData(prev => ({
        ...prev,
        formattedSteps: data.formatted_steps || [],
        keyActions: data.key_actions || [],
        difficulty: data.difficulty || 'moderate',
        estimatedTime: data.estimated_time || null,
        troubleshootingNotes: data.troubleshooting_notes || [],
        commonPitfalls: data.common_pitfalls || [],
        suggestedPrinterModels: data.suggested_printer_models || [],
        suggestedMaterials: data.suggested_materials || []
      }));
      toast.success('Solution formatted by AI!');
    },
    onError: () => toast.error('Failed to format solution')
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    }
  });

  const handleImageUpload = async (type, file) => {
    if (!file) return;
    try {
      const url = await uploadImageMutation.mutateAsync(file);
      setFormData(prev => ({ ...prev, [type]: file, [`${type}Url`]: url }));
      toast.success('Image uploaded!');
    } catch {
      toast.error('Failed to upload image');
    }
  };

  const submitWorkflow = async () => {
    try {
      await base44.entities.SharedAnalysis.create({
        analysis_id: analysis?.id,
        image_url: formData.afterImageUrl || formData.beforeImageUrl,
        title: formData.title,
        description: formData.problemDescription,
        status: 'successful',
        defects: analysis?.defects || [{ name: formData.defectType, severity: 'medium', description: formData.problemDescription }],
        solutions_applied: formData.formattedSteps.length > 0 ? formData.formattedSteps : [formData.solutionDescription],
        print_profile: {
          printer_model: formData.suggestedPrinterModels[0] || '',
          material: formData.filamentType || formData.suggestedMaterials[0] || '',
          print_speed: formData.printSpeed ? parseFloat(formData.printSpeed) : undefined,
          notes: [
            formData.nozzleSize && `Nozzle: ${formData.nozzleSize}`,
            formData.estimatedTime && `Fix time: ~${formData.estimatedTime} min`,
            formData.difficulty && `Difficulty: ${formData.difficulty}`
          ].filter(Boolean).join(' | ')
        },
        user_name: (await base44.auth.me()).full_name || 'Anonymous'
      });
      toast.success('Solution shared with community!');
      onComplete?.();
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error('Failed to share solution');
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({
      title: '', problemDescription: '', solutionDescription: '', defectType: '',
      categories: [], customTags: [], formattedSteps: [], keyActions: [],
      difficulty: '', estimatedTime: null, troubleshootingNotes: [], commonPitfalls: [],
      suggestedPrinterModels: [], suggestedMaterials: [],
      filamentType: '', nozzleSize: '', printSpeed: '',
      beforeImage: null, afterImage: null, beforeImageUrl: '', afterImageUrl: ''
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.problemDescription.length > 10 && formData.defectType;
      case 1: return formData.solutionDescription.length > 10;
      case 2: return true; // Hardware is optional
      case 3: return formData.categories.length > 0;
      case 4: return formData.beforeImageUrl || formData.afterImageUrl;
      case 5: return formData.title;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {

      // ── Step 0: Problem ──────────────────────────────────────────────────────
      case 0:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">What problem did you encounter?</label>
              <Textarea
                value={formData.problemDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, problemDescription: e.target.value }))}
                placeholder="Describe the issue you faced in detail..."
                className="bg-slate-800 border-slate-700 text-white min-h-32"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Main defect type</label>
              <Input
                value={formData.defectType}
                onChange={(e) => setFormData(prev => ({ ...prev, defectType: e.target.value }))}
                placeholder="e.g., Stringing, Layer Separation..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </motion.div>
        );

      // ── Step 1: Solution ─────────────────────────────────────────────────────
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">How did you solve it?</label>
              <Textarea
                value={formData.solutionDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, solutionDescription: e.target.value }))}
                placeholder="Describe what you did to fix the problem..."
                className="bg-slate-800 border-slate-700 text-white min-h-32"
              />
            </div>
            <Button
              onClick={() => formatSolutionMutation.mutate()}
              disabled={formatSolutionMutation.isPending || !formData.solutionDescription}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              {formatSolutionMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI Formatting...</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" />Format with AI</>
              )}
            </Button>

            {formData.formattedSteps.length > 0 && (
              <div className="space-y-3">
                {/* Steps */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">AI-Formatted Steps</span>
                  </div>
                  <ol className="space-y-2">
                    {formData.formattedSteps.map((step, idx) => (
                      <li key={idx} className="text-sm text-slate-300 flex gap-2">
                        <span className="font-medium text-cyan-400 shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  {formData.difficulty && (
                    <div className="flex gap-2 pt-2 border-t border-slate-700">
                      <Badge className="bg-slate-700 text-slate-300">{formData.difficulty}</Badge>
                      {formData.estimatedTime && (
                        <Badge className="bg-slate-700 text-slate-300">~{formData.estimatedTime} min</Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Troubleshooting Notes */}
                {formData.troubleshootingNotes.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Lightbulb className="w-4 h-4" />
                      <span className="text-sm font-medium">Troubleshooting Notes</span>
                    </div>
                    <ul className="space-y-1.5">
                      {formData.troubleshootingNotes.map((note, idx) => (
                        <li key={idx} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-amber-400 shrink-0">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Common Pitfalls */}
                {formData.commonPitfalls.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Common Pitfalls</span>
                    </div>
                    <ul className="space-y-1.5">
                      {formData.commonPitfalls.map((pitfall, idx) => (
                        <li key={idx} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-red-400 shrink-0">•</span>
                          <span>{pitfall}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI-Suggested Printers & Materials */}
                {(formData.suggestedPrinterModels.length > 0 || formData.suggestedMaterials.length > 0) && (
                  <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-teal-400">
                      <Printer className="w-4 h-4" />
                      <span className="text-sm font-medium">AI-Suggested Printers & Materials</span>
                    </div>
                    {formData.suggestedPrinterModels.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Commonly affected printers:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.suggestedPrinterModels.map((model, idx) => (
                            <Badge key={idx} className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs">
                              {model}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {formData.suggestedMaterials.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Relevant materials:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.suggestedMaterials.map((mat, idx) => (
                            <Badge key={idx} className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs">
                              {mat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );

      // ── Step 2: Hardware ─────────────────────────────────────────────────────
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <p className="text-sm text-slate-400">
              Share the hardware details used in your successful resolution. This helps others replicate your fix.
              <span className="text-slate-500"> (Optional)</span>
            </p>

            {/* AI Suggestions quick-fill */}
            {(formData.suggestedMaterials.length > 0) && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  AI suggests these materials — tap to use:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {formData.suggestedMaterials.map((mat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFormData(prev => ({ ...prev, filamentType: mat }))}
                      className={cn(
                        "text-xs px-2 py-1 rounded-full border transition-colors",
                        formData.filamentType === mat
                          ? "bg-cyan-500/30 border-cyan-500/50 text-cyan-300"
                          : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                      )}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Filament Type */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-400" />
                  Filament Type
                </label>
                <Input
                  value={formData.filamentType}
                  onChange={(e) => setFormData(prev => ({ ...prev, filamentType: e.target.value }))}
                  placeholder="e.g., PLA, PETG, ABS, TPU..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* Nozzle Size */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                  <Printer className="w-4 h-4 text-teal-400" />
                  Nozzle Size
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {NOZZLE_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => setFormData(prev => ({ ...prev, nozzleSize: prev.nozzleSize === size ? '' : size }))}
                      className={cn(
                        "text-sm px-3 py-1.5 rounded-lg border transition-colors",
                        formData.nozzleSize === size
                          ? "bg-teal-500/30 border-teal-500/50 text-teal-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <Input
                  value={formData.nozzleSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, nozzleSize: e.target.value }))}
                  placeholder="Or enter custom size..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* Print Speed */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  Print Speed (mm/s)
                </label>
                <Input
                  type="number"
                  value={formData.printSpeed}
                  onChange={(e) => setFormData(prev => ({ ...prev, printSpeed: e.target.value }))}
                  placeholder="e.g., 60"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </motion.div>
        );

      // ── Step 3: Categories ───────────────────────────────────────────────────
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <p className="text-sm text-slate-400">Help others find your solution by selecting relevant categories</p>
            <CategorySelector
              defectName={formData.defectType}
              defectDescription={formData.problemDescription}
              selectedCategories={formData.categories}
              customTags={formData.customTags}
              onCategoriesChange={(cats) => setFormData(prev => ({ ...prev, categories: cats }))}
              onCustomTagsChange={(tags) => setFormData(prev => ({ ...prev, customTags: tags }))}
            />
          </motion.div>
        );

      // ── Step 4: Images ───────────────────────────────────────────────────────
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <p className="text-sm text-slate-400">Add before and after images to show your progress</p>
            <div className="grid grid-cols-2 gap-4">
              {['before', 'after'].map((type) => {
                const urlKey = `${type}ImageUrl`;
                const color = type === 'before' ? 'red' : 'emerald';
                return (
                  <div key={type}>
                    <label className="text-sm font-medium text-slate-300 mb-2 block capitalize">{type}</label>
                    {formData[urlKey] ? (
                      <div className={`relative aspect-square rounded-lg overflow-hidden border-2 border-${color}-500/50`}>
                        <img src={formData[urlKey]} alt={type} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setFormData(prev => ({ ...prev, [`${type}Image`]: null, [urlKey]: '' }))}
                          className="absolute top-2 right-2 bg-slate-900/80 p-1 rounded-full hover:bg-slate-800"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => handleImageUpload(`${type}Image`, e.target.files[0])} />
                        <Upload className="w-8 h-8 text-slate-600 mb-2" />
                        <span className="text-sm text-slate-500">Upload</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );

      // ── Step 5: Review ───────────────────────────────────────────────────────
      case 5:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Give your solution a title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Fixed Stringing with Temperature Adjustment"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white">Preview</h4>
              <div className="space-y-2.5 text-sm">
                <div>
                  <span className="text-slate-500">Problem:</span>
                  <p className="text-slate-300">{formData.problemDescription}</p>
                </div>
                <div>
                  <span className="text-slate-500">Solution Steps:</span>
                  <ol className="text-slate-300 ml-4 list-decimal mt-1 space-y-0.5">
                    {(formData.formattedSteps.length > 0 ? formData.formattedSteps : [formData.solutionDescription])
                      .map((step, idx) => <li key={idx}>{step}</li>)}
                  </ol>
                </div>
                {(formData.filamentType || formData.nozzleSize || formData.printSpeed) && (
                  <div>
                    <span className="text-slate-500">Hardware:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {formData.filamentType && <Badge className="bg-purple-500/20 text-purple-300 text-xs">{formData.filamentType}</Badge>}
                      {formData.nozzleSize && <Badge className="bg-teal-500/20 text-teal-300 text-xs">Nozzle {formData.nozzleSize}</Badge>}
                      {formData.printSpeed && <Badge className="bg-amber-500/20 text-amber-300 text-xs">{formData.printSpeed} mm/s</Badge>}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Categories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.categories.map(cat => (
                      <Badge key={cat} className="bg-cyan-500/20 text-cyan-300 text-xs">{cat}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Document Your Solution
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            {STEPS.map((step, idx) => (
              <span key={step} className={cn(
                "transition-colors",
                idx === currentStep ? "text-cyan-400 font-medium" : "text-slate-600"
              )}>
                {step}
              </span>
            ))}
          </div>
          <Progress value={(currentStep / (STEPS.length - 1)) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-slate-800">
          <Button
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0}
            variant="outline"
            className="border-slate-700 text-slate-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button
              onClick={submitWorkflow}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
            >
              <Check className="w-4 h-4 mr-2" />
              Share Solution
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}