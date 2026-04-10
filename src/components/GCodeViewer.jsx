import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Layers, Play, Pause, ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── G-Code parser ─────────────────────────────────────────────────────────────
function parseGCode(text) {
  const lines = text.split('\n');
  const layers = []; // array of { z, moves: [{x,y,extrude}] }
  let currentLayer = null;
  let x = 0, y = 0, z = 0;
  let isRelative = false;

  for (const raw of lines) {
    const line = raw.split(';')[0].trim().toUpperCase();
    if (!line) continue;

    const parts = line.split(/\s+/);
    const cmd = parts[0];

    const getParam = (letter) => {
      const p = parts.find(p => p.startsWith(letter));
      return p ? parseFloat(p.slice(1)) : null;
    };

    if (cmd === 'G90') { isRelative = false; continue; }
    if (cmd === 'G91') { isRelative = true; continue; }

    if (cmd === 'G0' || cmd === 'G1') {
      const nx = getParam('X');
      const ny = getParam('Y');
      const nz = getParam('Z');
      const e  = getParam('E');

      const newZ = nz != null ? (isRelative ? z + nz : nz) : z;
      const newX = nx != null ? (isRelative ? x + nx : nx) : x;
      const newY = ny != null ? (isRelative ? y + ny : ny) : y;

      // Layer change
      if (newZ !== z) {
        z = newZ;
        currentLayer = { z: parseFloat(z.toFixed(4)), moves: [] };
        layers.push(currentLayer);
      }

      if (currentLayer && (nx != null || ny != null)) {
        currentLayer.moves.push({
          fromX: x, fromY: y,
          toX: newX, toY: newY,
          extrude: e != null && e > 0,
        });
      }

      x = newX;
      y = newY;
    }
  }

  return layers.filter(l => l.moves.length > 0);
}

// ── Canvas renderer ───────────────────────────────────────────────────────────
function renderLayers(canvas, layers, upToIndex, highlightIndex) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (layers.length === 0) return;

  // Find bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const layer of layers) {
    for (const m of layer.moves) {
      minX = Math.min(minX, m.fromX, m.toX);
      maxX = Math.max(maxX, m.fromX, m.toX);
      minY = Math.min(minY, m.fromY, m.toY);
      maxY = Math.max(maxY, m.fromY, m.toY);
    }
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const pad = 16;
  const scaleX = (W - pad * 2) / rangeX;
  const scaleY = (H - pad * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = pad + (W - pad * 2 - rangeX * scale) / 2;
  const offsetY = pad + (H - pad * 2 - rangeY * scale) / 2;

  const px = (v) => offsetX + (v - minX) * scale;
  const py = (v) => H - (offsetY + (v - minY) * scale); // flip Y

  const slice = layers.slice(0, upToIndex + 1);

  slice.forEach((layer, li) => {
    const isHighlight = li === highlightIndex;
    const alpha = isHighlight ? 1 : Math.max(0.1, 0.35 - (highlightIndex - li) * 0.02);

    for (const m of layer.moves) {
      if (!m.extrude) continue;
      ctx.beginPath();
      ctx.moveTo(px(m.fromX), py(m.fromY));
      ctx.lineTo(px(m.toX), py(m.toY));

      if (isHighlight) {
        ctx.strokeStyle = `rgba(34,211,238,${alpha})`; // cyan for current
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = `rgba(100,116,139,${alpha})`; // slate for past
        ctx.lineWidth = 0.8;
      }
      ctx.stroke();
    }

    // Travel moves on current layer only (dimmer, dashed)
    if (isHighlight) {
      ctx.setLineDash([3, 5]);
      for (const m of layer.moves) {
        if (m.extrude) continue;
        ctx.beginPath();
        ctx.moveTo(px(m.fromX), py(m.fromY));
        ctx.lineTo(px(m.toX), py(m.toY));
        ctx.strokeStyle = 'rgba(245,158,11,0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GCodeViewer({ file }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  const [layers, setLayers]         = useState([]);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [playing, setPlaying]       = useState(false);
  const [parsing, setParsing]       = useState(false);

  // Parse on file change
  useEffect(() => {
    if (!file) return;
    setParsing(true);
    setLayers([]);
    setCurrentLayer(0);
    setPlaying(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseGCode(e.target.result);
      setLayers(parsed);
      setCurrentLayer(parsed.length > 0 ? 0 : 0);
      setParsing(false);
    };
    reader.readAsText(file);
  }, [file]);

  // Render whenever layer changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layers.length === 0) return;
    renderLayers(canvas, layers, currentLayer, currentLayer);
  }, [layers, currentLayer]);

  // Auto-play
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(animRef.current); return; }
    let last = 0;
    const step = (ts) => {
      if (ts - last > 80) {
        last = ts;
        setCurrentLayer(prev => {
          if (prev >= layers.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, layers.length]);

  const currentZ = layers[currentLayer]?.z;
  const extrudeCount = layers[currentLayer]?.moves.filter(m => m.extrude).length ?? 0;
  const travelCount  = layers[currentLayer]?.moves.filter(m => !m.extrude).length ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/40">
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs font-semibold text-slate-300">Toolpath Viewer</span>
        {layers.length > 0 && (
          <span className="ml-auto text-xs text-slate-500">{layers.length} layers parsed</span>
        )}
      </div>

      {/* Canvas */}
      <div className="relative bg-slate-950" style={{ height: 260 }}>
        {parsing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-cyan-500/50 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Parsing G-Code…</p>
            </div>
          </div>
        )}
        {!parsing && layers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-slate-600">No toolpath data found</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={460}
          height={260}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Layer info overlay */}
        {layers.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="text-[10px] bg-slate-900/80 text-cyan-400 border border-cyan-500/20 rounded px-2 py-0.5">
              Layer {currentLayer + 1} / {layers.length}
            </span>
            {currentZ != null && (
              <span className="text-[10px] bg-slate-900/80 text-slate-400 border border-slate-700/40 rounded px-2 py-0.5">
                Z = {currentZ} mm
              </span>
            )}
          </div>
        )}
        {layers.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 text-right">
            <span className="text-[10px] bg-slate-900/80 text-cyan-300 border border-cyan-500/20 rounded px-2 py-0.5">
              {extrudeCount} extrude
            </span>
            <span className="text-[10px] bg-slate-900/80 text-amber-400 border border-amber-500/20 rounded px-2 py-0.5">
              {travelCount} travel
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      {layers.length > 0 && (
        <div className="px-4 py-3 space-y-2 bg-slate-900/30">
          {/* Slider */}
          <input
            type="range"
            min={0}
            max={layers.length - 1}
            value={currentLayer}
            onChange={e => { setPlaying(false); setCurrentLayer(Number(e.target.value)); }}
            className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-cyan-400 cursor-pointer"
          />

          {/* Buttons */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => { setPlaying(false); setCurrentLayer(l => Math.max(0, l - 1)); }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (currentLayer >= layers.length - 1) setCurrentLayer(0);
                setPlaying(p => !p);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? 'Pause' : 'Simulate'}
            </button>

            <button
              onClick={() => { setPlaying(false); setCurrentLayer(l => Math.min(layers.length - 1, l + 1)); }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-cyan-400 rounded" />
              <span className="text-[10px] text-slate-500">Extrusion</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-400 rounded opacity-60" style={{ borderTop: '1px dashed' }} />
              <span className="text-[10px] text-slate-500">Travel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-slate-500 rounded" />
              <span className="text-[10px] text-slate-500">Previous layers</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}