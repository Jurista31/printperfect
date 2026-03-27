import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Search, X, ChevronDown, Printer, FlaskConical, Bug, TrendingUp, Clock, Flame, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import SolutionCard from '@/components/community/SolutionCard';

const DEFECT_TYPES = [
  "Stringing", "Layer Shifting", "Warping", "Under-extrusion", "Over-extrusion",
  "Ghosting", "Z-banding", "Elephant Foot", "Poor Adhesion", "Pillowing",
  "Cracking", "Sagging", "Heat Creep", "Clogging"
];

const PRINTER_MODELS = [
  "Ender 3", "Ender 5", "CR-10", "Prusa i3 MK3", "Prusa MINI",
  "Bambu Lab X1", "Bambu Lab P1P", "Bambu Lab P1S", "Artillery Sidewinder",
  "Anycubic Kobra", "Creality K1"
];

const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "Nylon", "ASA", "PC", "Resin"];

function FilterChip({ label, active, color = 'cyan', onClick, onRemove }) {
  const colors = {
    cyan: active ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500',
    purple: active ? 'bg-purple-500/20 border-purple-500/60 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500',
    amber: active ? 'bg-amber-500/20 border-amber-500/60 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500',
  };
  return (
    <button
      onClick={onClick}
      className={cn("px-3 py-1.5 rounded-full text-xs border transition-all flex items-center gap-1.5", colors[color])}
    >
      {label}
      {active && onRemove && (
        <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); onRemove(); }} />
      )}
    </button>
  );
}

