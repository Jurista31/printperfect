import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from "framer-motion";
import { Heart, MessageCircle, User, CheckCircle2, AlertTriangle, Wrench, Settings2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import CommentSection from "./CommentSection";
import { toast } from "sonner";

const statusConfig = {
  successful: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Successful" },
  problematic: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", label: "Problematic" },
  work_in_progress: { icon: Wrench, color: "text-cyan-400", bg: "bg-cyan-500/10", label: "Work in Progress" }
};

export default function CommunityCard({ sharedAnalysis, index }) {
  const [showComments, setShowComments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
        await base44.entities.Like.create({
          shared_analysis_id: sharedAnalysis.id,
          user_email: user.email
        });
        await base44.entities.SharedAnalysis.update(sharedAnalysis.id, {
          likes_count: (sharedAnalysis.likes_count || 0) + 1
        });
      }
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['shared-analyses'] });
      
      // Snapshot previous value
      const previousAnalyses = queryClient.getQueryData(['shared-analyses']);
      
      // Optimistically update like count
      queryClient.setQueryData(['shared-analyses'], (old) => {
        if (!old) return old;
        return old.map(item => 
          item.id === sharedAnalysis.id
            ? { 
                ...item, 
                likes_count: userLike 
                  ? Math.max(0, (item.likes_count || 0) - 1)
                  : (item.likes_count || 0) + 1
              }
            : item
        );
      });
      
      // Optimistically update user like status
      queryClient.setQueryData(['like', sharedAnalysis.id], userLike ? null : { id: 'optimistic' });
      
      return { previousAnalyses };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousAnalyses) {
        queryClient.setQueryData(['shared-analyses'], context.previousAnalyses);
      }
      toast.error('Failed to update like');
      console.error(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['like', sharedAnalysis.id] });
      queryClient.invalidateQueries({ queryKey: ['shared-analyses'] });
    }
  });

  const status = statusConfig[sharedAnalysis.status] || statusConfig.work_in_progress;
  const StatusIcon = status.icon;
  const hasProfile = sharedAnalysis.print_profile && Object.keys(sharedAnalysis.print_profile).some(
    key => sharedAnalysis.print_profile[key] !== undefined && sharedAnalysis.print_profile[key] !== null
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
          <User className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{sharedAnalysis.user_name}</p>
          <p className="text-xs text-slate-500">
            {format(new Date(sharedAnalysis.created_date), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <Badge className={cn("flex items-center gap-1.5", status.bg, status.color, "border-0")}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </Badge>
      </div>

      {/* Image */}
      {sharedAnalysis.image_url && (
        <div className="relative aspect-video bg-slate-900">
          <img
            src={sharedAnalysis.image_url}
            alt={sharedAnalysis.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{sharedAnalysis.title}</h3>
          {sharedAnalysis.description && (
            <p className="text-slate-300 text-sm leading-relaxed">{sharedAnalysis.description}</p>
          )}
        </div>

        {/* Defects */}
        {sharedAnalysis.defects && sharedAnalysis.defects.length > 0 && (
          <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase">Identified Issues</p>
            <div className="flex flex-wrap gap-2">
              {sharedAnalysis.defects.map((defect, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-md bg-slate-800 text-xs text-slate-300 border border-slate-700"
                >
                  {defect.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Solutions Applied */}
        {sharedAnalysis.solutions_applied && sharedAnalysis.solutions_applied.length > 0 && (
          <div className="bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-lg p-3 border border-cyan-500/20">
            <p className="text-xs font-medium text-cyan-400 uppercase mb-2">Solutions Applied</p>
            <ul className="space-y-1.5">
              {sharedAnalysis.solutions_applied.map((solution, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-cyan-400 mt-0.5">✓</span>
                  {solution}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Print Profile */}
        {hasProfile && (
          <div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors mb-2"
            >
              <Settings2 className="w-4 h-4" />
              Print Profile Settings
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                showSettings && "rotate-180"
              )} />
            </button>
            
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="bg-slate-900/50 rounded-lg p-3 space-y-2"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {sharedAnalysis.print_profile.printer_model && (
                    <div>
                      <span className="text-slate-500">Printer:</span>
                      <span className="text-slate-300 ml-2">{sharedAnalysis.print_profile.printer_model}</span>
                    </div>
                  )}
                  {sharedAnalysis.print_profile.material && (
                    <div>
                      <span className="text-slate-500">Material:</span>
                      <span className="text-slate-300 ml-2">{sharedAnalysis.print_profile.material}</span>
                    </div>
                  )}
                  {sharedAnalysis.print_profile.nozzle_temp && (
                    <div>
                      <span className="text-slate-500">Nozzle:</span>
                      <span className="text-slate-300 ml-2">{sharedAnalysis.print_profile.nozzle_temp}°C</span>
                    </div>
                  )}
                  {sharedAnalysis.print_profile.bed_temp && (
                    <div>
                      <span className="text-slate-500">Bed:</span>
                      <span className="text-slate-300 ml-2">{sharedAnalysis.print_profile.bed_temp}°C</span>
                    </div>
                  )}
                  {sharedAnalysis.print_profile.print_speed && (
                    <div>
                      <span className="text-slate-500">Speed:</span>
                      <span className="text-slate-300 ml-2">{sharedAnalysis.print_profile.print_speed}mm/s</span>
                    </div>
                  )}
                  {sharedAnalysis.print_profile.layer_height && (
                    <div>
                      <span className="text-slate-500">Layer:</span>
                      <span className="text-slate-300 ml-2">{sharedAnalysis.print_profile.layer_height}mm</span>
                    </div>
                  )}
                  {sharedAnalysis.print_profile.infill && (
                    <div>
                      <span className="text-slate-500">Infill:</span>
                      <span className="text-slate-300 ml-2">{sharedAnalysis.print_profile.infill}%</span>
                    </div>
                  )}
                </div>
                {sharedAnalysis.print_profile.notes && (
                  <p className="text-sm text-slate-400 pt-2 border-t border-slate-700">
                    <span className="font-medium">Notes:</span> {sharedAnalysis.print_profile.notes}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2 border-t border-slate-700/50 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => likeMutation.mutate()}
          disabled={likeMutation.isPending}
          className={cn(
            "flex items-center gap-2 hover:bg-slate-700",
            userLike && "text-red-400"
          )}
        >
          <Heart className={cn("w-4 h-4", userLike && "fill-current")} />
          <span>{sharedAnalysis.likes_count || 0}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 hover:bg-slate-700"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{sharedAnalysis.comments_count || 0}</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-slate-700/50 bg-slate-900/30">
          <CommentSection sharedAnalysisId={sharedAnalysis.id} />
        </div>
      )}
    </motion.div>
  );
}