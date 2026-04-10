import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, AlertTriangle, Pencil, Trash2, X, Check, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Other'];
const MAT_COLORS = {
  PLA: '#22d3ee', PETG: '#818cf8', ABS: '#fb923c',
  ASA: '#a78bfa', TPU: '#34d399', Nylon: '#f472b6',
  Resin: '#facc15', Other: '#94a3b8',
};

const EMPTY_FORM = {
  brand: '', material: 'PLA', color: '', color_hex: '#ffffff',
  spool_weight_grams: 1000, remaining_grams: 1000,
  spool_length_meters: '', remaining_length_meters: '',
  location: '', notes: '', is_open: false,
};

function getPct(spool) {
  if (spool.spool_weight_grams && spool.remaining_grams != null) {
    return Math.min(100, Math.round((spool.remaining_grams / spool.spool_weight_grams) * 100));
  }
  if (spool.spool_length_meters && spool.remaining_length_meters != null) {
    return Math.min(100, Math.round((spool.remaining_length_meters / spool.spool_length_meters) * 100));
  }
  return null;
}

function SpoolCard({ spool, onEdit, onDelete }) {
  const pct = getPct(spool);
  const isLow = pct != null && pct <= 10;
  const isEmpty = pct != null && pct === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-slate-800/60 border rounded-2xl p-4 relative overflow-hidden",
        isLow ? "border-red-500/50" : "border-slate-700"
      )}
    >
      {isLow && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-500" />
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Color swatch + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 border border-white/10 shadow-inner"
            style={{ backgroundColor: spool.color_hex || '#ffffff' }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold text-sm">{spool.brand}</p>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: MAT_COLORS[spool.material] + '22', color: MAT_COLORS[spool.material] }}>
                {spool.material}
              </span>
              {isLow && !isEmpty && (
                <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                  <AlertTriangle className="w-3 h-3" /> Low stock
                </span>
              )}
              {isEmpty && (
                <span className="text-xs text-slate-500 font-medium">Empty</span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">{spool.color}</p>
            {spool.location && <p className="text-slate-600 text-xs mt-0.5">📦 {spool.location}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => onEdit(spool)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(spool.id)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-500/30 text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {pct != null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Remaining</span>
            <span className={cn("font-semibold", isLow ? "text-red-400" : pct > 50 ? "text-emerald-400" : "text-amber-400")}>
              {pct}%
              {spool.remaining_grams != null && <span className="text-slate-500 font-normal ml-1">· {spool.remaining_grams}g</span>}
              {spool.remaining_length_meters != null && <span className="text-slate-500 font-normal ml-1">· {spool.remaining_length_meters}m</span>}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", isLow ? "bg-red-500" : pct > 50 ? "bg-emerald-500" : "bg-amber-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {spool.notes && <p className="text-slate-500 text-xs mt-2 italic">{spool.notes}</p>}
    </motion.div>
  );
}

function SpoolForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Brand *</label>
          <input value={form.brand} onChange={e => set('brand', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="e.g. Hatchbox" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Material *</label>
          <select value={form.material} onChange={e => set('material', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Color name *</label>
          <input value={form.color} onChange={e => set('color', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="e.g. Galaxy Black" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Color swatch</label>
          <input type="color" value={form.color_hex || '#ffffff'} onChange={e => set('color_hex', e.target.value)}
            className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg cursor-pointer" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Full spool (g)</label>
          <input type="number" value={form.spool_weight_grams} onChange={e => set('spool_weight_grams', Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Remaining (g)</label>
          <input type="number" value={form.remaining_grams} onChange={e => set('remaining_grams', Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Full length (m)</label>
          <input type="number" value={form.spool_length_meters} onChange={e => set('spool_length_meters', e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="Optional" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Remaining (m)</label>
          <input type="number" value={form.remaining_length_meters} onChange={e => set('remaining_length_meters', e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="Optional" />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 mb-1 block">Storage location</label>
        <input value={form.location || ''} onChange={e => set('location', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="e.g. Shelf A, Dry box" />
      </div>

      <div>
        <label className="text-xs text-slate-500 mb-1 block">Notes</label>
        <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave(form)} disabled={!form.brand || !form.color || saving}
          className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {initial?.id ? 'Save Changes' : 'Add Spool'}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="text-slate-400 border border-slate-700">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function FilamentInventoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [editSpool, setEditSpool] = useState(null);
  const [filter, setFilter] = useState('all');
  const qc = useQueryClient();

  const { data: spools = [], isLoading } = useQuery({
    queryKey: ['filament-inventory'],
    queryFn: () => base44.entities.FilamentInventory.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: (form) => {
      const clean = { ...form };
      if (clean.spool_length_meters === '') delete clean.spool_length_meters;
      if (clean.remaining_length_meters === '') delete clean.remaining_length_meters;
      return editSpool?.id
        ? base44.entities.FilamentInventory.update(editSpool.id, clean)
        : base44.entities.FilamentInventory.create(clean);
    },
    onSuccess: () => { qc.invalidateQueries(['filament-inventory']); setShowForm(false); setEditSpool(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FilamentInventory.delete(id),
    onSuccess: () => qc.invalidateQueries(['filament-inventory']),
  });

  const handleEdit = (spool) => { setEditSpool(spool); setShowForm(true); };
  const handleCancel = () => { setShowForm(false); setEditSpool(null); };

  const lowStockSpools = spools.filter(s => { const p = getPct(s); return p != null && p <= 10; });

  const filtered = filter === 'low'
    ? spools.filter(s => { const p = getPct(s); return p != null && p <= 10; })
    : filter === 'all' ? spools
    : spools.filter(s => s.material === filter);

  const materials = [...new Set(spools.map(s => s.material))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Filament Inventory</h1>
                <p className="text-xs text-slate-500">{spools.length} spools tracked</p>
              </div>
            </div>
            <Button onClick={() => { setEditSpool(null); setShowForm(true); }}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold h-9 px-3">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </motion.div>

        {/* Low stock banner */}
        <AnimatePresence>
          {lowStockSpools.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/40 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300 font-medium">
                {lowStockSpools.length} spool{lowStockSpools.length > 1 ? 's' : ''} below 10% — time to restock!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add/Edit form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5">
              <SpoolForm
                initial={editSpool}
                onSave={(form) => saveMutation.mutate(form)}
                onCancel={handleCancel}
                saving={saveMutation.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter pills */}
        {spools.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {['all', 'low', ...materials].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  filter === f ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "bg-slate-800 border-slate-700 text-slate-400")}>
                {f === 'all' ? 'All' : f === 'low' ? `⚠ Low Stock (${lowStockSpools.length})` : f}
              </button>
            ))}
          </div>
        )}

        {/* Spools list */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
        ) : spools.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-slate-700 mx-auto mb-3" />
            <p className="text-white font-semibold">No spools tracked yet</p>
            <p className="text-slate-500 text-sm mt-1">Add your first spool to start tracking inventory.</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {filtered.map(spool => (
                <SpoolCard key={spool.id} spool={spool} onEdit={handleEdit} onDelete={(id) => deleteMutation.mutate(id)} />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-slate-500 py-8">No spools match this filter.</p>
              )}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}