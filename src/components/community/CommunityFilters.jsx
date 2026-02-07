import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFECT_CATEGORIES = [
  "Extrusion Issues",
  "Layer Problems",
  "Surface Quality",
  "Temperature-Related",
  "Bed Adhesion",
  "Mechanical Issues",
  "Material Issues",
  "Support Problems"
];

const COMMON_PRINTERS = [
  "Ender 3", "Ender 5", "CR-10", "Prusa i3 MK3", "Prusa MINI",
  "Bambu Lab X1", "Bambu Lab P1P", "Artillery Sidewinder",
  "Anycubic Kobra", "Creality K1", "Other"
];

const MATERIALS = [
  "PLA", "PETG", "ABS", "TPU", "Nylon", "ASA", "PC", "Other"
];

export default function CommunityFilters({ filters, onFiltersChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  const handleApply = () => {
    onFiltersChange(tempFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      search: '',
      printerModel: [],
      material: [],
      defectCategories: [],
      hasSettings: false
    };
    setTempFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const toggleArrayFilter = (key, value) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  const activeFilterCount = 
    (filters.printerModel?.length || 0) +
    (filters.material?.length || 0) +
    (filters.defectCategories?.length || 0) +
    (filters.hasSettings ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder="Search posts..."
          className="pl-10 bg-slate-800 border-slate-700 text-white h-12 rounded-xl"
        />
      </div>

      {/* Advanced Filters Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-12 bg-slate-800 border-slate-700 text-white hover:bg-slate-700 rounded-xl"
          >
            <SlidersHorizontal className="w-5 h-5 mr-2" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-cyan-500 text-white">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="bg-slate-900 border-slate-800 max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-cyan-400" />
              Filter Community Posts
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Printer Model */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-3 block">
                Printer Model
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_PRINTERS.map(printer => (
                  <button
                    key={printer}
                    onClick={() => toggleArrayFilter('printerModel', printer)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm transition-all border",
                      tempFilters.printerModel.includes(printer)
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    {printer}
                  </button>
                ))}
              </div>
            </div>

            {/* Material */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-3 block">
                Filament Type
              </label>
              <div className="flex flex-wrap gap-2">
                {MATERIALS.map(material => (
                  <button
                    key={material}
                    onClick={() => toggleArrayFilter('material', material)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm transition-all border",
                      tempFilters.material.includes(material)
                        ? "bg-purple-500/20 border-purple-500 text-purple-300"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>

            {/* Defect Categories */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-3 block">
                Defect Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFECT_CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleArrayFilter('defectCategories', category)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm transition-all border",
                      tempFilters.defectCategories.includes(category)
                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Has Settings */}
            <div>
              <button
                onClick={() => setTempFilters(prev => ({ ...prev, hasSettings: !prev.hasSettings }))}
                className={cn(
                  "w-full px-4 py-3 rounded-lg text-sm transition-all border flex items-center justify-between",
                  tempFilters.hasSettings
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                )}
              >
                <span>Posts with detailed printer settings</span>
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center",
                  tempFilters.hasSettings ? "border-emerald-500 bg-emerald-500" : "border-slate-600"
                )}>
                  {tempFilters.hasSettings && <X className="w-3 h-3 text-white" />}
                </div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 h-12 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Reset
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1 h-12 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {filters.printerModel.map(printer => (
            <Badge
              key={printer}
              className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 pr-1"
            >
              {printer}
              <button
                onClick={() => onFiltersChange({
                  ...filters,
                  printerModel: filters.printerModel.filter(p => p !== printer)
                })}
                className="ml-1 hover:text-cyan-100"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.material.map(material => (
            <Badge
              key={material}
              className="bg-purple-500/20 text-purple-300 border border-purple-500/30 pr-1"
            >
              {material}
              <button
                onClick={() => onFiltersChange({
                  ...filters,
                  material: filters.material.filter(m => m !== material)
                })}
                className="ml-1 hover:text-purple-100"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.defectCategories.map(category => (
            <Badge
              key={category}
              className="bg-amber-500/20 text-amber-300 border border-amber-500/30 pr-1"
            >
              {category}
              <button
                onClick={() => onFiltersChange({
                  ...filters,
                  defectCategories: filters.defectCategories.filter(c => c !== category)
                })}
                className="ml-1 hover:text-amber-100"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.hasSettings && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 pr-1">
              Has Settings
              <button
                onClick={() => onFiltersChange({ ...filters, hasSettings: false })}
                className="ml-1 hover:text-emerald-100"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </motion.div>
      )}
    </div>
  );
}