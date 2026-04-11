import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Users, Settings, BookOpen, LayoutDashboard, Lightbulb, FileCode, Printer, MoreHorizontal, BarChart2, Flame, TrendingUp, CalendarDays, FlaskConical, GitCompare, TestTube2, Package, Wrench, PieChart, Activity } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Header from './components/Header';
import SensorMonitor from './components/SensorMonitor';
import AccountSettings from './components/AccountSettings';

const ROOT_TABS = ['Home', 'Wizard', 'Community', 'Tips'];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastClickedTab, setLastClickedTab] = useState(null);
  
  // Navigation stacks for each tab
  const tabStacks = useRef({
    Home: [{ page: 'Home', scroll: 0 }],
    Wizard: [{ page: 'Wizard', scroll: 0 }],
    Community: [{ page: 'Community', scroll: 0 }],
    Tips: [{ page: 'Tips', scroll: 0 }]
  });
  
  const currentTab = useRef(ROOT_TABS.includes(currentPageName) ? currentPageName : 'Home');
  const lastPage = useRef(currentPageName);
  const [direction, setDirection] = useState(0);
  
  useEffect(() => {
    // Determine navigation direction for animations
    if (lastPage.current !== currentPageName) {
      const wasRootTab = ROOT_TABS.includes(lastPage.current);
      const isRootTab = ROOT_TABS.includes(currentPageName);
      
      if (isRootTab && wasRootTab) {
        // Tab switch
        setDirection(0);
        currentTab.current = currentPageName;
      } else if (!isRootTab && wasRootTab) {
        // Push into stack
        setDirection(1);
      } else if (isRootTab && !wasRootTab) {
        // Pop from stack
        setDirection(-1);
      }
      
      lastPage.current = currentPageName;
    }
  }, [currentPageName]);
  
  const navItems = [
    { name: 'Analyze', icon: Home, page: 'Home' },
    { name: 'Journal', icon: BookOpen, page: 'PrintJournal' },
    { name: 'Community', icon: Users, page: 'Community' },
    { name: 'Tips', icon: Lightbulb, page: 'Tips' },
  ];

  const moreItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'G-Code', icon: FileCode, page: 'GCodeAnalyzer' },
    { name: 'Printers', icon: Printer, page: 'PrinterProfiles' },
    { name: 'Analytics', icon: BarChart2, page: 'Analytics' },
    { name: 'Heatmap', icon: Flame, page: 'FailureHeatmapGallery' },
    { name: 'Trends', icon: TrendingUp, page: 'TrendDashboard' },
    { name: 'Scheduler', icon: CalendarDays, page: 'PrintScheduler' },
    { name: 'Root Cause', icon: FlaskConical, page: 'FailureAnalyzer' },
    { name: 'Compare', icon: GitCompare, page: 'PrintCompare' },
    { name: 'Materials', icon: TestTube2, page: 'MaterialPerformance' },
    { name: 'Inventory', icon: Package, page: 'FilamentInventory' },
    { name: 'Maintenance', icon: Wrench, page: 'PrinterMaintenance' },
    { name: 'Defect Stats', icon: PieChart, page: 'DefectAnalytics' },
    { name: 'Diagnostics', icon: Activity, page: 'DiagnosticsDashboard' },
  ];

  const isMoreActive = moreItems.some(item => item.page === currentPageName);

  const handleTabClick = (page) => {
    const isActive = currentPageName === page;
    
    if (isActive && lastClickedTab === page) {
      // Second click on active tab - scroll to top and reset route
      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(createPageUrl(page), { replace: true });
    }
    
    setLastClickedTab(page);
  };

  const pageVariants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : direction < 0 ? '-20%' : 0,
      opacity: direction === 0 ? 0 : 1,
      scale: direction < 0 ? 0.95 : 1
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction) => ({
      x: direction > 0 ? '-20%' : direction < 0 ? '100%' : 0,
      opacity: direction === 0 ? 0 : 1,
      scale: direction > 0 ? 0.95 : 1
    })
  };

  return (
    <div 
      className="min-h-screen overflow-x-hidden"
      style={{ 
        paddingTop: '56px',
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom))'
      }}
    >
      <Header currentPageName={currentPageName} />
      <SensorMonitor />
      
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      
      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={(e) => {
                    if (isActive) {
                      e.preventDefault();
                      handleTabClick(item.page);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative no-select",
                    isActive
                      ? "text-cyan-400"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" />
                  )}
                  <Icon className={cn("w-6 h-6", isActive && "scale-110")} />
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              );
            })}
            
            {/* More */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative no-select",
                    isMoreActive ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {isMoreActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" />
                  )}
                  <MoreHorizontal className="w-6 h-6" />
                  <span className="text-xs font-medium">More</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-slate-900 border-slate-800">
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-white text-sm">More</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-4 gap-3 pb-4">
                  {moreItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPageName === item.page;
                    return (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-colors",
                          isActive
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
                <div className="border-t border-slate-800 pt-4 pb-2">
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-medium">Account Settings</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Account Settings Sheet (triggered from More) */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger className="hidden" />
              <SheetContent side="bottom" className="bg-slate-900 border-slate-800 max-h-[90vh] overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-white">Account Settings</SheetTitle>
                </SheetHeader>
                <AccountSettings onClose={() => setSettingsOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </div>
  );
}