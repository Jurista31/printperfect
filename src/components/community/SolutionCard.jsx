import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from "framer-motion";
import {
  Heart, MessageCircle, User, CheckCircle2, Printer, FlaskConical,
  Gauge, ChevronDown, Settings2, Lightbulb, AlertTriangle, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import CommentSection from "./CommentSection";
import SolutionVotes from "./SolutionVotes";
import { toast } from "sonner";

// Parse notes field from print_profile for nozzle size / difficulty / fix time
function parseNotes(notes = '') {
  const nozzle = notes.match(/Nozzle:\s*([^\s|]+)/)?.[1];
  const time = notes.match(/Fix time:\s*~?([^\s|]+)/)?.[1];
  const difficulty = notes.match(/Difficulty:\s*([^\s|]+)/)?.[1];
  return { nozzle, time, difficulty };
}

const difficultyColor = {
  easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  moderate: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  advanced: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export default function SolutionCard({ sharedAnalysis, index }) {
  const [showComments, setShowComments] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const queryClient = useQueryClient();

  const { data: userLike } = useQuery({
    queryKey: ['like', sharedAnalysis.id],
    queryFn: async () => {
      const user = await base44.auth.me();
      const likes = await base44.entities.Like.filter({
        shared_analysis_id: sharedAnalysis.id,
        user_email: user.email
      });
      return likes.length > 0 ? likes[0] : null;
    }
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      if (userLike) {
        await base44.entities.Like.delete(userLike.id);
        await base44.entities.SharedAnalysis.update(sharedAnalysis.id, {
          likes_count: Math.max(0, (sharedAnalysis.likes_count || 0) - 1)
        });
      } else {
        await base44.entities.Like.create({ shared_analysis_id: sharedAnalysis.id, user_email: user.email });
        await base44.entities.SharedAnalysis.update(sharedAnalysis.id, {
          likes_count: (sharedAnalysis.likes_count || 0) + 1
        });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['community-solutions'] });
      const prev = queryClient.getQueryData(['community-solutions']);
      queryClient.setQueryData(['community-solutions'], (old) =>
        old?.map(item => item.id === sharedAnalysis.id
          ? { ...item, likes_count: userLike ? Math.max(0, (item.likes_count || 0) - 1) : (item.likes_count || 0) + 1 }
          : item
        )
      );
      queryClient.setQueryData(['like', sharedAnalysis.id], userLike ? null : { id: 'optimistic' });
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['community-solutions'], ctx.prev);
      toast.error('Failed to update like');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['like', sharedAnalysis.id] });
      queryClient.invalidateQueries({ queryKey: ['community-solutions'] });
    }
  });

  const profile = sharedAnalysis.print_profile || {};
  const hasProfile = profile.printer_model || profile.material || profile.print_speed || profile.notes;
  const { nozzle, time, difficulty } = parseNotes(profile.notes);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Verified fix banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-medium text-emerald-400">Verified Fix</span>
        {difficulty && (
          <Badge className={cn("ml-auto text-xs border", difficultyColor[difficulty] || difficultyColor.moderate)}>
            {difficulty}
          </Badge>
        )}
        {time && (
          <span className="text-xs text-slate-500">~{time} fix</span>
        )}
      </div>

      {/* Author */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
          <User className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{sharedAnalysis.user_name || 'Community Member'}</p>
          <p className="text-xs text-slate-500">
            {format(new Date(sharedAnalysis.created_date), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Image */}
      {sharedAnalysis.image_url && (
        <div className="relative aspect-video bg-slate-900">
          <img src={sharedAnalysis.image_url} alt={sharedAnalysis.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-base font-semibold text-white mb-1">{sharedAnalysis.title}</h3>
          {sharedAnalysis.description && (
            <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{sharedAnalysis.description}</p>
          )}
        </div>

        {/* Quick hardware badges */}
        {(profile.printer_model || profile.material || nozzle || profile.print_speed) && (
          <div className="flex flex-wrap gap-2">
            {profile.printer_model && (
              <Badge className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs flex items-center gap-1">
                <Printer className="w-3 h-3" />{profile.printer_model}
              </Badge>
            )}
            {profile.material && (
              <Badge className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />{profile.material}
              </Badge>
            )}
            {nozzle && (
              <Badge className="bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs">
                Nozzle {nozzle}
              </Badge>
            )}
            {profile.print_speed && (
              <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs flex items-center gap-1">
                <Gauge className="w-3 h-3" />{profile.print_speed} mm/s
              </Badge>
            )}
          </div>
        )}

        {/* Defects */}
        {sharedAnalysis.defects?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Issues Fixed</p>
            <div className="flex flex-wrap gap-1.5">
              {sharedAnalysis.defects.map((d, i) => (
                <span key={i} className={cn(
                  "px-2 py-1 rounded-md text-xs border",
                  d.severity === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : d.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                )}>
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Solutions with voting */}
        {sharedAnalysis.solutions_applied?.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl p-3 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Steps That Worked</p>
            </div>
            {sharedAnalysis.solutions_applied.map((sol, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-300 flex-1 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
                  {sol}
                </p>
                <SolutionVotes sharedAnalysisId={sharedAnalysis.id} solution={sol} />
              </div>
            ))}
          </div>
        )}

        {/* Full print profile toggle */}
        {hasProfile && (profile.nozzle_temp || profile.bed_temp || profile.layer_height || profile.infill) && (
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Full print profile
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showProfile && "rotate-180")} />
          </button>
        )}

        {showProfile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-slate-900/60 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm overflow-hidden"
          >
            {profile.nozzle_temp && <div><span className="text-slate-500">Nozzle Temp:</span><span className="text-slate-300 ml-2">{profile.nozzle_temp}°C</span></div>}
            {profile.bed_temp && <div><span className="text-slate-500">Bed Temp:</span><span className="text-slate-300 ml-2">{profile.bed_temp}°C</span></div>}
            {profile.layer_height && <div><span className="text-slate-500">Layer:</span><span className="text-slate-300 ml-2">{profile.layer_height}mm</span></div>}
            {profile.infill && <div><span className="text-slate-500">Infill:</span><span className="text-slate-300 ml-2">{profile.infill}%</span></div>}
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-2 border-t border-slate-700/50 pt-3">
        <Button
          variant="ghost" size="sm"
          onClick={() => likeMutation.mutate()}
          disabled={likeMutation.isPending}
          className={cn("flex items-center gap-2 hover:bg-slate-700", userLike && "text-red-400")}
        >
          <Heart className={cn("w-4 h-4", userLike && "fill-current")} />
          <span>{sharedAnalysis.likes_count || 0}</span>
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 hover:bg-slate-700"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{sharedAnalysis.comments_count || 0}</span>
        </Button>
      </div>

      {showComments && (
        <div className="border-t border-slate-700/50 bg-slate-900/30">
          <CommentSection sharedAnalysisId={sharedAnalysis.id} />
        </div>
      )}
    </motion.div>
  );
}