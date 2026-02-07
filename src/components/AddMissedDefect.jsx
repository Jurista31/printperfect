import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save } from "lucide-react";
import { toast } from 'sonner';

export default function AddMissedDefect({ analysisId, open, onOpenChange, onDefectAdded }) {
  const [defectName, setDefectName] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [userNotes, setUserNotes] = useState('');

  const addDefectMutation = useMutation({
    mutationFn: (data) => base44.entities.MissedDefect.create(data),
    onSuccess: () => {
      toast.success('Missed defect reported! This helps train the AI.');
      resetForm();
      onOpenChange(false);
      onDefectAdded?.();
    },
    onError: () => {
      toast.error('Failed to report defect');
    }
  });

  const resetForm = () => {
    setDefectName('');
    setSeverity('medium');
    setDescription('');
    setUserNotes('');
  };

  const handleSubmit = () => {
    if (!defectName.trim() || !description.trim()) {
      toast.error('Please fill in defect name and description');
      return;
    }

    const defectData = {
      analysis_id: analysisId,
      defect_name: defectName,
      severity,
      description,
      user_notes: userNotes || undefined,
      location: { x: 0, y: 0, width: 100, height: 100 } // Full image by default
    };

    addDefectMutation.mutate(defectData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            Report Missed Defect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Defect Name */}
          <div>
            <Label className="text-sm text-slate-300 mb-2 block">Defect Name *</Label>
            <Input
              value={defectName}
              onChange={(e) => setDefectName(e.target.value)}
              placeholder="e.g., Stringing, Warping, Layer Shift"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Severity */}
          <div>
            <Label className="text-sm text-slate-300 mb-2 block">Severity *</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm text-slate-300 mb-2 block">Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the defect and where it appears on the print..."
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <Label className="text-sm text-slate-300 mb-2 block">Additional Notes</Label>
            <Textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Any additional context or details..."
              className="bg-slate-800 border-slate-700 text-white min-h-[60px]"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={addDefectMutation.isPending}
            className="w-full h-12 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
          >
            {addDefectMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Report Defect
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}