import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Upload, Sparkles, X, Loader2, ChevronDown, RotateCcw, Layers, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FAILURE_TYPES = [
  { id: 'stringing',     label: 'Stringing',      color: 'rgba(251,146,60,',  hex: '#fb923c', emoji: '🕸️' },
  { id: 'adhesion',      label: 'Bed Adhesion',    color: 'rgba(239,68,68,',   hex: '#ef4444', emoji: '⬛' },
  { id: 'warping',       label: 'Warping',         color: 'rgba(168,85,247,',  hex: '#a855f7', emoji: '🌀' },
  { id: 'layer_shift',   label: 'Layer Shift',     color: 'rgba(34,211,238,',  hex: '#22d3ee', emoji: '📐' },
  { id: 'under_extrude', label: 'Under-Extrusion', color: 'rgba(250,204,21,',  hex: '#facc15', emoji: '🫙' },
  { id: 'blobs',         label: 'Blobs/Zits',      color: 'rgba(52,211,153,',  hex: '#34d399', emoji: '🔵' },
];

function HeatmapCanvas({ imageUrl, marks, onAddMark, activeTool }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    // Draw heatmap blobs
    marks.forEach(({ x, y, type, radius = 60 }) => {
      const ft = FAILURE_TYPES.find(f => f.id === type);
      if (!ft) return;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grd.addColorStop(0,   ft.color + '0.55)');
      grd.addColorStop(0.5, ft.color + '0.3)');
      grd.addColorStop(1,   ft.color + '0)');
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      // Label dot
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = ft.hex;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [marks, imgLoaded]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const container = containerRef.current;
      if (!container) return;
      const maxW = container.clientWidth;
      const ratio = img.height / img.width;
      const w = maxW;
      const h = Math.round(maxW * ratio);
      setCanvasSize({ w, h });
      if (canvasRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
      }
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleClick = (e) => {
    if (!activeTool) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    onAddMark({ x, y, type: activeTool, radius: 60 });
  };

  return (
    <div ref={containerRef} className="w-full relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
      {!imageUrl && (
        <div className="aspect-[4/3] flex items-center justify-center">
          <div className="text-center text-slate-600">
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">Select or upload a print image</p>
          </div>
        </div>
      )}
      {imageUrl && !imgLoaded && (
        <div className="aspect-[4/3] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        onClick={handleClick}
        className={cn(
          'w-full block',
          activeTool ? 'cursor-crosshair' : 'cursor-default',
          !imgLoaded && 'hidden'
        )}
        style={{ touchAction: 'none' }}
      />
      {activeTool && imgLoaded && (
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5">
          <span>{FAILURE_TYPES.find(f => f.id === activeTool)?.emoji}</span>
          <span>Click to mark <strong>{FAILURE_TYPES.find(f => f.id === activeTool)?.label}</strong> zones</span>
        </div>
      )}
    </div>
  );
}

function AISuggestions({ marks, printerModel, material, form }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyze = async () => {
    setLoading(true);
    const summary = FAILURE_TYPES
      .map(ft => ({ type: ft.label, count: marks.filter(m => m.type === ft.id).length }))
      .filter(s => s.count > 0)
      .map(s => `${s.type}: ${s.count} zone(s)`)
      .join(', ');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a 3D printing expert. A user has marked failure zones on their print image.

Printer: ${printerModel || 'unknown'}
Material: ${material || 'unknown'}
Current settings: nozzle=${form?.nozzle_temp ?? '?'}°C, bed=${form?.bed_temp ?? '?'}°C, speed=${form?.print_speed ?? '?'}mm/s, retraction=${form?.retraction_mm ?? '?'}mm
Failure zones marked: ${summary || 'none'}

Give specific, actionable adjustments to fix these issues. Focus on retraction, cooling, temperature, and speed.
Return JSON with:
- diagnosis: 2-3 sentence overall assessment
- adjustments: array of { setting, current_value (string or null), suggested_value (string), reason (short) }
- priority_fix: the single most impactful change to make first`,
      response_json_schema: {
        type: 'object',
        properties: {
          diagnosis: { type: 'string' },
          adjustments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                setting: { type: 'string' },
                current_value: { type: 'string' },
                suggested_value: { type: 'string' },
                reason: { type: 'string' },
              }
            }
          },
          priority_fix: { type: 'string' },
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  if (marks.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500">Mark failure zones on the image above, then get AI suggestions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!result && (
        <Button
          onClick={analyze}
          disabled={loading}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analyzing failure zones…' : 'Get AI Suggestions'}
        </Button>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Diagnosis */}
            <div className="bg-violet-500/10 border border-violet-500/25 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">AI Diagnosis</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{result.diagnosis}</p>
              {result.priority_fix && (
                <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                  <p className="text-xs text-amber-300">⚡ Priority: {result.priority_fix}</p>
                </div>
              )}
            </div>

            {/* Adjustments */}
            {result.adjustments?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Adjustments</p>
                {result.adjustments.map((adj, i) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-700/40 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-white">{adj.setting}</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        {adj.current_value && <span className="text-slate-500 line-through">{adj.current_value}</span>}
                        <span className="text-cyan-400 font-bold">{adj.suggested_value}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{adj.reason}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setResult(null)} className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Re-analyze
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FailureHeatmapGallery() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [marks, setMarks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [printerModel, setPrinterModel] = useState('');
  const [material, setMaterial] = useState('PLA');
  const [showImagePicker, setShowImagePicker] = useState(false);

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['print-journal'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 100),
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ['analyses-gallery'],
    queryFn: () => base44.entities.PrintAnalysis.list('-created_date', 50),
  });

  const imagesFromJournal = journalEntries.filter(e => e.image_url);
  const imagesFromAnalyses = analyses.filter(a => a.image_url);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSelectedImage(file_url);
    setMarks([]);
    setUploading(false);
    setShowImagePicker(false);
  };

  const handleSelectExisting = (url, entry) => {
    setSelectedImage(url);
    setMarks([]);
    if (entry?.printer_model) setPrinterModel(entry.printer_model);
    if (entry?.filament_material) setMaterial(entry.filament_material);
    setShowImagePicker(false);
  };

  const addMark = (mark) => setMarks(m => [...m, mark]);

  const markCountByType = (id) => marks.filter(m => m.type === id).length;

  const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Other'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Failure Heatmap</h1>
            <p className="text-xs text-slate-500">Mark failure zones · get AI fix suggestions</p>
          </div>
        </motion.div>

        {/* Image source */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4">
          <div className="flex gap-2">
            <label className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all',
              'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
            )}>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Image
            </label>
            {(imagesFromJournal.length > 0 || imagesFromAnalyses.length > 0) && (
              <button
                onClick={() => setShowImagePicker(v => !v)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-all"
              >
                <Layers className="w-4 h-4" />
                From History
                <ChevronDown className={cn('w-3 h-3 transition-transform', showImagePicker && 'rotate-180')} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showImagePicker && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 max-h-52 overflow-y-auto space-y-1">
                  {imagesFromJournal.length > 0 && (
                    <>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide px-1 mb-1">Journal Entries</p>
                      {imagesFromJournal.map(e => (
                        <button key={e.id} onClick={() => handleSelectExisting(e.image_url, e)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
                        >
                          <img src={e.image_url} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{e.title}</p>
                            <p className="text-xs text-slate-500">{e.printer_model} · {e.filament_material}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {imagesFromAnalyses.length > 0 && (
                    <>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide px-1 mt-2 mb-1">Analyses</p>
                      {imagesFromAnalyses.map(a => (
                        <button key={a.id} onClick={() => handleSelectExisting(a.image_url, null)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
                        >
                          <img src={a.image_url} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{a.summary?.slice(0, 40) || 'Analysis'}</p>
                            <p className="text-xs text-slate-500">{a.overall_quality} quality · {a.created_date?.slice(0, 10)}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Context: printer + material */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Printer Model</label>
            <input
              value={printerModel}
              onChange={e => setPrinterModel(e.target.value)}
              placeholder="e.g. Ender 3 Pro"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-fuchsia-500/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Material</label>
            <select
              value={material}
              onChange={e => setMaterial(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fuchsia-500/60"
            >
              {MATERIALS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </motion.div>

        {/* Failure type toolbar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mb-3">
          <p className="text-xs text-slate-500 mb-2">Select a failure type, then tap the image to mark zones:</p>
          <div className="flex flex-wrap gap-1.5">
            {FAILURE_TYPES.map(ft => (
              <button
                key={ft.id}
                onClick={() => setActiveTool(activeTool === ft.id ? null : ft.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  activeTool === ft.id
                    ? 'border-white/40 bg-white/10 text-white scale-105'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                )}
                style={activeTool === ft.id ? { borderColor: ft.hex + '80', backgroundColor: ft.hex + '20', color: ft.hex } : {}}
              >
                <span>{ft.emoji}</span>
                {ft.label}
                {markCountByType(ft.id) > 0 && (
                  <span className="ml-1 bg-white/20 rounded-full px-1.5 py-0.5 text-xs font-bold">{markCountByType(ft.id)}</span>
                )}
              </button>
            ))}
            {marks.length > 0 && (
              <button
                onClick={() => setMarks([])}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Canvas */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-5">
          <HeatmapCanvas
            imageUrl={selectedImage}
            marks={marks}
            onAddMark={addMark}
            activeTool={activeTool}
          />
        </motion.div>

        {/* Legend */}
        {marks.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-400 mb-2">Marked Zones</p>
            <div className="flex flex-wrap gap-2">
              {FAILURE_TYPES.filter(ft => markCountByType(ft.id) > 0).map(ft => (
                <div key={ft.id} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ft.hex }} />
                  <span className="text-slate-300">{ft.label}</span>
                  <span className="text-slate-500">×{markCountByType(ft.id)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Suggestions */}
        <AISuggestions
          marks={marks}
          printerModel={printerModel}
          material={material}
          form={null}
        />
      </div>
    </div>
  );
}