import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, TrendingUp, Clock, Flame, RefreshCw, Wrench, ArrowRight, Bookmark, AlertCircle } from 'lucide-react';
import { getSavedPosts } from '@/components/community/SaveBookmarkButton';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileSelect } from "@/components/ui/mobile-select";
import CommunityCard from '@/components/community/CommunityCard';
import CommunityFilters from '@/components/community/CommunityFilters';
import { cn } from "@/lib/utils";

export default function Community() {
  const [sortBy, setSortBy] = useState('recent');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    printerModel: [],
    material: [],
    defectCategories: [],
    hasSettings: false
  });

  const { data: sharedAnalyses = [], isLoading, refetch } = useQuery({
    queryKey: ['shared-analyses'],
    queryFn: () => base44.entities.SharedAnalysis.list('-created_date', 100),
  });

  // Pull-to-refresh handlers
  const [touchStart, setTouchStart] = useState(0);
  
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && touchStart > 0) {
      const distance = e.touches[0].clientY - touchStart;
      if (distance > 0) {
        // Prevent conflict with browser gestures
        if (distance > 10) {
          e.preventDefault();
        }
        setPullDistance(Math.min(distance, 120));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await refetch();
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
    setPullDistance(0);
    setTouchStart(0);
  };

  const savedIds = getSavedPosts();

  // Filter and sort
  const filteredAnalyses = sharedAnalyses
    .filter(analysis => {
      // Saved only filter
      if (showSavedOnly && !savedIds.includes(analysis.id)) return false;
      // Status filter
      if (filterStatus !== 'all' && analysis.status !== filterStatus) return false;
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = analysis.title?.toLowerCase().includes(searchLower);
        const matchesDescription = analysis.description?.toLowerCase().includes(searchLower);
        const matchesDefects = analysis.defects?.some(d => 
          d.name?.toLowerCase().includes(searchLower)
        );
        if (!matchesTitle && !matchesDescription && !matchesDefects) return false;
      }
      
      // Printer model filter
      if (filters.printerModel.length > 0) {
        if (!analysis.print_profile?.printer_model) return false;
        const matches = filters.printerModel.some(model => 
          analysis.print_profile.printer_model.toLowerCase().includes(model.toLowerCase())
        );
        if (!matches) return false;
      }
      
      // Material filter
      if (filters.material.length > 0) {
        if (!analysis.print_profile?.material) return false;
        if (!filters.material.includes(analysis.print_profile.material)) return false;
      }
      
      // Defect categories filter (check against defect names)
      if (filters.defectCategories.length > 0) {
        if (!analysis.defects || analysis.defects.length === 0) return false;
        const hasMatchingCategory = analysis.defects.some(defect =>
          filters.defectCategories.some(cat =>
            defect.name?.toLowerCase().includes(cat.toLowerCase().split(' ')[0])
          )
        );
        if (!hasMatchingCategory) return false;
      }
      
      // Has settings filter
      if (filters.hasSettings) {
        if (!analysis.print_profile || 
            !analysis.print_profile.printer_model || 
            !analysis.print_profile.material) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.likes_count || 0) - (a.likes_count || 0);
      if (sortBy === 'discussed') return (b.comments_count || 0) - (a.comments_count || 0);
      if (sortBy === 'same_issue') return (b.same_issue_count || 0) - (a.same_issue_count || 0);
      if (sortBy === 'solved') {
        if (a.is_solved && !b.is_solved) return -1;
        if (!a.is_solved && b.is_solved) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      }
      return new Date(b.created_date) - new Date(a.created_date);
    });

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-14 left-0 right-0 flex justify-center z-50 transition-opacity"
          style={{ 
            opacity: Math.min(pullDistance / 80, 1),
            transform: `translateY(${Math.min(pullDistance - 80, 0)}px)`
          }}
        >
          <div className="bg-slate-800 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl">
            <RefreshCw className={cn("w-4 h-4 text-cyan-400", isRefreshing && "animate-spin")} />
            <span className="text-sm text-slate-300">
              {isRefreshing ? 'Refreshing...' : 'Release to refresh'}
            </span>
          </div>
        </div>
      )}
      
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Community</h1>
              <p className="text-sm text-slate-400">
                {sharedAnalyses.length} {sharedAnalyses.length === 1 ? 'print' : 'prints'} shared
              </p>
            </div>
          </div>
          <p className="text-slate-400 mt-3">
            Learn from others' experiences and share your own 3D printing journey
          </p>

          {/* Solutions feed shortcut */}
          <Link
            to="/CommunitySolutions"
            className="mt-4 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 hover:border-emerald-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-300">Community Solutions</p>
                <p className="text-xs text-slate-500">Filter verified fixes by printer, material & defect</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.header>

        {/* Advanced Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          <CommunityFilters filters={filters} onFiltersChange={setFilters} />

          {/* Sort and Status Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Tabs value={sortBy} onValueChange={setSortBy} className="w-full sm:w-auto">
                <TabsList className="bg-slate-800 border border-slate-700 w-full sm:w-auto">
                  <TabsTrigger value="recent"><Clock className="w-3.5 h-3.5 mr-1" />Recent</TabsTrigger>
                  <TabsTrigger value="popular"><Flame className="w-3.5 h-3.5 mr-1" />Popular</TabsTrigger>
                  <TabsTrigger value="discussed"><TrendingUp className="w-3.5 h-3.5 mr-1" />Discussed</TabsTrigger>
                  <TabsTrigger value="same_issue"><AlertCircle className="w-3.5 h-3.5 mr-1" />Same Issue</TabsTrigger>
                  <TabsTrigger value="solved">✅ Solved</TabsTrigger>
                </TabsList>
              </Tabs>
              <button
                onClick={() => setShowSavedOnly(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all self-start',
                  showSavedOnly
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                )}
              >
                <Bookmark className={cn('w-3.5 h-3.5', showSavedOnly && 'fill-current')} />
                {showSavedOnly ? 'Showing saved' : 'Show saved only'}
              </button>
            </div>

            <MobileSelect 
              value={filterStatus} 
              onValueChange={setFilterStatus}
              title="Filter by Status"
              trigger={
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
              }
            >
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="successful">✅ Successful</SelectItem>
              <SelectItem value="problematic">⚠️ Problematic</SelectItem>
              <SelectItem value="work_in_progress">🔧 Work in Progress</SelectItem>
            </MobileSelect>
          </div>
        </motion.div>

        {/* Community Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-800/50 rounded-2xl h-96 animate-pulse"
              />
            ))}
          </div>
        ) : filteredAnalyses.length > 0 ? (
          <div className="space-y-6">
            {filteredAnalyses.map((analysis, index) => (
              <CommunityCard
                key={analysis.id}
                sharedAnalysis={analysis}
                index={index}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filterStatus === 'all' ? 'No Posts Yet' : 'No Posts Match Filter'}
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              {filterStatus === 'all'
                ? 'Be the first to share your 3D printing experience with the community!'
                : 'Try adjusting your filters to see more posts'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}