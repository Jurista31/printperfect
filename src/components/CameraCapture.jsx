import React, { useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, RotateCcw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CameraCapture({ onCapture, isAnalyzing, multiAngle = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to load metadata
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            resolve();
          };
        });
      }
      
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Unable to access camera. Please check permissions in your browser settings.");
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
    
    if (multiAngle) {
      setCapturedImages([...capturedImages, imageData]);
      // Don't stop camera in multi-angle mode
    } else {
      setCapturedImages([imageData]);
      stopCamera();
    }
  };

  const handleFileUpload = (e) => {
    const files = multiAngle ? Array.from(e.target.files) : [e.target.files[0]];
    
    Promise.all(
      files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(file);
        });
      })
    ).then(images => {
      setCapturedImages(images);
    });
  };

  const removeImage = (index) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  };

  const resetCapture = () => {
    setCapturedImages([]);
    stopCamera();
  };

  const confirmCapture = () => {
    if (capturedImages.length > 0) {
      // Convert base64 to blobs
      Promise.all(
        capturedImages.map((imageData, index) =>
          fetch(imageData)
            .then(res => res.blob())
            .then(blob => new File([blob], `capture-${index}.jpg`, { type: 'image/jpeg' }))
        )
      ).then(files => {
        onCapture(multiAngle ? files : files[0]);
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
        multiple={multiAngle}
        onChange={handleFileUpload}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!cameraActive && capturedImages.length === 0 ? (
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
              <p className="text-slate-300 font-medium">
                Upload {multiAngle ? 'images' : 'an image'}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {multiAngle ? 'Multiple angles recommended' : 'JPG, PNG up to 10MB'}
              </p>
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
            className="space-y-3"
          >
            <div className="relative rounded-2xl overflow-hidden bg-black">
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
              {multiAngle && capturedImages.length > 0 && (
                <div className="absolute top-4 right-4 bg-cyan-500/90 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                  {capturedImages.length} captured
                </div>
              )}
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
            </div>
            {multiAngle && capturedImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {capturedImages.map((img, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={img} alt={`Angle ${i + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : capturedImages.length > 0 ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            {capturedImages.length === 1 ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src={capturedImages[0]}
                  alt="Captured"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {capturedImages.map((img, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden group">
                    <img src={img} alt={`Angle ${i + 1}`} className="w-full aspect-square object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      disabled={isAnalyzing}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white px-2 py-0.5 rounded text-xs">
                      Angle {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {multiAngle && capturedImages.length > 0 && capturedImages.length < 4 && !cameraActive && (
              <Button
                onClick={startCamera}
                disabled={isAnalyzing}
                variant="outline"
                className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Camera className="w-4 h-4 mr-2" />
                Add Another Angle ({capturedImages.length}/4)
              </Button>
            )}

            <div className="flex justify-center gap-4">
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
                    Analyze {multiAngle && capturedImages.length > 1 ? `${capturedImages.length} Angles` : 'Print'}
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