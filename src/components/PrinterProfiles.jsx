import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Plus, Trash2, Edit2, Check, X, Loader2, Star, ChevronDown, ChevronUp, FlaskConical, Gauge, Thermometer, Layers } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

const NOZZLE_SIZES = ['0.2mm', '0.4mm', '0.6mm', '0.8mm', '1.0mm'];
const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'Nylon', 'ASA', 'PC', 'FLEX'];
const COMMON_PRINTERS = [
  'Creality Ender 3', 'Creality Ender 3 V2', 'Creality Ender 5', 'Creality CR-10',
  'Creality K1', 'Prusa i3 MK3S+', 'Prusa MINI+', 'Bambu Lab X1C', 'Bambu Lab P1P',
  'Bambu Lab P1S', 'Artillery Sidewinder X2', 'Anycubic Kobra 2', 'Voron 2.4', 'Other'
];

const emptyForm = {
  name: '', printer_model: '', nozzle_size: '0.4mm',
  common_materials: ['PLA'], default_material: 'PLA',
  default_nozzle_temp: '', default_bed_temp: '',
  default_print_speed: '', default_layer_height: '', notes: ''
};

function ProfileForm({ initial = emptyForm, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleMaterial = (mat) => {
    setForm(prev => {
      const has = prev.common_materials.includes(mat);
      const updated = has ? prev.common_materials.filter(m => m !== mat) : [...prev.common_materials, mat];
      return { ...prev, common_materials: updated, default_material: updated[0] || '' };
    });
  };

  return (
    <div className="space-y-4">
      {/* Profile name */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Profile Name *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="e.g. My Ender 3, Work Printer"
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Printer model */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Printer Model *</label>
        <Input
          value={form.printer_model}
          onChange={(e) => setForm(p => ({ ...p, printer_model: e.target.value }))}
          placeholder="e.g. Creality Ender 3"
          className="bg-slate-800 border-slate-700 text-white mb-2"
        />
        <div className="flex flex-wrap gap-1.5">
          {COMMON_PRINTERS.map(p => (
            <button
              key={p}
              onClick={() => setForm(prev => ({ ...prev, printer_model: p === 'Other' ? '' : p, name: prev.name || p }))}
              className={cn(
                "text-xs px-2 py-1 rounded-full border transition-colors",
                form.printer_model === p
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500"
              )}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* Nozzle size */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Nozzle Size</label>
        <div className="flex gap-2 flex-wrap">
          {NOZZLE_SIZES.map(sz => (
            <button
              key={sz}
              onClick={() => setForm(p => ({ ...p, nozzle_size: sz }))}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                form.nozzle_size === sz
                  ? "bg-teal-500/20 border-teal-500/50 text-teal-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >{sz}</button>
          ))}
        </div>
      </div>

      {/* Common materials */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Common Materials (select all you use)</label>
        <div className="flex flex-wrap gap-2">
          {MATERIALS.map(mat => (
            <button
              key={mat}
              onClick={() => toggleMaterial(mat)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                form.common_materials.includes(mat)
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >{mat}</button>
          ))}
        </div>
        {form.common_materials.length > 1 && (
          <div className="mt-2">
            <label className="text-xs text-slate-500 mb-1 block">Default / most used:</label>
            <div className="flex gap-1.5 flex-wrap">
              {form.common_materials.map(mat => (
                <button
                  key={mat}
                  onClick={() => setForm(p => ({ ...p, default_material: mat }))}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    form.default_material === mat
                      ? "bg-purple-500/30 border-purple-500 text-purple-200"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  )}
                >
                  {mat} {form.default_material === mat && <span className="ml-0.5">★</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced settings toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showAdvanced ? 'Hide' : 'Show'} default temperatures & speeds
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Thermometer className="w-3 h-3" /> Nozzle Temp (°C)
                </label>
                <Input type="number" value={form.default_nozzle_temp}
                  onChange={(e) => setForm(p => ({ ...p, default_nozzle_temp: e.target.value }))}
                  placeholder="e.g. 210" className="bg-slate-800 border-slate-700 text-white h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Thermometer className="w-3 h-3" /> Bed Temp (°C)
                </label>
                <Input type="number" value={form.default_bed_temp}
                  onChange={(e) => setForm(p => ({ ...p, default_bed_temp: e.target.value }))}
                  placeholder="e.g. 60" className="bg-slate-800 border-slate-700 text-white h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Print Speed (mm/s)
                </label>
                <Input type="number" value={form.default_print_speed}
                  onChange={(e) => setForm(p => ({ ...p, default_print_speed: e.target.value }))}
                  placeholder="e.g. 60" className="bg-slate-800 border-slate-700 text-white h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Layer Height (mm)
                </label>
                <Input type="number" step="0.01" value={form.default_layer_height}
                  onChange={(e) => setForm(p => ({ ...p, default_layer_height: e.target.value }))}
                  placeholder="e.g. 0.2" className="bg-slate-800 border-slate-700 text-white h-9 text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-slate-500 mb-1 block">Notes / quirks about this printer</label>
              <Input value={form.notes}
                onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Needs bed leveling frequently, runs hot..."
                className="bg-slate-800 border-slate-700 text-white text-sm" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 pt-2">
        <Button onClick={onCancel} variant="outline" size="sm" className="border-slate-700 text-slate-400">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          disabled={!form.name || !form.printer_model || saving}
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-500 flex-1"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}

export default function PrinterProfiles() {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['printer-profiles'],
    queryFn: () => base44.entities.PrinterProfile.list('-created_date', 20),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PrinterProfile.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['printer-profiles'] }); setCreating(false); toast.success('Profile created!'); },
    onError: () => toast.error('Failed to save profile')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PrinterProfile.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['printer-profiles'] }); setEditingId(null); toast.success('Profile updated!'); },
    onError: () => toast.error('Failed to update profile')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PrinterProfile.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['printer-profiles'] }); toast.success('Profile deleted'); },
  });

  const setActiveMutation = useMutation({
    mutationFn: async (profileId) => {
      // Deactivate all, then activate selected
      await Promise.all(profiles.map(p =>
        base44.entities.PrinterProfile.update(p.id, { is_active: p.id === profileId })
      ));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['printer-profiles'] }); toast.success('Active profile updated!'); },
  });

  const activeProfile = profiles.find(p => p.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-semibold">Printer Profiles</h3>
        </div>
        {!creating && (
          <Button
            size="sm"
            onClick={() => setCreating(true)}
            className="bg-cyan-600 hover:bg-cyan-500 h-8 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Profile
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Define your printers so the AI can give tailored troubleshooting advice for your exact setup. 
        The <span className="text-cyan-400">active profile</span> is automatically included in every analysis.
      </p>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-slate-800/70 border border-cyan-500/30 rounded-xl p-4"
          >
            <p className="text-sm font-medium text-cyan-400 mb-4">New Printer Profile</p>
            <ProfileForm
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setCreating(false)}
              saving={createMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profiles list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : profiles.length === 0 && !creating ? (
        <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <Printer className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No printer profiles yet</p>
          <p className="text-xs text-slate-600 mt-1">Add your printer to get AI-tailored advice</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id}>
              {editingId === profile.id ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-800/70 border border-cyan-500/30 rounded-xl p-4"
                >
                  <p className="text-sm font-medium text-cyan-400 mb-4">Edit Profile</p>
                  <ProfileForm
                    initial={{
                      name: profile.name, printer_model: profile.printer_model,
                      nozzle_size: profile.nozzle_size || '0.4mm',
                      common_materials: profile.common_materials || ['PLA'],
                      default_material: profile.default_material || 'PLA',
                      default_nozzle_temp: profile.default_nozzle_temp || '',
                      default_bed_temp: profile.default_bed_temp || '',
                      default_print_speed: profile.default_print_speed || '',
                      default_layer_height: profile.default_layer_height || '',
                      notes: profile.notes || ''
                    }}
                    onSave={(data) => updateMutation.mutate({ id: profile.id, data })}
                    onCancel={() => setEditingId(null)}
                    saving={updateMutation.isPending}
                  />
                </motion.div>
              ) : (
                <div className={cn(
                  "rounded-xl border p-4 transition-all",
                  profile.is_active
                    ? "bg-cyan-500/5 border-cyan-500/40"
                    : "bg-slate-800/40 border-slate-700/50"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white text-sm truncate">{profile.name}</p>
                        {profile.is_active && (
                          <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs px-1.5 py-0">
                            <Star className="w-3 h-3 mr-0.5" />Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-2">
                        <Printer className="w-3 h-3" />{profile.printer_model}
                        {profile.nozzle_size && <span className="text-slate-600">•</span>}
                        {profile.nozzle_size && <span>Nozzle {profile.nozzle_size}</span>}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(profile.common_materials || []).map(mat => (
                          <Badge key={mat} className={cn(
                            "text-xs border",
                            mat === profile.default_material
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              : "bg-slate-700/50 text-slate-400 border-slate-600/50"
                          )}>
                            {mat === profile.default_material && <FlaskConical className="w-2.5 h-2.5 mr-1" />}
                            {mat}
                          </Badge>
                        ))}
                      </div>
                      {(profile.default_print_speed || profile.default_nozzle_temp) && (
                        <p className="text-xs text-slate-600 mt-1.5 flex gap-3">
                          {profile.default_nozzle_temp && <span>{profile.default_nozzle_temp}°C nozzle</span>}
                          {profile.default_bed_temp && <span>{profile.default_bed_temp}°C bed</span>}
                          {profile.default_print_speed && <span>{profile.default_print_speed}mm/s</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!profile.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveMutation.mutate(profile.id)}
                          disabled={setActiveMutation.isPending}
                          className="h-7 text-xs text-slate-500 hover:text-cyan-400"
                          title="Set as active"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(profile.id)}
                        className="h-7 text-slate-500 hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(profile.id)}
                        disabled={deleteMutation.isPending}
                        className="h-7 text-slate-600 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}