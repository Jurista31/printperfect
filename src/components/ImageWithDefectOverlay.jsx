import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const severityConfig = {
  high: {
    color: 'rgba(239, 68, 68, 0.6)',
    borderColor: 'rgb(239, 68, 68)',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    labelBg: 'bg-red-500'
  },
  medium: {
    color: 'rgba(251, 191, 36, 0.6)',
    borderColor: 'rgb(251, 191, 36)',
    icon: AlertCircle,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    labelBg: 'bg-amber-500'
  },
  low: {
    color: 'rgba(34, 211, 238, 0.6)',
    borderColor: 'rgb(34, 211, 238)',
    icon: Info,
    iconColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    labelBg: 'bg-cyan-500'
  }
};

export default function ImageWithDefectOverlay({ imageUrl, defects, showOverlays = true }) {
  const [hoveredDefect, setHoveredDefect] = useState(null);
  const [selectedDefect, setSelectedDefect] = useState(null);
  const imageRef = useRef(null);

  if (!imageUrl) return null;

  // Filter defects that have valid location data
  const defectsWithLocation = defects?.filter(
    d => d.location && 
         typeof d.location.x === 'number' && 
         typeof d.location.y === 'number' &&
         typeof d.location.width === 'number' &&
         typeof d.location.height === 'number'
  ) || [];

  const handleDefectClick = (defect, index) => {
    setSelectedDefect(selectedDefect?.index === index ? null : { ...defect, index });
  };

  return (
    <div className="relative w-full">
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Print analysis"
        className="w-full aspect-video object-cover rounded-2xl"
      />
      
      {/* Overlays */}
      {showOverlays && defectsWithLocation.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {defectsWithLocation.map((defect, index) => {
            const config = severityConfig[defect.severity] || severityConfig.low;
            const Icon = config.icon;
            const isHovered = hoveredDefect === index;
            const isSelected = selectedDefect?.index === index;
            const isActive = isHovered || isSelected;

            return (
              <React.Fragment key={index}>
                {/* Bounding Box */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
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
                  {/* Box outline */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-lg transition-all duration-300",
                      isActive ? "border-4" : "border-2"
                    )}
                    style={{
                      borderColor: config.borderColor,
                      backgroundColor: isActive ? config.color : 'transparent',
                      boxShadow: isActive ? `0 0 20px ${config.color}` : 'none'
                    }}
                  />

                  {/* Corner markers */}
                  {isActive && (
                    <>
                      <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full" style={{ backgroundColor: config.borderColor }} />
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ backgroundColor: config.borderColor }} />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full" style={{ backgroundColor: config.borderColor }} />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full" style={{ backgroundColor: config.borderColor }} />
                    </>
                  )}

                  {/* Label */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.1 }}
                    className={cn(
                      "absolute -top-8 left-0 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap flex items-center gap-1.5 shadow-lg",
                      config.labelBg
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {index + 1}. {defect.name}
                  </motion.div>

                  {/* Pulse animation for unselected */}
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      style={{ borderColor: config.borderColor }}
                      animate={{
                        opacity: [0.5, 0.8, 0.5],
                        scale: [1, 1.02, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                </motion.div>

                {/* Tooltip on hover */}
                <AnimatePresence>
                  {isHovered && !isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-50 pointer-events-none"
                      style={{
                        left: `${Math.min(defect.location.x + defect.location.width / 2, 80)}%`,
                        top: `${defect.location.y + defect.location.height + 2}%`,
                      }}
                    >
                      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-2xl max-w-xs">
                        <div className="flex items-start gap-2 mb-2">
                          <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", config.iconColor)} />
                          <div>
                            <p className="text-white font-semibold text-sm">{defect.name}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{defect.description}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 italic">Click for details</p>
                      </div>
                      {/* Arrow pointing to box */}
                      <div 
                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent"
                        style={{ borderBottomColor: 'rgb(15, 23, 42)' }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Selected Defect Details Panel */}
      <AnimatePresence>
        {selectedDefect && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 w-80 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 pointer-events-auto"
          >
            {/* Header */}
            <div className={cn(
              "p-4 border-b border-slate-700",
              severityConfig[selectedDefect.severity]?.bgColor
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  {(() => {
                    const Icon = severityConfig[selectedDefect.severity]?.icon || Info;
                    return <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", severityConfig[selectedDefect.severity]?.iconColor)} />;
                  })()}
                  <div>
                    <h3 className="text-white font-bold text-sm">{selectedDefect.name}</h3>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                      {selectedDefect.severity} severity
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDefect(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium mb-1">Description</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedDefect.description}</p>
              </div>

              {selectedDefect.causes && selectedDefect.causes.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-2">Possible Causes</p>
                  <ul className="space-y-1.5">
                    {selectedDefect.causes.map((cause, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-slate-600 mt-0.5">•</span>
                        {cause}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDefect.solutions && selectedDefect.solutions.length > 0 && (
                <div>
                  <p className="text-xs text-cyan-400 uppercase font-medium mb-2">Quick Fixes</p>
                  <ol className="space-y-2">
                    {selectedDefect.solutions.slice(0, 3).map((solution, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </span>
                        {solution}
                      </li>
                    ))}
                  </ol>
                  {selectedDefect.solutions.length > 3 && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      +{selectedDefect.solutions.length - 3} more solutions in full details
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      {showOverlays && defectsWithLocation.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300"
        >
          <p className="font-medium mb-1">🎯 {defectsWithLocation.length} defect{defectsWithLocation.length !== 1 ? 's' : ''} detected</p>
          <p className="text-slate-500">Hover or click boxes for details</p>
        </motion.div>
      )}
    </div>
  );
}