import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;
};

export function MobileSelect({ value, onValueChange, children, title, trigger }) {
  const [open, setOpen] = useState(false);

  const options = React.Children.toArray(children).filter(
    child => child.type === SelectItem
  );

  const selectedLabel = options.find(o => o.props.value === value)?.props?.children || value;

  if (!isMobile()) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        {trigger}
        <SelectContent>{children}</SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none"
      >
        <span>{selectedLabel}</span>
        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-slate-900 border-slate-800">
          <DrawerHeader>
            <DrawerTitle className="text-white">{title || 'Select an option'}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2 max-h-[50vh] overflow-y-auto">
            {options.map((option, index) => {
              const optionValue = option.props.value;
              const isSelected = value === optionValue;
              return (
                <button
                  key={index}
                  onClick={() => { onValueChange(optionValue); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left border",
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-500/50"
                      : "bg-slate-800 hover:bg-slate-700 border-slate-700"
                  )}
                >
                  <span className={cn("text-base", isSelected ? "text-cyan-400 font-medium" : "text-slate-300")}>
                    {option.props.children}
                  </span>
                  {isSelected && <Check className="w-5 h-5 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}