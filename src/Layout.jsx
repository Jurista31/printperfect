import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Users, MessageSquare, Lightbulb, Wand2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const navItems = [
    { name: 'Analyze', icon: Home, page: 'Home' },
    { name: 'Wizard', icon: Wand2, page: 'Wizard' },
    { name: 'Community', icon: Users, page: 'Community' },
    { name: 'Tips', icon: Lightbulb, page: 'Tips' }
  ];

  return (
    <div className="min-h-screen pb-20">
      {children}
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-50">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors relative",
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
          </div>
        </div>
      </nav>
    </div>
  );
}