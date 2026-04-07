import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Package, Star, Thermometer, Zap, Layers, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Other'];
const MATERIAL_COLORS = {
  PLA: 'bg-green-500/20 text-green-300 border-green-500/30',
  PETG: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  ABS: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ASA: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  TPU: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Nylon: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Resin: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  Other: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const Input = ({ className, ...props }) => (
  <input
    className={cn(
      "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors",
      className
    )}
    {...props}
  />
);
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const EMPTY_FORM = {
  brand: '', material: 'PLA', color: '',
  nozzle_temp: '', bed_temp: '', print_speed: '', layer_height: '',
  notes: '', rating: 5,
};

function FilamentForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    ['nozzle_temp', 'bed_temp', 'print_speed', 'layer_height', 'rating'].forEach(k => {
      if (payload[k] !== '' && payload[k] != null) payload[k] = Number(payload[k]);
      else delete payload[k];
    });
    await onSave(payload);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-slate-900 border border-cyan-500/30 rounded-2xl overflow-hidden mb-5"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-white">{initial?.id ? 'Edit Filament' : 'Add Filament'}</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand *">
            <Input required value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Hatchbox" />
          </Field>
          <Field label="Material *">
            <select value={form.material} onChange={e => set('material', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60">
              {MATERIALS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Color">
            <Input value={form.color} onChange={e => set('color', e.target.value)} placeholder="e.g. Black" />
          </Field>
          <Field label="Rating (1–5)">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => set('rating', n)}
                  className={cn("flex-1 py-1.5 rounded text-xs font-medium border transition-all",
                    form.rating >= n ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-slate-800 border-slate-700 text-slate-600")}>
                  ★
                </button>
              ))}
            </div>
          </Field>
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Optimal Settings</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nozzle Temp (°C)">
            <Input type="number" value={form.nozzle_temp} onChange={e => set('nozzle_temp', e.target.value)} placeholder="210" />
          </Field>
          <Field label="Bed Temp (°C)">
            <Input type="number" value={form.bed_temp} onChange={e => set('bed_temp', e.target.value)} placeholder="60" />
          </Field>
          <Field label="Print Speed (mm/s)">
            <Input type="number" value={form.print_speed} onChange={e => set('print_speed', e.target.value)} placeholder="50" />
          </Field>
          <Field label="Layer Height (mm)">
            <Input type="number" step="0.01" value={form.layer_height} onChange={e => set('layer_height', e.target.value)} placeholder="0.2" />
          </Field>
        </div>

        <Field label="Notes">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            placeholder="Tips, quirks, dry time…"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none" />
        </Field>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-slate-700 text-slate-400">Cancel</Button>
          <Button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Save</>}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

export default function MaterialLibrary() {
  const qc = useQueryClient();
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['filament-profiles'],
    queryFn: () => base44.entities.FilamentProfile.list('-created_date', 100),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterMat, setFilterMat] = useState('All');

  const save = async (payload) => {
    if (editing?.id) {
      await base44.entities.FilamentProfile.update(editing.id, payload);
    } else {
      await base44.entities.FilamentProfile.create(payload);
    }
    qc.invalidateQueries({ queryKey: ['filament-profiles'] });
    setShowForm(false);
    setEditing(null);
  };

  const remove = async (id) => {
    await base44.entities.FilamentProfile.delete(id);
    qc.invalidateQueries({ queryKey: ['filament-profiles'] });
  };

  const startEdit = (p) => { setEditing(p); setShowForm(true); };
  const startAdd = () => { setEditing(null); setShowForm(true); };

  const filtered = filterMat === 'All' ? profiles : profiles.filter(p => p.material === filterMat);
  const materials = ['All', ...Array.from(new Set(profiles.map(p => p.material)))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-purple-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Material Library</h1>
                <p className="text-xs text-slate-500">Saved filament profiles · {profiles.length} saved</p>
              </div>
            </div>
            <Button onClick={startAdd} size="sm" className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </motion.div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <FilamentForm
              key={editing?.id || 'new'}
              initial={editing}
              onSave={save}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          )}
        </AnimatePresence>

        {/* Filter chips */}
        {profiles.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-5">
            {materials.map(m => (
              <button key={m} onClick={() => setFilterMat(m)}
                className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  filterMat === m
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500"
                )}>
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {profiles.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Package className="w-16 h-16 text-slate-700" />
            <h2 className="text-lg font-bold text-white">No filaments saved yet</h2>
            <p className="text-slate-500 text-sm max-w-xs">Save your optimal settings for each filament brand so they auto-fill when logging prints.</p>
            <Button onClick={startAdd} className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Your First Filament
            </Button>
          </motion.div>
        )}

        {/* Cards */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((p) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{p.brand}</h3>
                      {p.color && <span className="text-xs text-slate-500">· {p.color}</span>}
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", MATERIAL_COLORS[p.material] || MATERIAL_COLORS.Other)}>
                        {p.material}
                      </span>
                    </div>
                    {p.rating && (
                      <div className="flex mt-1">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={cn("w-3 h-3", n <= p.rating ? "text-amber-400 fill-amber-400" : "text-slate-700")} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700/50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Settings pills */}
                <div className="flex flex-wrap gap-2">
                  {p.nozzle_temp && (
                    <span className="flex items-center gap-1 text-xs bg-orange-500/10 border border-orange-500/20 text-orange-300 px-2 py-1 rounded-lg">
                      <Thermometer className="w-3 h-3" /> {p.nozzle_temp}°C nozzle
                    </span>
                  )}
                  {p.bed_temp && (
                    <span className="flex items-center gap-1 text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-2 py-1 rounded-lg">
                      <Thermometer className="w-3 h-3" /> {p.bed_temp}°C bed
                    </span>
                  )}
                  {p.print_speed && (
                    <span className="flex items-center gap-1 text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2 py-1 rounded-lg">
                      <Zap className="w-3 h-3" /> {p.print_speed} mm/s
                    </span>
                  )}
                  {p.layer_height && (
                    <span className="flex items-center gap-1 text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-1 rounded-lg">
                      <Layers className="w-3 h-3" /> {p.layer_height}mm layers
                    </span>
                  )}
                </div>

                {p.notes && (
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2">{p.notes}</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}