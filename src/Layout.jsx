import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Users, MessageSquare, Lightbulb, Wand2, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Header from './components/Header';
import AccountSettings from './components/AccountSettings';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastClickedTab, setLastClickedTab] = useState(null);
  
  // Preserve scroll positions per page
  const scrollPositions = useRef({});
  const lastPage = useRef(currentPageName);
  
  useEffect(() => {
    // Save scroll position when leaving a page
    if (lastPage.current !== currentPageName) {
      scrollPositions.current[lastPage.current] = window.scrollY;
      lastPage.current = currentPageName;
      
      // Restore scroll position for the new page
      const savedPosition = scrollPositions.current[currentPageName] || 0;
      requestAnimationFrame(() => {
        window.scrollTo(0, savedPosition);
      });
    }
  }, [currentPageName]);
  
  const navItems = [
    { name: 'Analyze', icon: Home, page: 'Home' },
    { name: 'Wizard', icon: Wand2, page: 'Wizard' },
    { name: 'Community', icon: Users, page: 'Community' },
    { name: 'Tips', icon: Lightbulb, page: 'Tips' }
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

  return (
    <div 
      className="min-h-screen"
      style={{ 
        paddingTop: '56px', // Header height
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' // Nav height + safe area
      }}
    >
      <Header currentPageName={currentPageName} />
      
      {children}
      
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