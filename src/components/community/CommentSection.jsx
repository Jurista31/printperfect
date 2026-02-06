import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CommentSection({ sharedAnalysisId }) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', sharedAnalysisId],
    queryFn: () => base44.entities.Comment.filter(
      { shared_analysis_id: sharedAnalysisId },
      'created_date',
      100
    )
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content) => {
      const user = await base44.auth.me();
      
      const comment = await base44.entities.Comment.create({
        shared_analysis_id: sharedAnalysisId,
        user_name: user.full_name || user.email.split('@')[0],
        content
      });

      // Update comment count
      const sharedAnalysis = await base44.entities.SharedAnalysis.filter({ id: sharedAnalysisId });
      if (sharedAnalysis.length > 0) {
        await base44.entities.SharedAnalysis.update(sharedAnalysisId, {
          comments_count: (sharedAnalysis[0].comments_count || 0) + 1
        });
      }

      return comment;
    },
    onMutate: async (content) => {
      const user = await base44.auth.me();
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comments', sharedAnalysisId] });
      await queryClient.cancelQueries({ queryKey: ['shared-analyses'] });
      
      // Snapshot previous values
      const previousComments = queryClient.getQueryData(['comments', sharedAnalysisId]);
      const previousAnalyses = queryClient.getQueryData(['shared-analyses']);
      
      // Optimistically add comment
      const optimisticComment = {
        id: `optimistic-${Date.now()}`,
        shared_analysis_id: sharedAnalysisId,
        user_name: user.full_name || user.email.split('@')[0],
        content,
        created_date: new Date().toISOString()
      };
      
      queryClient.setQueryData(['comments', sharedAnalysisId], (old) => {
        return old ? [...old, optimisticComment] : [optimisticComment];
      });
      
      // Optimistically update comment count
      queryClient.setQueryData(['shared-analyses'], (old) => {
        if (!old) return old;
        return old.map(item => 
          item.id === sharedAnalysisId
            ? { ...item, comments_count: (item.comments_count || 0) + 1 }
            : item
        );
      });
      
      return { previousComments, previousAnalyses };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', sharedAnalysisId], context.previousComments);
      }
      if (context?.previousAnalyses) {
        queryClient.setQueryData(['shared-analyses'], context.previousAnalyses);
      }
      toast.error('Failed to post comment');
      console.error(error);
    },
    onSuccess: () => {
      setNewComment('');
      toast.success('Comment added');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', sharedAnalysisId] });
      queryClient.invalidateQueries({ queryKey: ['shared-analyses'] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Existing Comments */}
      <AnimatePresence>
        {comments.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="font-medium text-sm text-white mb-1">{comment.user_name}</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{comment.content}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-3">
                    {format(new Date(comment.created_date), "MMM d 'at' h:mm a")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="bg-slate-800 border-slate-700 text-white resize-none"
          rows={2}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newComment.trim() || createCommentMutation.isPending}
          className="bg-cyan-600 hover:bg-cyan-500 h-auto"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {comments.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-4">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
}