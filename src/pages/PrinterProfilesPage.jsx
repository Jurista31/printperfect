import React from 'react';
import { motion } from 'framer-motion';
import { Printer } from 'lucide-react';
import PrinterProfiles from '@/components/PrinterProfiles';
import PrinterHoursTracker from '@/components/PrinterHoursTracker';

export default function PrinterProfilesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Printer Profiles</h1>
            <p className="text-xs text-slate-500">Hardware setups for AI-tailored analysis</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
          <PrinterProfiles />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
          <PrinterHoursTracker />
        </motion.div>
      </div>
    </div>
  );
}