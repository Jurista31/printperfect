import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const severityConfig = {
  high: {
    color: 'rgba(239, 68, 68, 0.35)',
    borderColor: 'rgb(239, 68, 68)',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    labelBg: 'bg-red-500',
    chipBg: 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/40',
    chipActive: 'bg-red-500 border-red-400 text-white',
  },
  medium: {
    color: 'rgba(251, 191, 36, 0.35)',
    borderColor: 'rgb(251, 191, 36)',
    icon: AlertCircle,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    labelBg: 'bg-amber-500',
    chipBg: 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/40',
    chipActive: 'bg-amber-500 border-amber-400 text-white',
  },
  low: {
    color: 'rgba(34, 211, 238, 0.35)',
    borderColor: 'rgb(34, 211, 238)',
    icon: Info,
    iconColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    labelBg: 'bg-cyan-500',
    chipBg: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/40',
    chipActive: 'bg-cyan-500 border-cyan-400 text-white',
  }
};

// activeDefects: Set of indices that are visible. If null/undefined, all are shown.
export default function ImageWithDefectOverlay({ imageUrl, defects, activeDefects }) {
  const [hoveredDefect, setHoveredDefect] = useState(null);
  const [selectedDefect, setSelectedDefect] = useState(null);

  if (!imageUrl) return null;

  const defectsWithLocation = defects?.filter(
    d => d.location &&
         typeof d.location.x === 'number' &&
         typeof d.location.y === 'number' &&
         typeof d.location.width === 'number' &&
         typeof d.location.height === 'number'
  ) || [];

  const isVisible = (index) => {
    if (!activeDefects) return true; // no filter = show all
    return activeDefects.has(index);
  };

  const handleDefectClick = (defect, index) => {
    setSelectedDefect(selectedDefect?.index === index ? null : { ...defect, index });
  };

  return (
    <div className="relative w-full">
      <img
        src={imageUrl}
        alt="Print analysis"
        className="w-full aspect-video object-cover rounded-2xl"
      />

      {/* Overlays */}
      {defectsWithLocation.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {defectsWithLocation.map((defect, index) => {
            if (!isVisible(index)) return null;
            const config = severityConfig[defect.severity] || severityConfig.low;
            const Icon = config.icon;
            const isHovered = hoveredDefect === index;
            const isSelected = selectedDefect?.index === index;
            const isActive = isHovered || isSelected;

            return (
              <React.Fragment key={index}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="absolute pointer-events-auto cursor-pointer"
                  style={{
                    left: `${defect.location.x}%`,
                    top: `${defect.location.y}%`,
                    width: `${defect.location.width}%`,
                    height: `${defect.location.height}%`,
                  }}
                  onMouseEnter={() => setHoveredDefect(index)}
                  onMouseLeave={() => setHoveredDefect(null)}
                  onClick={() => handleDefectClick(defect, index)}
                >
                  {/* Semi-transparent fill — always visible */}
                  <div
                    className="absolute inset-0 rounded-lg transition-all duration-300"
                    style={{
                      borderWidth: isActive ? 3 : 2,
                      borderStyle: 'solid',
                      borderColor: config.borderColor,
                      backgroundColor: isActive ? config.color : config.color.replace('0.35', '0.15'),
                      boxShadow: isActive ? `0 0 18px ${config.color}` : `0 0 6px ${config.color}`,
                    }}
                  />

                  {/* Corner dots on hover */}
                  {isActive && (
                    <>
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.borderColor }} />
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.borderColor }} />
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.borderColor }} />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.borderColor }} />
                    </>
                  )}

                  {/* Label badge */}
                  <div
                    className={cn(
                      "absolute -top-7 left-0 px-2 py-1 rounded-md text-xs font-semibold text-white whitespace-nowrap flex items-center gap-1.5 shadow-lg",
                      config.labelBg
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {index + 1}. {defect.name}
                  </div>

                  {/* Pulse for idle state */}
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
                    />
                  )}
                </motion.div>

                {/* Hover tooltip */}
                <AnimatePresence>
                  {isHovered && !isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute z-50 pointer-events-none"
                      style={{
                        left: `${Math.min(defect.location.x + defect.location.width / 2, 75)}%`,
                        top: `${defect.location.y + defect.location.height + 2}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div className="bg-slate-900/98 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-2xl max-w-[200px]">
                        <div className="flex items-start gap-2">
                          <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", config.iconColor)} />
                          <div>
                            <p className="text-white font-semibold text-xs">{defect.name}</p>
                            <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{defect.description}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 italic">Tap for details</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Selected Defect Panel */}
      <AnimatePresence>
        {selectedDefect && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 w-72 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 pointer-events-auto"
          >
            <div className={cn("p-4 border-b border-slate-700", severityConfig[selectedDefect.severity]?.bgColor)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  {(() => {
                    const Icon = severityConfig[selectedDefect.severity]?.icon || Info;
                    return <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", severityConfig[selectedDefect.severity]?.iconColor)} />;
                  })()}
                  <div>
                    <h3 className="text-white font-bold text-sm">{selectedDefect.name}</h3>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">{selectedDefect.severity} severity</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDefect(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium mb-1">Description</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedDefect.description}</p>
              </div>
              {selectedDefect.causes?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Causes</p>
                  <ul className="space-y-1">
                    {selectedDefect.causes.map((c, i) => (
                      <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-slate-600">•</span>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedDefect.solutions?.length > 0 && (
                <div>
                  <p className="text-xs text-cyan-400 uppercase font-medium mb-1">Quick Fixes</p>
                  <ol className="space-y-1.5">
                    {selectedDefect.solutions.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-medium">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}