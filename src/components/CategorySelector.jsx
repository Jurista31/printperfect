import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PREDEFINED_CATEGORIES = [
  "Extrusion Issues",
  "Layer Problems",
  "Surface Quality",
  "Temperature-Related",
  "Bed Adhesion",
  "Mechanical Issues",
  "Material Issues",
  "Support Problems",
  "Retraction Issues",
  "Speed Issues"
];

export default function CategorySelector({ 
  defectName, 
  defectDescription, 
  selectedCategories = [], 
  customTags = [],
  onCategoriesChange,
  onCustomTagsChange 
}) {
  const [aiSuggested, setAiSuggested] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (defectName && defectDescription) {
      suggestCategories();
    }
  }, [defectName, defectDescription]);

  const suggestCategories = async () => {
    setIsLoading(true);
    try {
      const prompt = `You are an expert 3D printing defect classifier. Based on the following defect information, suggest 2-3 most relevant categories from this list: ${PREDEFINED_CATEGORIES.join(', ')}.

Defect Name: ${defectName}
Description: ${defectDescription}

Return ONLY a JSON array of category names that match exactly from the list above. Example: ["Extrusion Issues", "Temperature-Related"]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            categories: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const suggested = result.categories || [];
      setAiSuggested(suggested);
      
      // Auto-select AI suggestions that aren't already selected
      const newSelections = suggested.filter(cat => !selectedCategories.includes(cat));
      if (newSelections.length > 0) {
        onCategoriesChange([...selectedCategories, ...newSelections]);
      }
    } catch (error) {
      console.error('Failed to suggest categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const addCustomTag = () => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      onCustomTagsChange([...customTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeCustomTag = (tag) => {
    onCustomTagsChange(customTags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-4">
      {/* AI Suggestions Header */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-cyan-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>AI analyzing defect pattern...</span>
        </div>
      )}

      {aiSuggested.length > 0 && !isLoading && (
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">AI Suggested Categories</span>
        </div>
      )}

      {/* Predefined Categories */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">Select Categories</label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_CATEGORIES.map(category => {
            const isSelected = selectedCategories.includes(category);
            const isAiSuggested = aiSuggested.includes(category);
            
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-all border-2",
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500",
                  isAiSuggested && !isSelected && "border-cyan-500/30 ring-2 ring-cyan-500/20"
                )}
              >
                {isAiSuggested && <Sparkles className="w-3 h-3 inline mr-1" />}
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Tags */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">Custom Tags</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
            placeholder="Add custom tag..."
            className="bg-slate-800 border-slate-600 text-white"
          />
          <Button
            onClick={addCustomTag}
            disabled={!newTag.trim()}
            size="sm"
            className="bg-slate-700 hover:bg-slate-600"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {customTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customTags.map(tag => (
              <Badge
                key={tag}
                className="bg-purple-500/20 text-purple-300 border border-purple-500/30 pr-1"
              >
                {tag}
                <button
                  onClick={() => removeCustomTag(tag)}
                  className="ml-1 hover:text-purple-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}