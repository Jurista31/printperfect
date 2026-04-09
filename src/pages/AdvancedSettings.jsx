import React from 'react';
import { motion } from 'framer-motion';
import { Settings2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAISettings } from '@/hooks/useAISettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function SectionTitle({ children }) {
  return <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-6 first:mt-0">{children}</p>;
}

function ToggleRow({ label, description, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-700/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5',
          value ? 'bg-cyan-500' : 'bg-slate-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200',
            value ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

function SegmentedControl({ label, description, value, options, onChange }) {
  return (
    <div className="py-3 border-b border-slate-700/40 last:border-0">
      <p className="text-sm font-medium text-white mb-0.5">{label}</p>
      {description && <p className="text-xs text-slate-500 mb-2">{description}</p>}
      <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
              value === opt.value
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdvancedSettings() {
  const { settings, updateSettings, resetSettings } = useAISettings();

  const handleReset = () => {
    resetSettings();
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Advanced Settings</h1>
              <p className="text-xs text-slate-500">AI analysis parameters</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </motion.div>

        {/* Info banner */}
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="mb-5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            These settings apply globally to all AI analyses. Changes take effect immediately on your next analysis.
          </p>
        </motion.div>

        {/* Print Analysis section */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4">
          <SectionTitle>Print Image Analysis</SectionTitle>

          <SegmentedControl
            label="Analysis Depth"
            description="Controls how thoroughly the AI scans for defects."
            value={settings.analysisDepth}
            options={[
              { value: 'quick', label: 'Quick' },
              { value: 'standard', label: 'Standard' },
              { value: 'deep', label: 'Deep Dive' },
            ]}
            onChange={v => updateSettings({ analysisDepth: v })}
          />

          <SegmentedControl
            label="Minimum Confidence Threshold"
            description="Only report defects the AI is at least this confident about."
            value={settings.imageQualityThreshold}
            options={[
              { value: 'low', label: 'Low (50%+)' },
              { value: 'medium', label: 'Medium (70%+)' },
              { value: 'high', label: 'High (90%+)' },
            ]}
            onChange={v => updateSettings({ imageQualityThreshold: v })}
          />

          <SegmentedControl
            label="Defect Tolerance Level"
            description="How strictly the AI judges minor imperfections."
            value={settings.defectToleranceLevel}
            options={[
              { value: 'strict', label: 'Strict' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'lenient', label: 'Lenient' },
            ]}
            onChange={v => updateSettings({ defectToleranceLevel: v })}
          />

          <SegmentedControl
            label="Minimum Defect Severity to Report"
            description="Suppress defects below this severity level."
            value={settings.minDefectSeverity}
            options={[
              { value: 'low', label: 'All (Low+)' },
              { value: 'medium', label: 'Medium+' },
              { value: 'high', label: 'High Only' },
            ]}
            onChange={v => updateSettings({ minDefectSeverity: v })}
          />

          <SectionTitle>Include in Analysis</SectionTitle>

          <ToggleRow
            label="Community Comparison"
            description="Show how your print compares to community quality standards."
            value={settings.includeCommunityComparison}
            onChange={v => updateSettings({ includeCommunityComparison: v })}
          />

          <ToggleRow
            label="Predictive Failure Analysis"
            description="Predict potential failures if current defects worsen."
            value={settings.includePredictiveAnalysis}
            onChange={v => updateSettings({ includePredictiveAnalysis: v })}
          />

          <ToggleRow
            label="Advanced Troubleshooting"
            description="Include filament quality, environmental, and wear pattern analysis."
            value={settings.includeAdvancedTroubleshooting}
            onChange={v => updateSettings({ includeAdvancedTroubleshooting: v })}
          />
        </motion.div>

        {/* G-Code Analysis section */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <SectionTitle>G-Code Analysis</SectionTitle>

          <SegmentedControl
            label="Analysis Depth"
            description="Controls how deeply the AI examines your G-code."
            value={settings.gcodeAnalysisDepth}
            options={[
              { value: 'quick', label: 'Quick' },
              { value: 'standard', label: 'Standard' },
              { value: 'deep', label: 'Deep Dive' },
            ]}
            onChange={v => updateSettings({ gcodeAnalysisDepth: v })}
          />

          <SectionTitle>Checks to Include</SectionTitle>

          <ToggleRow
            label="Travel Move Analysis"
            description="Detect long travel moves that may cause stringing or blobs."
            value={settings.gcodeCheckTravelMoves}
            onChange={v => updateSettings({ gcodeCheckTravelMoves: v })}
          />

          <ToggleRow
            label="Layer Height Consistency"
            description="Check for inconsistent layer heights or Z-step errors."
            value={settings.gcodeCheckLayerHeight}
            onChange={v => updateSettings({ gcodeCheckLayerHeight: v })}
          />

          <ToggleRow
            label="Temperature Commands"
            description="Detect missing or unsafe temperature change sequences."
            value={settings.gcodeCheckTemperature}
            onChange={v => updateSettings({ gcodeCheckTemperature: v })}
          />

          <ToggleRow
            label="Optimized Settings Suggestions"
            description="Generate speed and temperature recommendations based on model geometry."
            value={settings.gcodeOptimizeSettings}
            onChange={v => updateSettings({ gcodeOptimizeSettings: v })}
          />
        </motion.div>
      </div>
    </div>
  );
}