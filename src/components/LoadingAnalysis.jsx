import React from 'react';
import { motion } from "framer-motion";
import { Scan, Cpu, Zap } from "lucide-react";

export default function LoadingAnalysis() {
  const steps = [
    { icon: Scan, label: "Scanning image..." },
    { icon: Cpu, label: "AI analyzing defects..." },
    { icon: Zap, label: "Generating solutions..." }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-12 px-6"
    >
      <div className="flex flex-col items-center">
        {/* Animated scanner */}
        <div className="relative w-32 h-32 mb-8">
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-cyan-500/30"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-2 rounded-xl border border-cyan-400/50"
            animate={{ scale: [1, 0.95, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Cpu className="w-8 h-8 text-cyan-400" />
            </motion.div>
          </motion.div>
          
          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            initial={{ top: 0 }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-3 w-full max-w-xs">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.3 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center"
                  animate={{ 
                    backgroundColor: ["rgba(30,41,59,1)", "rgba(6,182,212,0.2)", "rgba(30,41,59,1)"] 
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.5 }}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                </motion.div>
                <span className="text-sm text-slate-400">{step.label}</span>
                <motion.div
                  className="ml-auto flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.3 + 0.2 }}
                >
                  {[0, 1, 2].map((dot) => (
                    <motion.div
                      key={dot}
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ 
                        duration: 1, 
                        repeat: Infinity, 
                        delay: dot * 0.2 + index * 0.3 
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          className="text-slate-500 text-sm mt-8 text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          This usually takes 5-10 seconds
        </motion.p>
      </div>
    </motion.div>
  );
}