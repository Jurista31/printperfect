import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileSelect } from "@/components/ui/mobile-select";
import { Share2, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ShareDialog({ analysis, open, onOpenChange }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'successful',
    solutions_applied: '',
    printer_model: '',
    material: '',
    nozzle_temp: '',
    bed_temp: '',
    print_speed: '',
    layer_height: '',
    infill: '',
    notes: ''
  });
  const [shared, setShared] = useState(false);
  
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      return base44.entities.SharedAnalysis.create({
        analysis_id: analysis.id,
        image_url: analysis.image_url,
        title: data.title,
        description: data.description,
        status: data.status,
        defects: analysis.defects || [],
        solutions_applied: data.solutions_applied 
          ? data.solutions_applied.split('\n').filter(s => s.trim())
          : [],
        print_profile: {
          printer_model: data.printer_model || undefined,
          material: data.material || undefined,
          nozzle_temp: data.nozzle_temp ? parseFloat(data.nozzle_temp) : undefined,
          bed_temp: data.bed_temp ? parseFloat(data.bed_temp) : undefined,
          print_speed: data.print_speed ? parseFloat(data.print_speed) : undefined,
          layer_height: data.layer_height ? parseFloat(data.layer_height) : undefined,
          infill: data.infill ? parseFloat(data.infill) : undefined,
          notes: data.notes || undefined
        },
        user_name: user.full_name || user.email.split('@')[0],
        likes_count: 0,
        comments_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-analyses'] });
      setShared(true);
      setTimeout(() => {
        onOpenChange(false);
        setShared(false);
        setFormData({
          title: '',
          description: '',
          status: 'successful',
          solutions_applied: '',
          printer_model: '',
          material: '',
          nozzle_temp: '',
          bed_temp: '',
          print_speed: '',
          layer_height: '',
          infill: '',
          notes: ''
        });
      }, 2000);
      toast.success('Shared with community!');
    },
    onError: (error) => {
      toast.error('Failed to share');
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please add a title');
      return;
    }
    shareMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Share2 className="w-5 h-5 text-cyan-400" />
            Share with Community
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Help others by sharing your print experience and settings
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {shared ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
              >
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-2">Shared Successfully!</h3>
              <p className="text-slate-400">Your analysis is now visible to the community</p>
            </motion.div>
          ) : (
            <form key="form" onSubmit={handleSubmit} className="space-y-6 py-4">
              {/* Preview Image */}
              {analysis?.image_url && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={analysis.image_url}
                    alt="Print preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Perfect Benchy after fixing stringing"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="successful">✅ Successful Print</SelectItem>
                      <SelectItem value="problematic">⚠️ Problematic Print</SelectItem>
                      <SelectItem value="work_in_progress">🔧 Work in Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Your Story</Label>
                  <Textarea
                    id="description"
                    placeholder="Share your experience, what worked, what didn't..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white min-h-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solutions">Solutions Applied (one per line)</Label>
                  <Textarea
                    id="solutions"
                    placeholder="Reduced print speed to 40mm/s&#10;Increased nozzle temp to 210°C&#10;Added supports"
                    value={formData.solutions_applied}
                    onChange={(e) => setFormData({...formData, solutions_applied: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white min-h-20 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Print Profile Settings */}
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <h3 className="font-semibold text-cyan-400 flex items-center gap-2">
                  ⚙️ Print Profile Settings
                  <span className="text-xs text-slate-500 font-normal">(optional)</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="printer">Printer Model</Label>
                    <Input
                      id="printer"
                      placeholder="e.g., Ender 3 V2"
                      value={formData.printer_model}
                      onChange={(e) => setFormData({...formData, printer_model: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="material">Material</Label>
                    <Input
                      id="material"
                      placeholder="e.g., PLA, PETG"
                      value={formData.material}
                      onChange={(e) => setFormData({...formData, material: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nozzle_temp">Nozzle Temp (°C)</Label>
                    <Input
                      id="nozzle_temp"
                      type="number"
                      placeholder="200"
                      value={formData.nozzle_temp}
                      onChange={(e) => setFormData({...formData, nozzle_temp: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bed_temp">Bed Temp (°C)</Label>
                    <Input
                      id="bed_temp"
                      type="number"
                      placeholder="60"
                      value={formData.bed_temp}
                      onChange={(e) => setFormData({...formData, bed_temp: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="speed">Print Speed (mm/s)</Label>
                    <Input
                      id="speed"
                      type="number"
                      placeholder="50"
                      value={formData.print_speed}
                      onChange={(e) => setFormData({...formData, print_speed: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="layer">Layer Height (mm)</Label>
                    <Input
                      id="layer"
                      type="number"
                      step="0.01"
                      placeholder="0.2"
                      value={formData.layer_height}
                      onChange={(e) => setFormData({...formData, layer_height: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="infill">Infill (%)</Label>
                    <Input
                      id="infill"
                      type="number"
                      placeholder="20"
                      value={formData.infill}
                      onChange={(e) => setFormData({...formData, infill: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any other settings or tips..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  disabled={shareMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
                  disabled={shareMutation.isPending}
                >
                  {shareMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share with Community
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}