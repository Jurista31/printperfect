import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer, Bell } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import TrendAlertsPanel, { useTrendAlerts } from './TrendAlertsPanel';

const ROOT_PAGES = ['Home', 'Wizard', 'Community', 'Tips'];

export default function Header({ currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPage = ROOT_PAGES.includes(currentPageName);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { data: alerts = [] } = useTrendAlerts();
  const unreadCount = alerts.filter(a => !a.is_read).length;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {isRootPage ? (
          <>
            {/* Logo on root pages */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">PrintDoc</span>
            </div>
            <button
              onClick={() => setAlertsOpen(true)}
              className="relative p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
              <SheetContent side="right" className="bg-slate-900 border-slate-800 w-[340px] flex flex-col">
                <SheetHeader className="mb-0">
                  <SheetTitle className="sr-only">Trend Alerts</SheetTitle>
                </SheetHeader>
                <TrendAlertsPanel onClose={() => setAlertsOpen(false)} />
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <>
            {/* Back button on sub-pages */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 -ml-2"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <span className="text-sm font-medium text-slate-400 truncate max-w-[200px]">
              {currentPageName}
            </span>
          </>
        )}
      </div>
    </header>
  );
}