function FilterSection({ title, icon: Icon, color, items, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 6);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-sm font-medium text-slate-300">{title}</span>
        {selected.length > 0 && (
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full", color, "bg-slate-800")}>{selected.length}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map(item => (
          <FilterChip
            key={item}
            label={item}
            active={selected.includes(item)}
            color={color === 'text-cyan-400' ? 'cyan' : color === 'text-purple-400' ? 'purple' : 'amber'}
            onClick={() => onToggle(item)}
          />
        ))}
        {items.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
          >
            {expanded ? 'Show less' : `+${items.length - 6} more`}
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CommunitySolutions() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedPrinters, setSelectedPrinters] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [selectedDefects, setSelectedDefects] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [touchStart, setTouchStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: allShared = [], isLoading, refetch } = useQuery({
    queryKey: ['community-solutions'],
    queryFn: () => base44.entities.SharedAnalysis.filter({ status: 'successful' }, '-created_date', 200),
  });

  const toggle = (setter, val) => setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const filtered = useMemo(() => {
    return allShared
      .filter(item => {
        if (search) {
          const q = search.toLowerCase();
          const inTitle = item.title?.toLowerCase().includes(q);
          const inDesc = item.description?.toLowerCase().includes(q);
          const inDefects = item.defects?.some(d => d.name?.toLowerCase().includes(q));
          const inSolutions = item.solutions_applied?.some(s => s?.toLowerCase().includes(q));
          if (!inTitle && !inDesc && !inDefects && !inSolutions) return false;
        }
        if (selectedPrinters.length > 0) {
          const model = item.print_profile?.printer_model || '';
          if (!selectedPrinters.some(p => model.toLowerCase().includes(p.toLowerCase()))) return false;
        }
        if (selectedMaterials.length > 0) {
          const mat = item.print_profile?.material || '';
          if (!selectedMaterials.some(m => mat.toLowerCase().includes(m.toLowerCase()))) return false;
        }
        if (selectedDefects.length > 0) {
          const names = item.defects?.map(d => d.name?.toLowerCase()) || [];
          const sols = item.solutions_applied?.map(s => s?.toLowerCase()) || [];
          const haystack = [...names, ...sols].join(' ');
          if (!selectedDefects.some(d => haystack.includes(d.toLowerCase()))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return (b.likes_count || 0) - (a.likes_count || 0);
        if (sortBy === 'discussed') return (b.comments_count || 0) - (a.comments_count || 0);
        return new Date(b.created_date) - new Date(a.created_date);
      });
  }, [allShared, search, selectedPrinters, selectedMaterials, selectedDefects, sortBy]);

  const activeCount = selectedPrinters.length + selectedMaterials.length + selectedDefects.length;

  const handleTouchStart = (e) => { if (window.scrollY === 0) setTouchStart(e.touches[0].clientY); };
  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && touchStart > 0) {
      const d = e.touches[0].clientY - touchStart;
      if (d > 0) { if (d > 10) e.preventDefault(); setPullDistance(Math.min(d, 100)); }
    }
  };
  const handleTouchEnd = async () => {
    if (pullDistance > 70) { setIsRefreshing(true); await refetch(); setTimeout(() => setIsRefreshing(false), 500); }
    setPullDistance(0); setTouchStart(0);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh */}
      {pullDistance > 0 && (
        <div className="fixed top-14 left-0 right-0 flex justify-center z-50"
          style={{ opacity: Math.min(pullDistance / 70, 1) }}>
          <div className="bg-slate-800 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl">
            <RefreshCw className={cn("w-4 h-4 text-cyan-400", isRefreshing && "animate-spin")} />
            <span className="text-sm text-slate-300">{isRefreshing ? 'Refreshing...' : 'Release to refresh'}</span>
          </div>
        </div>
      )}

      {/* Backgrounds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 pb-24">

        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Community Solutions</h1>
              <p className="text-sm text-slate-400">
                {isLoading ? 'Loading...' : `${filtered.length} verified fix${filtered.length !== 1 ? 'es' : ''}`}
                {allShared.length > 0 && !isLoading && ` from ${allShared.length} total`}
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            Real-world successful fixes shared by the community — filter by your printer, material, or defect type.
          </p>
        </motion.header>

        {/* Search + Sort + Filter toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3 mb-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search defects, solutions, titles..."
                className="pl-9 bg-slate-800 border-slate-700 text-white h-11 rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-11 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl px-4",
                showFilters && "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
              )}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeCount > 0 && (
                <Badge className="ml-2 bg-cyan-500 text-white text-xs px-1.5 py-0">{activeCount}</Badge>
              )}
            </Button>
          </div>

          {/* Sort tabs */}
          <Tabs value={sortBy} onValueChange={setSortBy}>
            <TabsList className="bg-slate-800 border border-slate-700 w-full">
              <TabsTrigger value="recent" className="flex-1 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />Recent
              </TabsTrigger>
              <TabsTrigger value="popular" className="flex-1 flex items-center gap-1.5 text-xs">
                <Flame className="w-3.5 h-3.5" />Popular
              </TabsTrigger>
              <TabsTrigger value="discussed" className="flex-1 flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5" />Discussed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Expandable Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-5"
            >
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-5">
                <FilterSection
                  title="Printer Model"
                  icon={Printer}
                  color="text-cyan-400"
                  items={PRINTER_MODELS}
                  selected={selectedPrinters}
                  onToggle={(v) => toggle(setSelectedPrinters, v)}
                />
                <div className="border-t border-slate-700/50" />
                <FilterSection
                  title="Filament Material"
                  icon={FlaskConical}
                  color="text-purple-400"
                  items={MATERIALS}
                  selected={selectedMaterials}
                  onToggle={(v) => toggle(setSelectedMaterials, v)}
                />
                <div className="border-t border-slate-700/50" />
                <FilterSection
                  title="Defect Type"
                  icon={Bug}
                  color="text-amber-400"
                  items={DEFECT_TYPES}
                  selected={selectedDefects}
                  onToggle={(v) => toggle(setSelectedDefects, v)}
                />
                {activeCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedPrinters([]); setSelectedMaterials([]); setSelectedDefects([]); }}
                    className="text-slate-400 hover:text-white w-full"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Clear all filters
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter pills */}
        {activeCount > 0 && !showFilters && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 mb-4">
            {selectedPrinters.map(p => (
              <FilterChip key={p} label={p} active color="cyan" onClick={() => toggle(setSelectedPrinters, p)} onRemove={() => toggle(setSelectedPrinters, p)} />
            ))}
            {selectedMaterials.map(m => (
              <FilterChip key={m} label={m} active color="purple" onClick={() => toggle(setSelectedMaterials, m)} onRemove={() => toggle(setSelectedMaterials, m)} />
            ))}
            {selectedDefects.map(d => (
              <FilterChip key={d} label={d} active color="amber" onClick={() => toggle(setSelectedDefects, d)} onRemove={() => toggle(setSelectedDefects, d)} />
            ))}
          </motion.div>
        )}

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-800/50 rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-5">
            {filtered.map((item, idx) => (
              <SolutionCard key={item.id} sharedAnalysis={item} index={idx} />
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <Wrench className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {activeCount > 0 || search ? 'No Solutions Match' : 'No Solutions Yet'}
            </h3>
            <p className="text-slate-400 max-w-sm mx-auto text-sm">
              {activeCount > 0 || search
                ? 'Try adjusting or clearing your filters to see more results.'
                : 'Be the first to share a successful fix with the community!'}
            </p>
            {(activeCount > 0 || search) && (
              <Button
                variant="outline"
                className="mt-4 border-slate-700 text-slate-300"
                onClick={() => { setSelectedPrinters([]); setSelectedMaterials([]); setSelectedDefects([]); setSearch(''); }}
              >
                Clear All Filters
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}