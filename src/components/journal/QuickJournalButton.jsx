import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import JournalForm from './JournalForm';

export default function QuickJournalButton({ analysis }) {
  const [open, setOpen] = useState(false);

  const qualityToOutcome = { excellent: 'success', good: 'success', fair: 'partial', poor: 'failure' };

  const prefill = {
    analysis_id: analysis?.id || '',
    image_url: analysis?.image_url || '',
    outcome: qualityToOutcome[analysis?.overall_quality] || 'success',
    notes: analysis?.summary ? `AI Summary: ${analysis.summary.slice(0, 300)}` : '',
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full h-14 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-medium rounded-xl"
      >
        <BookOpen className="w-5 h-5 mr-2" />
        Log to Print Journal
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="bg-slate-950 border-slate-800 max-h-[92vh] overflow-y-auto p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-800">
            <SheetTitle className="text-white text-base">Log This Print</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <JournalForm
              initialEntry={prefill}
              onSave={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}