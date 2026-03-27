import React, { useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ImageDropZone({ label, image, onImage, onClear, side }) {
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onImage({ file, preview: e.target.result });
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const accentColor = side === 'A'
    ? 'border-cyan-500/40 bg-cyan-500/5 hover:border-cyan-500/70'
    : 'border-purple-500/40 bg-purple-500/5 hover:border-purple-500/70';
  const badgeColor = side === 'A'
    ? 'bg-cyan-500 text-white'
    : 'bg-purple-500 text-white';

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", badgeColor)}>{side}</span>
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>

      {image ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-xl overflow-hidden aspect-square border border-slate-700"
        >
          <img src={image.preview} alt={`Print ${side}`} className="w-full h-full object-cover" />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 flex items-center justify-center hover:bg-red-500/80 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className={cn("absolute bottom-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full", badgeColor)}>
            Print {side}
          </div>
        </motion.div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
            accentColor
          )}
        >
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-slate-500" />
          </div>
          <div className="text-center px-2">
            <p className="text-sm text-slate-400 font-medium">Upload Print {side}</p>
            <p className="text-xs text-slate-600 mt-0.5">Tap or drag & drop</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-full">
            <Upload className="w-3 h-3" /> Choose photo
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  );
}