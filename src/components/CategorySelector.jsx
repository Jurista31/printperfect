import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

const PREDEFINED_CATEGORIES = [
  "Extrusion Issues",
  "Layer Problems",
  "Surface Quality",
  "Temperature-Related",
  "Bed Adhesion",
  "Mechanical Issues",
  "Material Issues",
  "Support Problems",
  "Dimensional Accuracy",
  "Flow Issues"
];

export default function CategorySelector({ 
  defectName, 
  defectDescription,
  selectedCategories = [], 
  customTags = [],
  onCategoriesChange,
  onCustomTagsChange 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (defectName) {
      fetchSuggestions();
    }
  }, [defectName]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await base44.functions.invoke('suggestCategories', {
        defectName,
        defectDescription
      });
      
      if (response.data.suggestedCategories) {
        setSuggestions(response.data.suggestedCategories);
        
        // Auto-select high confidence suggestions
        const highConfidence = response.data.suggestedCategories
          .filter(s => s.confidence === 'high')
          .map(s => s.category);
        
        if (highConfidence.length > 0 && selectedCategories.length === 0) {
          onCategoriesChange(highConfidence);
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
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
      {/* AI Suggestions */}
      {loadingSuggestions ? (
        <div className="flex items-center gap-2 text-sm text-cyan-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing defect patterns...
        </div>
      ) : suggestions.length > 0 && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">AI Suggestions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(({ category, confidence }) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-all border",
                  selectedCategories.includes(category)
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-800 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                )}
              >
                {category}
                {confidence === 'high' && <span className="ml-1">✨</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Predefined Categories */}
      <div>
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_CATEGORIES.map(category => {
            const isSuggested = suggestions.some(s => s.category === category);
            const isSelected = selectedCategories.includes(category);
            
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-all border",
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : isSuggested
                    ? "bg-cyan-500/5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Tags */}
      <div>
        <label className="text-sm font-medium text-slate-300 mb-2 block">
          Custom Tags
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
            placeholder="Add custom tag..."
            className="bg-slate-800 border-slate-700 text-white"
          />
          <Button
            onClick={addCustomTag}
            size="icon"
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