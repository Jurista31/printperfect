import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileCode, Loader2, AlertTriangle, CheckCircle2, Clock,
  Thermometer, Gauge, Layers, Zap, ChevronDown, ChevronUp, X, TriangleAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG = {
  high:   { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  medium: { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  low:    { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30' },
};

function IssueCard({ issue, index }) {
  const [open, setOpen] = useState(index === 0);
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low;
  return (
    <div className={cn('rounded-xl border overflow-hidden', cfg.border, cfg.bg)}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3.5 text-left">
        <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', cfg.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{issue.title}</p>
          {issue.line_number && <p className="text-xs text-slate-500">Line {issue.line_number}</p>}
        </div>
        <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border', cfg.border, cfg.color)}>{issue.severity}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              <p className="text-sm text-slate-400">{issue.description}</p>
              {issue.fix && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-cyan-300 mb-1">Suggested Fix</p>
                  <p className="text-xs text-slate-300">{issue.fix}</p>
                </div>
              )}
              {issue.gcode_snippet && (
                <pre className="bg-slate-950 border border-slate-700/50 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{issue.gcode_snippet}</pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-1 rounded-xl border p-3', color)}>
      <Icon className="w-4 h-4 opacity-70" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

export default function GCodeAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      // Send only first 8000 chars to stay within token limits while preserving key sections
      const preview = text.length > 8000 ? text.slice(0, 4000) + '\n...[truncated]...\n' + text.slice(-2000) : text;
      const res = await base44.functions.invoke('analyzeGCode', { gcode: preview, filename: file.name });
      setResult(res.data);
    } catch (e) {
      setError(e.message || 'Analysis failed');
    }
    setLoading(false);
  };

  const reset = () => { setFile(null); setResult(null); setError(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-green-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
            <FileCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">G-Code Analyzer</h1>
            <p className="text-xs text-slate-500">AI-powered pre-print analysis</p>
          </div>
        </motion.div>

        {/* Upload Zone */}
        {!result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                dragging ? 'border-green-400 bg-green-500/10' : file ? 'border-teal-500/50 bg-teal-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
              )}
            >
              <input ref={inputRef} type="file" accept=".gcode,.gc,.g,.gco" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <>
                  <FileCode className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                  <p className="text-white font-semibold">{file.name}</p>
                  <p className="text-slate-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-white font-medium">Drop your .gcode file here</p>
                  <p className="text-slate-500 text-xs mt-1">or click to browse</p>
                </>
              )}
            </div>

            {file && (
              <motion.button
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                onClick={analyze}
                disabled={loading}
                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Zap className="w-4 h-4" /> Analyze G-Code</>}
              </motion.button>
            )}

            {error && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                <TriangleAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Summary bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-teal-400" />
                <p className="text-sm font-semibold text-white truncate">{file?.name}</p>
              </div>
              <button onClick={reset} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stat pills */}
            <div className="grid grid-cols-4 gap-2">
              <StatPill icon={Clock} label="Est. Time" value={result.estimated_print_time || '—'} color="bg-indigo-500/10 border-indigo-500/20 text-indigo-300" />
              <StatPill icon={Layers} label="Layers" value={result.layer_count ?? '—'} color="bg-cyan-500/10 border-cyan-500/20 text-cyan-300" />
              <StatPill icon={Thermometer} label="Nozzle" value={result.nozzle_temp ? `${result.nozzle_temp}°` : '—'} color="bg-orange-500/10 border-orange-500/20 text-orange-300" />
              <StatPill icon={Gauge} label="Speed" value={result.print_speed ? `${result.print_speed}` : '—'} color="bg-green-500/10 border-green-500/20 text-green-300" />
            </div>

            {/* AI Summary */}
            {result.summary && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">AI Summary</p>
                <p className="text-sm text-slate-200 leading-relaxed">{result.summary}</p>
              </div>
            )}

            {/* Geometry / Model */}
            {result.geometry && (
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-teal-400 uppercase mb-2">Detected Geometry</p>
                <p className="text-sm text-slate-300 leading-relaxed">{result.geometry}</p>
              </div>
            )}

            {/* Optimized settings */}
            {result.optimized_settings && result.optimized_settings.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Optimized Settings</p>
                <div className="space-y-2">
                  {result.optimized_settings.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">→</span>
                      <div>
                        <span className="font-semibold text-white">{s.setting}: </span>
                        <span className="text-slate-300">{s.current}</span>
                        {s.recommended && (
                          <><span className="text-slate-600 mx-1.5">→</span><span className="font-semibold text-green-400">{s.recommended}</span></>
                        )}
                        {s.reason && <p className="text-xs text-slate-500 mt-0.5">{s.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            {result.issues && result.issues.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">
                  Issues Found <span className="text-red-400 ml-1">{result.issues.length}</span>
                </p>
                <div className="space-y-2.5">
                  {result.issues.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />)}
                </div>
              </div>
            )}

            {result.issues?.length === 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-300">No issues detected — looks good to print!</p>
              </div>
            )}

            <button onClick={reset} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-all">
              Analyze Another File
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}