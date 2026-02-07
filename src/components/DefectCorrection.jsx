import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Edit3, AlertTriangle, Save } from "lucide-react";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import CategorySelector from "./CategorySelector";

export default function DefectCorrection({ defect, defectIndex, analysisId, onCorrectionSaved }) {
  const [isEditing, setIsEditing] = useState(false);
  const [correctedName, setCorrectedName] = useState(defect.name);
  const [correctedSeverity, setCorrectedSeverity] = useState(defect.severity);
  const [isFalsePositive, setIsFalsePositive] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [confidence, setConfidence] = useState('certain');
  const [categories, setCategories] = useState([]);
  const [customTags, setCustomTags] = useState([]);

  const saveCorrectionMutation = useMutation({
    mutationFn: (data) => base44.entities.DefectCorrection.create(data),
    onSuccess: () => {
      toast.success('Correction saved! This helps improve AI accuracy.');
      setIsEditing(false);
      onCorrectionSaved?.();
    },
    onError: () => {
      toast.error('Failed to save correction');
    }
  });

  const handleSave = () => {
    const hasChanges = 
      correctedName !== defect.name || 
      correctedSeverity !== defect.severity || 
      isFalsePositive;

    if (!hasChanges && !userNotes) {
      toast.info('No changes to save');
      return;
    }

    const correctionData = {
      analysis_id: analysisId,
      defect_index: defectIndex,
      original_name: defect.name,
      original_severity: defect.severity,
      corrected_name: correctedName,
      corrected_severity: correctedSeverity,
      is_false_positive: isFalsePositive,
      user_notes: userNotes || undefined,
      confidence,
      categories: categories.length > 0 ? categories : undefined,
      custom_tags: customTags.length > 0 ? customTags : undefined
    };

    saveCorrectionMutation.mutate(correctionData);
  };

  const severityColors = {
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 p-4">
      <div className="space-y-3">
        {/* Header with edit toggle */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={correctedName}
                onChange={(e) => setCorrectedName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                placeholder="Defect name"
              />
            ) : (
              <h4 className="font-medium text-white">{defect.name}</h4>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Severity */}
        <div>
          <span className="text-xs text-slate-400 block mb-1">Severity</span>
          {isEditing ? (
            <Select value={correctedSeverity} onValueChange={setCorrectedSeverity}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={cn("text-xs", severityColors[defect.severity])}>
              {defect.severity}
            </Badge>
          )}
        </div>

        {/* False Positive Toggle */}
        {isEditing && (
          <div>
            <button
              onClick={() => setIsFalsePositive(!isFalsePositive)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all w-full",
                isFalsePositive
                  ? "border-red-500 bg-red-500/10"
                  : "border-slate-600 bg-slate-900"
              )}
            >
              <AlertTriangle className={cn("w-4 h-4", isFalsePositive ? "text-red-400" : "text-slate-500")} />
              <span className={cn("text-sm", isFalsePositive ? "text-red-400" : "text-slate-400")}>
                This is a false positive (not actually present)
              </span>
            </button>
          </div>
        )}

        {/* User Notes */}
        {isEditing && (
          <div>
            <label className="text-xs text-slate-400 block mb-1">Additional Notes</label>
            <Textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Explain the correction or provide context..."
              className="bg-slate-900 border-slate-600 text-white min-h-[60px] text-sm"
            />
          </div>
        )}

        {/* Confidence */}
        {isEditing && (
          <div>
            <label className="text-xs text-slate-400 block mb-1">Your Confidence</label>
            <div className="flex gap-2">
              <button
                onClick={() => setConfidence('certain')}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border transition-all text-sm",
                  confidence === 'certain'
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : "border-slate-600 bg-slate-900 text-slate-400"
                )}
              >
                Certain
              </button>
              <button
                onClick={() => setConfidence('uncertain')}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border transition-all text-sm",
                  confidence === 'uncertain'
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-slate-600 bg-slate-900 text-slate-400"
                )}
              >
                Uncertain
              </button>
            </div>
          </div>
        )}

        {/* Category Selector */}
        {isEditing && (
          <CategorySelector
            defectName={correctedName}
            defectDescription={defect.description || userNotes}
            selectedCategories={categories}
            customTags={customTags}
            onCategoriesChange={setCategories}
            onCustomTagsChange={setCustomTags}
          />
        )}

        {/* Save Button */}
        {isEditing && (
          <Button
            onClick={handleSave}
            disabled={saveCorrectionMutation.isPending}
            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
          >
            {saveCorrectionMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Correction
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}