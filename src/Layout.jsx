import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Users, Lightbulb, Wand2, Settings, TrendingUp, GitCompare, BookOpen } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Header from './components/Header';
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
    { name: 'Compare', icon: GitCompare, page: 'Compare' },
    { name: 'Journal', icon: BookOpen, page: 'PrintJournal' },
    { name: 'History', icon: TrendingUp, page: 'History' },
    { name: 'Community', icon: Users, page: 'Community' },
  ];

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
            
            {/* Settings */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors text-slate-500 hover:text-slate-300 no-select"
                >
                  <Settings className="w-6 h-6" />
                  <span className="text-xs font-medium">Account</span>
                </button>
              </SheetTrigger>
              <SheetContent 
                side="bottom" 
                className="bg-slate-900 border-slate-800 max-h-[90vh] overflow-y-auto"
              >
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