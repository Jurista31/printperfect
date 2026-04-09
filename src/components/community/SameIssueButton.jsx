import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SAME_ISSUE_KEY = 'printdoc_same_issues';

function getStoredSameIssues() {
  try { return JSON.parse(localStorage.getItem(SAME_ISSUE_KEY) || '[]'); } catch { return []; }
}

export default function SameIssueButton({ sharedAnalysis }) {
  const stored = getStoredSameIssues();
  const [hasTapped, setHasTapped] = useState(stored.includes(sharedAnalysis.id));
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const delta = hasTapped ? -1 : 1;
      await base44.entities.SharedAnalysis.update(sharedAnalysis.id, {
        same_issue_count: Math.max(0, (sharedAnalysis.same_issue_count || 0) + delta)
      });
      return delta;
    },
    onMutate: () => {
      const delta = hasTapped ? -1 : 1;
      const next = !hasTapped;
      const issues = getStoredSameIssues();
      const updated = next
        ? [...issues, sharedAnalysis.id]
        : issues.filter(id => id !== sharedAnalysis.id);
      localStorage.setItem(SAME_ISSUE_KEY, JSON.stringify(updated));
      setHasTapped(next);
      queryClient.setQueryData(['shared-analyses'], old =>
        old?.map(a => a.id === sharedAnalysis.id
          ? { ...a, same_issue_count: Math.max(0, (a.same_issue_count || 0) + delta) }
          : a)
      );
    },
    onError: () => {
      toast.error('Failed to update');
      setHasTapped(prev => !prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['shared-analyses'] })
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className={cn('flex items-center gap-1.5 hover:bg-slate-700 text-xs', hasTapped && 'text-amber-400')}
    >
      <AlertCircle className={cn('w-4 h-4', hasTapped && 'fill-amber-400/20')} />
      <span>{sharedAnalysis.same_issue_count || 0} same issue</span>
    </Button>
  );
}