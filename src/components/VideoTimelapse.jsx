import React, { useRef, useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Upload, Camera, CameraOff, Sparkles, Loader2, X, AlertTriangle, Clock, Play, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SEVERITY_STYLE = {
  high:   'bg-red-500/20 border-red-500/40 text-red-400',
  medium: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
  low:    'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
};

// Extract a single frame from a video element at current time
function captureFrame(videoEl, maxW = 640) {
  const canvas = document.createElement('canvas');
  const ratio = videoEl.videoHeight / videoEl.videoWidth;
  canvas.width = maxW;
  canvas.height = Math.round(maxW * ratio);
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.75);
}

// Seek video to a time and wait for seeked event
function seekTo(videoEl, time) {
  return new Promise(resolve => {
    const handler = () => { videoEl.removeEventListener('seeked', handler); resolve(); };
    videoEl.addEventListener('seeked', handler);
    videoEl.currentTime = time;
  });
}

// Sample N frames spread across video duration, return array of {time, dataUrl}
async function sampleFrames(videoEl, count = 8) {
  const dur = videoEl.duration;
  if (!dur || !isFinite(dur)) return [];
  const frames = [];
  const step = dur / (count + 1);
  for (let i = 1; i <= count; i++) {
    const t = step * i;
    await seekTo(videoEl, t);
    frames.push({ time: t, dataUrl: captureFrame(videoEl) });
  }
  return frames;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoTimelapse({ videoUrl, onVideoUrlChange, entryId, onAnalysisSaved }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [mode, setMode] = useState('upload'); // 'upload' | 'webcam'
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [failureEvents, setFailureEvents] = useState([]);
  const [summary, setSummary] = useState('');
  const [analysisDone, setAnalysisDone] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Stop webcam on unmount
  useEffect(() => () => stopStream(), []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const startWebcam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setCameraActive(true);
  };

  const stopWebcam = () => {
    stopStream();
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const file = new File([blob], 'timelapse.webm', { type: 'video/webm' });
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoUrlChange(file_url);
      setUploading(false);
      stopWebcam();
      setMode('upload');
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onVideoUrlChange(file_url);
    setUploading(false);
    setFailureEvents([]);
    setAnalysisDone(false);
  };

  const analyzeVideo = async () => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoUrl) return;
    setAnalyzing(true);

    // Sample 8 frames across the video
    const frames = await sampleFrames(videoEl, 8);
    // Reset playback
    videoEl.currentTime = 0;

    if (frames.length === 0) { setAnalyzing(false); return; }

    // Upload each frame and build a prompt with all images
    const frameUrls = await Promise.all(
      frames.map(async ({ time, dataUrl }) => {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `frame-${Math.round(time)}s.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { time, url: file_url };
      })
    );

    const frameDescriptions = frameUrls.map(f => `Frame at ${formatTime(f.time)} (${Math.round(f.time)}s)`).join(', ');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing frames from a 3D print time-lapse video to detect print failures.

I am providing ${frameUrls.length} frames sampled from the video at these timestamps: ${frameDescriptions}.

For each image, carefully examine it for:
- Stringing or oozing
- Bed adhesion failures (print lifting, warping)
- Layer shifts or misalignment
- Under-extrusion or gaps
- Spaghetti (complete print failure / detachment)
- Blobs or zits
- Warping or curling

Return a JSON with:
- summary: 2-3 sentence overall assessment of print quality across all frames
- failure_events: array of detected issues (can be empty if print looks good). For each:
  - timestamp_seconds: approximate time in seconds when failure is visible
  - timestamp_label: human-readable time like "2:15"
  - defect_type: one of stringing|bed_adhesion|warping|layer_shift|under_extrusion|spaghetti|blobs|unknown
  - severity: high|medium|low
  - description: 1-sentence description of what you see

Only report actual visible issues. If no failures are detected, return empty failure_events array.`,
      file_urls: frameUrls.map(f => f.url),
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          failure_events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                timestamp_seconds: { type: 'number' },
                timestamp_label: { type: 'string' },
                defect_type: { type: 'string' },
                severity: { type: 'string' },
                description: { type: 'string' },
              }
            }
          }
        }
      }
    });

    const events = result?.failure_events || [];
    const summ = result?.summary || '';
    setFailureEvents(events);
    setSummary(summ);
    setAnalysisDone(true);

    // Save to VideoAnalysis entity if we have an entry ID
    if (entryId) {
      const saved = await base44.entities.VideoAnalysis.create({
        journal_entry_id: entryId,
        video_url: videoUrl,
        duration_seconds: videoEl.duration,
        failure_events: events,
        summary: summ,
        analyzed_at: new Date().toISOString(),
      });
      if (onAnalysisSaved) onAnalysisSaved(saved);
    }

    setAnalyzing(false);
  };

  const seekToEvent = (sec) => {
    if (videoRef.current) videoRef.current.currentTime = sec;
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { stopWebcam(); setMode('upload'); }}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all',
            mode === 'upload' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
          )}
        >
          <Upload className="w-3.5 h-3.5" /> Upload File
        </button>
        <button
          type="button"
          onClick={() => { setMode('webcam'); startWebcam(); }}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all',
            mode === 'webcam' ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
          )}
        >
          <Camera className="w-3.5 h-3.5" /> Webcam Capture
        </button>
      </div>

      {/* Upload mode */}
      {mode === 'upload' && (
        <label className="flex items-center gap-3 cursor-pointer bg-slate-800 border border-dashed border-slate-600 rounded-lg px-4 py-3 hover:border-cyan-500/50 transition-colors">
          <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          {uploading ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /> : <Video className="w-4 h-4 text-slate-500" />}
          <span className="text-xs text-slate-400">{videoUrl ? 'Change video / time-lapse' : 'Upload a video or time-lapse'}</span>
          {videoUrl && (
            <button type="button" onClick={(e) => { e.preventDefault(); onVideoUrlChange(''); setFailureEvents([]); setAnalysisDone(false); }} className="ml-auto text-slate-600 hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>
      )}

      {/* Webcam mode */}
      {mode === 'webcam' && (
        <div className="space-y-2">
          <video
            ref={cameraActive ? videoRef : undefined}
            autoPlay muted playsInline
            className="w-full rounded-xl bg-black max-h-48 object-contain"
          />
          <div className="flex gap-2">
            {!recording ? (
              <Button type="button" onClick={startRecording} disabled={!cameraActive}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> Record
              </Button>
            ) : (
              <Button type="button" onClick={stopRecording}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-400" /> Stop & Save
              </Button>
            )}
            <Button type="button" onClick={stopWebcam} variant="outline"
              className="border-slate-600 text-slate-400 gap-1 text-xs">
              <CameraOff className="w-3.5 h-3.5" />
            </Button>
          </div>
          {uploading && <p className="text-xs text-cyan-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</p>}
        </div>
      )}

      {/* Video player with markers */}
      {videoUrl && mode === 'upload' && (
        <div className="space-y-2">
          <div className="relative">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full rounded-xl bg-black max-h-52"
              onLoadedMetadata={e => setDuration(e.target.duration)}
              onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
            />
          </div>

          {/* Timeline with failure markers */}
          {duration > 0 && failureEvents.length > 0 && (
            <div className="relative h-5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-cyan-600/30 rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {failureEvents.map((ev, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => seekToEvent(ev.timestamp_seconds)}
                  title={`${ev.defect_type} at ${ev.timestamp_label}`}
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 transition-transform hover:scale-125 z-10',
                    ev.severity === 'high' ? 'bg-red-500' : ev.severity === 'medium' ? 'bg-amber-500' : 'bg-cyan-500'
                  )}
                  style={{ left: `${Math.min(98, Math.max(2, (ev.timestamp_seconds / duration) * 100))}%` }}
                />
              ))}
            </div>
          )}

          {/* Analyze button */}
          {!analysisDone ? (
            <Button
              type="button"
              onClick={analyzeVideo}
              disabled={analyzing}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white gap-2"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Analyzing video for failures…' : 'AI: Detect Failure Timestamps'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              Analysis complete · {failureEvents.length === 0 ? 'No failures detected' : `${failureEvents.length} event${failureEvents.length > 1 ? 's' : ''} found`}
              <button type="button" onClick={() => { setAnalysisDone(false); setFailureEvents([]); }} className="ml-auto text-slate-600 hover:text-slate-400">Re-analyze</button>
            </div>
          )}
        </div>
      )}

      {/* AI Results */}
      <AnimatePresence>
        {(summary || failureEvents.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {summary && (
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-violet-300 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />AI Video Summary</p>
                <p className="text-xs text-slate-300 leading-relaxed">{summary}</p>
              </div>
            )}

            {failureEvents.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Failure Events — click to jump</p>
                {failureEvents.map((ev, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => seekToEvent(ev.timestamp_seconds)}
                    className={cn('w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg border transition-all hover:scale-[1.01]', SEVERITY_STYLE[ev.severity] || SEVERITY_STYLE.low)}
                  >
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold tabular-nums">{ev.timestamp_label || formatTime(ev.timestamp_seconds)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold capitalize">{(ev.defect_type || 'unknown').replace(/_/g, ' ')}</p>
                      <p className="text-xs opacity-80 mt-0.5">{ev.description}</p>
                    </div>
                    <Play className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}