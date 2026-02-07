import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ThumbsUp, Sparkles } from "lucide-react";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function SolutionVotes({ sharedAnalysisId, solution }) {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Get current user
  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch votes for this solution
  const { data: votes = [] } = useQuery({
    queryKey: ['solution-votes', sharedAnalysisId, solution],
    queryFn: () => base44.entities.SolutionVote.filter({
      shared_analysis_id: sharedAnalysisId,
      solution_text: solution
    }),
    enabled: !!sharedAnalysisId && !!solution
  });

  const helpfulVotes = votes.filter(v => v.vote_type === 'helpful').length;
  const userVote = user ? votes.find(v => v.user_email === user.email) : null;

  const voteMutation = useMutation({
    mutationFn: async (voteType) => {
      if (!user) {
        toast.error('Please sign in to vote');
        return;
      }

      if (userVote) {
        // Remove vote
        await base44.entities.SolutionVote.delete(userVote.id);
      } else {
        // Add vote
        await base44.entities.SolutionVote.create({
          shared_analysis_id: sharedAnalysisId,
          solution_text: solution,
          vote_type: voteType,
          user_email: user.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solution-votes'] });
    }
  });

  return (
    <Button
      onClick={() => voteMutation.mutate('helpful')}
      disabled={voteMutation.isPending}
      size="sm"
      variant={userVote ? "default" : "outline"}
      className={cn(
        "transition-all",
        userVote
          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 hover:bg-cyan-500/30"
          : "border-slate-600 text-slate-400 hover:bg-slate-700"
      )}
    >
      <ThumbsUp className={cn("w-3.5 h-3.5 mr-1.5", userVote && "fill-cyan-300")} />
      {helpfulVotes > 0 && <span className="mr-1">{helpfulVotes}</span>}
      Helpful
    </Button>
  );
}