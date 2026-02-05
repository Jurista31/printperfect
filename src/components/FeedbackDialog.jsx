import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function FeedbackDialog({ analysis, open, onOpenChange }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [accuracy, setAccuracy] = useState('');
  const [missedDefects, setMissedDefects] = useState('');
  const [falsePositives, setFalsePositives] = useState('');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const submitFeedbackMutation = useMutation({
    mutationFn: (data) => base44.entities.AnalysisFeedback.create(data),
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Thank you! Your feedback helps improve our AI.');
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 2000);
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    }
  });

  const resetForm = () => {
    setRating(0);
    setAccuracy('');
    setMissedDefects('');
    setFalsePositives('');
    setComments('');
    setSubmitted(false);
  };

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    const feedbackData = {
      analysis_id: analysis.id,
      rating,
      accuracy_feedback: accuracy,
      missed_defects: missedDefects ? missedDefects.split(',').map(d => d.trim()).filter(Boolean) : [],
      false_positives: falsePositives ? falsePositives.split(',').map(d => d.trim()).filter(Boolean) : [],
      comments: comments || undefined
    };

    submitFeedbackMutation.mutate(feedbackData);
  };

  const accuracyOptions = [
    { value: 'accurate', label: 'Very Accurate', icon: ThumbsUp, color: 'text-emerald-400' },
    { value: 'mostly_accurate', label: 'Mostly Accurate', icon: ThumbsUp, color: 'text-cyan-400' },
    { value: 'some_errors', label: 'Some Errors', icon: ThumbsDown, color: 'text-amber-400' },
    { value: 'inaccurate', label: 'Inaccurate', icon: ThumbsDown, color: 'text-red-400' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        {submitted ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4">
              <ThumbsUp className="w-8 h-8 text-emerald-400" />
            </div>
            <DialogTitle className="text-2xl mb-2">Thank You!</DialogTitle>
            <p className="text-slate-400">Your feedback helps us improve our AI accuracy</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Rate This Analysis</DialogTitle>
              <DialogDescription className="text-slate-400">
                Help us improve defect detection accuracy
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Star Rating */}
              <div>
                <Label className="text-sm text-slate-300 mb-2 block">Overall Rating</Label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "w-10 h-10 transition-colors",
                          (hoveredRating >= star || rating >= star)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-600"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Accuracy Assessment */}
              <div>
                <Label className="text-sm text-slate-300 mb-2 block">How accurate was the analysis?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {accuracyOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setAccuracy(option.value)}
                        className={cn(
                          "px-4 py-3 rounded-lg border-2 transition-all text-left",
                          accuracy === option.value
                            ? "border-cyan-500 bg-cyan-500/10"
                            : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-4 h-4", option.color)} />
                          <span className="text-sm font-medium">{option.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Missed Defects */}
              <div>
                <Label className="text-sm text-slate-300 mb-2 block">
                  Defects the AI missed (comma-separated)
                </Label>
                <Textarea
                  value={missedDefects}
                  onChange={(e) => setMissedDefects(e.target.value)}
                  placeholder="e.g., stringing, warping, layer shift"
                  className="bg-slate-800 border-slate-700 text-white min-h-[60px]"
                />
              </div>

              {/* False Positives */}
              <div>
                <Label className="text-sm text-slate-300 mb-2 block">
                  Defects incorrectly identified (comma-separated)
                </Label>
                <Textarea
                  value={falsePositives}
                  onChange={(e) => setFalsePositives(e.target.value)}
                  placeholder="e.g., ghosting (not present), z-banding (normal)"
                  className="bg-slate-800 border-slate-700 text-white min-h-[60px]"
                />
              </div>

              {/* Comments */}
              <div>
                <Label className="text-sm text-slate-300 mb-2 block">
                  Additional Comments (optional)
                </Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Any other feedback about the analysis..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={submitFeedbackMutation.isPending || rating === 0}
                className="w-full h-12 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
              >
                {submitFeedbackMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}