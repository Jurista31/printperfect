import React, { useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, RotateCcw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CameraCapture({ onCapture, isAnalyzing }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    stopCamera();
  };

  const confirmCapture = () => {
    if (capturedImage) {
      // Convert base64 to blob
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
          onCapture(file);
        });
    }
  };

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!cameraActive && !capturedImage ? (
          <motion.div
            key="buttons"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 hover:bg-slate-800/30 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7 text-cyan-400" />
              </div>
              <p className="text-slate-300 font-medium">Upload an image</p>
              <p className="text-slate-500 text-sm mt-1">JPG, PNG up to 10MB</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-sm">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <Button
              onClick={startCamera}
              className="w-full h-14 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-medium rounded-xl transition-all duration-300"
            >
              <Camera className="w-5 h-5 mr-2" />
              Open Camera
            </Button>
          </motion.div>
        ) : cameraActive ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden bg-black"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border-2 border-cyan-400/30 rounded-lg" />
              <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
              <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
              <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
              <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button
                onClick={stopCamera}
                variant="ghost"
                className="w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white"
              >
                <X className="w-5 h-5" />
              </Button>
              <Button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 text-slate-900"
              >
                <div className="w-12 h-12 rounded-full border-4 border-slate-900" />
              </Button>
              <Button
                onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
                variant="ghost"
                className="w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        ) : capturedImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button
                onClick={resetCapture}
                disabled={isAnalyzing}
                variant="ghost"
                className="w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </Button>
              <Button
                onClick={confirmCapture}
                disabled={isAnalyzing}
                className="h-12 px-6 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-medium disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </div>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Analyze Print
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}