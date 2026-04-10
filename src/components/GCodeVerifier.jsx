import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCode, CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Loader2, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const severityColor = {
  high: 'text-red-400 bg-red-500/10 border-red-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  low: 'text-slate-400 bg-slate-700/40 border-slate-600/40',
};

const severityIcon = { high: AlertTriangle, medium: AlertCircle, low: Zap };

function VerificationRow({ label, gcodeVal, expected, match }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0 gap-2">
      <span className="text-xs text-slate-400 w-28 flex-shrink-0">{label}</span>
      <span className={cn('text-xs font-mono font-semibold flex-1 text-right', match === false ? 'text-amber-400' : 'text-slate-200')}>{gcodeVal ?? '—'}</span>
      {expected != null && (
        <span className={cn('text-xs ml-2 px-2 py-0.5 rounded-full border flex-shrink-0', match === false ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30')}>
          {match === false ? `expected ~${expected}` : '✓ match'}
        </span>
      )}
    </div>
  );
}

export default function GCodeVerifier({ analysis }) {
  const inputRef = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState(null);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  const handleFile = async (file) => {
    if (!file) return;
    setFilename(file.name);
    setLoading(true);
    setResult(null);
    const text = await file.text();
    const res = await base44.functions.invoke('verifyGCodeVsAnalysis', {
      gcode: text,
      filename: file.name,
      defects: analysis?.defects || [],
      printer_settings_suggestions: analysis?.printer_settings_suggestions || [],
      overall_quality: analysis?.overall_quality || null,
    });
    setResult(res.data);
    setLoading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Cross-reference: compare gcode params to defect-inferred expectations
  const verificationRows = result ? (() => {
    const rows = [];
    const defectNames = (analysis?.defects || []).map(d => d.name?.toLowerCase());
    const hasStringing = defectNames.some(n => n.includes('string'));
    const hasWarping = defectNames.some(n => n.includes('warp') || n.includes('adhesion'));
    const hasUnderExtrusion = defectNames.some(n => n.includes('under') || n.includes('extrusion'));

    if (result.nozzle_temp != null) {
      const expected = hasUnderExtrusion ? '210–220°C' : null;
      rows.push({ label: 'Nozzle Temp', gcodeVal: `${result.nozzle_temp}°C`, expected, match: expected ? null : true });
    }
    if (result.bed_temp != null) {
      rows.push({ label: 'Bed Temp', gcodeVal: `${result.bed_temp}°C`, expected: hasWarping ? '60–70°C' : null, match: true });
    }
    if (result.print_speed != null) {
      const tooFast = hasStringing && result.print_speed > 60;
      rows.push({ label: 'Print Speed', gcodeVal: `${result.print_speed} mm/s`, expected: tooFast ? '≤60 mm/s' : null, match: !tooFast });
    }
    if (result.layer_height != null) {
      rows.push({ label: 'Layer Height', gcodeVal: `${result.layer_height} mm`, expected: null, match: true });
    }
    if (result.retraction_distance != null) {
      rows.push({ label: 'Retraction', gcodeVal: `${result.retraction_distance} mm`, expected: hasStringing ? '4–6 mm' : null, match: hasStringing ? (result.retraction_distance >= 3.5 && result.retraction_distance <= 7) : true });
    }
    if (result.fan_speed != null) {
      rows.push({ label: 'Fan Speed', gcodeVal: `${result.fan_speed}%`, expected: null, match: true });
    }
    return rows;
  })() : [];

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <FileCode className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">G-Code Verifier</p>
          <p className="text-xs text-slate-400">Cross-check your slicer settings against this analysis</p>
        </div>
        {result && (
          <button onClick={() => { setResult(null); setFilename(null); }} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {!result && !loading && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 hover:border-indigo-500/60 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-300">Drop your .gcode file here</p>
                <p className="text-xs text-slate-500 mt-1">or click to browse</p>
              </div>
              <input ref={inputRef} type="file" accept=".gcode,.gco,.g,.nc" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </motion.div>
          )}

          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400">Analyzing <span className="text-white">{filename}</span>…</p>
            </motion.div>
          )}

          {result && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Summary */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/40">
                <p className="text-xs text-slate-400 mb-1 uppercase font-medium tracking-wide">File: {filename}</p>
                <p className="text-sm text-slate-200 leading-relaxed">{result.summary}</p>
              </div>

              {/* Parameter Verification Table */}
              {verificationRows.length > 0 && (
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/40">
                  <p className="text-xs uppercase font-medium text-slate-400 mb-2 tracking-wide">Parameter Verification</p>
                  {verificationRows.map((r, i) => (
                    <VerificationRow key={i} {...r} />
                  ))}
                </div>
              )}

              {/* Issues */}
              {result.issues?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase font-medium text-slate-400 tracking-wide">{result.issues.length} Issues Found</p>
                  {result.issues.map((issue, i) => {
                    const Icon = severityIcon[issue.severity] || Zap;
                    return (
                      <div key={i} className={cn('rounded-lg border overflow-hidden', severityColor[issue.severity] || severityColor.low)}>
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                          onClick={() => toggleExpand(i)}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium flex-1">{issue.title}</span>
                          {expanded[i] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {expanded[i] && (
                          <div className="px-3 pb-3 space-y-2 border-t border-current/20 pt-2">
                            <p className="text-xs opacity-80">{issue.description}</p>
                            {issue.fix && (
                              <div className="bg-black/20 rounded-lg p-2">
                                <p className="text-xs font-semibold mb-0.5 opacity-70">Suggested Fix</p>
                                <p className="text-xs">{issue.fix}</p>
                              </div>
                            )}
                            {issue.gcode_snippet && (
                              <pre className="bg-black/30 rounded p-2 text-xs font-mono overflow-x-auto">{issue.gcode_snippet}</pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Optimized Settings */}
              {result.optimized_settings?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase font-medium text-slate-400 tracking-wide">Printer-Specific Optimizations</p>
                  {result.optimized_settings.map((s, i) => (
                    <div key={i} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                        <span className="text-sm font-medium text-emerald-300">{s.setting}</span>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="line-through text-slate-500">{s.current}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">{s.recommended}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">{s.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {result.issues?.length === 0 && result.optimized_settings?.length === 0 && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <p className="text-sm text-emerald-300">G-code settings look good for this print!</p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => { setResult(null); setFilename(null); }}
                className="w-full border-slate-600 text-slate-400 hover:text-white"
              >
                Analyze Another File
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}