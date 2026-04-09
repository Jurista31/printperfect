import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SAVED_KEY = 'printdoc_saved_posts';

export function getSavedPosts() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; }
}

export default function SaveBookmarkButton({ postId }) {
  const [saved, setSaved] = useState(() => getSavedPosts().includes(postId));

  const toggle = () => {
    const current = getSavedPosts();
    const next = saved
      ? current.filter(id => id !== postId)
      : [...current, postId];
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    setSaved(!saved);
    toast.success(saved ? 'Removed from saved' : 'Post saved');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn('w-8 h-8 hover:bg-slate-700', saved && 'text-cyan-400')}
      title={saved ? 'Remove bookmark' : 'Save post'}
    >
      <Bookmark className={cn('w-4 h-4', saved && 'fill-current')} />
    </Button>
  );
}