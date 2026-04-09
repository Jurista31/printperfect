import { useState, useEffect } from 'react';

export const AI_SETTINGS_KEY = 'printdoc_ai_settings';

export const DEFAULT_AI_SETTINGS = {
  // Print Analysis
  analysisDepth: 'standard',          // 'quick' | 'standard' | 'deep'
  imageQualityThreshold: 'medium',    // 'low' | 'medium' | 'high' — min confidence to report
  defectToleranceLevel: 'balanced',   // 'strict' | 'balanced' | 'lenient'
  minDefectSeverity: 'low',           // 'low' | 'medium' | 'high' — hide defects below this
  includeCommunityComparison: true,
  includePredictiveAnalysis: true,
  includeAdvancedTroubleshooting: true,
  // G-Code Analysis
  gcodeAnalysisDepth: 'standard',     // 'quick' | 'standard' | 'deep'
  gcodeCheckTravelMoves: true,
  gcodeCheckLayerHeight: true,
  gcodeCheckTemperature: true,
  gcodeOptimizeSettings: true,
};

export function useAISettings() {
  const [settings, setSettingsState] = useState(() => {
    try {
      const stored = localStorage.getItem(AI_SETTINGS_KEY);
      return stored ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(stored) } : DEFAULT_AI_SETTINGS;
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  });

  const updateSettings = (updates) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetSettings = () => {
    localStorage.removeItem(AI_SETTINGS_KEY);
    setSettingsState(DEFAULT_AI_SETTINGS);
  };

  return { settings, updateSettings, resetSettings };
}

export function getStoredAISettings() {
  try {
    const stored = localStorage.getItem(AI_SETTINGS_KEY);
    return stored ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(stored) } : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}