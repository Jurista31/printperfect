import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, BarChart2, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import JournalForm from '@/components/journal/JournalForm';
import JournalTimeline from '@/components/journal/JournalTimeline';
import JournalStats from '@/components/journal/JournalStats';
import FailureSuggestions from '@/components/journal/FailureSuggestionCard';

const TABS = [
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'stats', label: 'Stats', icon: BarChart2 },
];

export default function PrintJournal() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('timeline');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['print-journal'],
    queryFn: () => base44.entities.PrintJournalEntry.list('-print_date', 200),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['print-journal'] });

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.PrintJournalEntry.delete(id);
    refresh();
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingEntry(null);
    refresh();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Print Journal</h1>
              <p className="text-xs text-slate-500">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} logged</p>
            </div>
          </div>
          {!showForm && (
            <Button
              onClick={() => { setEditingEntry(null); setShowForm(true); }}
              className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white h-9"
            >
              <Plus className="w-4 h-4 mr-1" /> Log Print
            </Button>
          )}
        </motion.div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div key="form" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-6">
              <JournalForm
                initialEntry={editingEntry}
                onSave={handleFormSave}
                onCancel={handleFormCancel}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-teal-400 animate-spin" />
          </div>
        ) : entries.length === 0 && !showForm ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-10 text-center"
          >
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Start Your Print Journal</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
              Track every print — successful or not — to build an insight-rich history of your 3D printing journey.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Log Your First Print
            </Button>
          </motion.div>
        ) : entries.length > 0 && (
          <>
            <FailureSuggestions />
            {/* Tab switcher */}
            <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 mb-5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                    tab === id
                      ? "bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {tab === 'timeline' ? (
                <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <JournalTimeline entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
                </motion.div>
              ) : (
                <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <JournalStats entries={entries} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}