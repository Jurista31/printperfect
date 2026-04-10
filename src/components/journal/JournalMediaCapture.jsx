import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Upload, X, RotateCcw, Loader2, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function JournalMediaCapture({ imageUrl, onImageUrl }) {
  const fileInputRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();

  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // base64 before upload

  const startCamera = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    setStream(mediaStream);
    setCameraOpen(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    }, 50);
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const flipCamera = async () => {
    stopCamera();
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    setTimeout(async () => {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    }, 100);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl);
    stopCamera();
  };

  const uploadPreview = async () => {
    setUploading(true);
    const blob = await (await fetch(preview)).blob();
    const file = new File([blob], `failure-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onImageUrl(file_url);
    setPreview(null);
    setUploading(false);
  };

  const discardPreview = () => setPreview(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onImageUrl(file_url);
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera viewfinder */}
      <AnimatePresence>
        {cameraOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="relative rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
            {/* Corner guides */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-red-400 rounded-tl" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-red-400 rounded-tr" />
              <div className="absolute bottom-14 left-4 w-6 h-6 border-b-2 border-l-2 border-red-400 rounded-bl" />
              <div className="absolute bottom-14 right-4 w-6 h-6 border-b-2 border-r-2 border-red-400 rounded-br" />
              <div className="absolute top-3 left-0 right-0 flex justify-center">
                <span className="text-xs text-red-300 bg-black/50 px-2 py-0.5 rounded-full font-medium">📷 Failure Capture</span>
              </div>
            </div>
            {/* Controls */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-5">
              <button onClick={stopCamera}
                className="w-10 h-10 rounded-full bg-slate-900/80 flex items-center justify-center text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <button onClick={capturePhoto}
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-slate-100">
                <div className="w-10 h-10 rounded-full border-4 border-slate-800" />
              </button>
              <button onClick={flipCamera}
                className="w-10 h-10 rounded-full bg-slate-900/80 flex items-center justify-center text-slate-300 hover:text-white">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Captured preview (before upload) */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative rounded-xl overflow-hidden border border-red-500/30">
            <img src={preview} alt="Captured failure" className="w-full aspect-[4/3] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
              <button onClick={discardPreview}
                className="px-4 py-1.5 rounded-lg bg-slate-900/90 border border-slate-600 text-slate-300 text-xs font-medium">
                Retake
              </button>
              <button onClick={uploadPreview} disabled={uploading}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save to Entry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing saved image */}
      {imageUrl && !preview && !cameraOpen && (
        <div className="relative rounded-xl overflow-hidden border border-slate-700">
          <img src={imageUrl} alt="Print photo" className="w-full aspect-[4/3] object-cover" />
          <button onClick={() => onImageUrl('')}
            className="absolute top-2 right-2 w-7 h-7 bg-slate-900/90 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action row */}
      {!cameraOpen && !preview && (
        <div className="flex gap-2">
          <label className={cn(
            'flex-1 flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2.5 border border-dashed text-xs transition-colors',
            imageUrl ? 'border-teal-500/40 bg-teal-500/5 text-teal-400' : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-cyan-500/50'
          )}>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {imageUrl ? 'Replace file' : 'Upload photo / video'}
          </label>
          <button type="button" onClick={startCamera}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-medium hover:bg-red-600/30 transition-colors">
            <Camera className="w-3.5 h-3.5" /> Live Capture
          </button>
        </div>
      )}
    </div>
  );
}