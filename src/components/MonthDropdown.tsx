import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface MonthDropdownProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const MonthDropdown: React.FC<MonthDropdownProps> = ({ selectedMonth, onSelectMonth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate options starting from January 2026 up to the current month in descending order
  const options = useMemo(() => {
    const list = [{ value: 'all', label: '全部月份' }];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 is January, 5 is June
    
    const startDate = new Date(2026, 4, 1); // May 1st, 2026
    const tempDate = new Date(currentYear, currentMonth, 1);
    
    while (tempDate >= startDate) {
      const year = tempDate.getFullYear();
      const monthNum = tempDate.getMonth() + 1;
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      const value = `${year}-${monthStr}`;
      const label = `${year}年${monthNum}月`;
      
      list.push({ value, label });
      
      // Go back one month
      tempDate.setMonth(tempDate.getMonth() - 1);
    }
    return list;
  }, []);

  const selectedLabel = useMemo(() => {
    if (selectedMonth === 'all') return '全部月份';
    const [year, month] = selectedMonth.split('-');
    if (year && month) {
      return `${year} 年 ${month} 月`;
    }
    return '全部月份';
  }, [selectedMonth]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef} id="month-dropdown-container">
      <button
        type="button"
        id="month-dropdown-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center justify-between gap-3 px-3 py-1.5 min-w-[140px] text-xs font-mono font-bold rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-white transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] select-none"
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={14} className="text-[#A3E635] shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div 
          id="month-dropdown-menu"
          className="absolute right-0 mt-1.5 w-52 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-[#A3E635] shadow-[0_4px_24px_rgba(163,230,53,0.15)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-100"
        >
          <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {options.map((option) => {
              const isSelected = selectedMonth === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  id={`month-opt-${option.value}`}
                  onClick={() => {
                    onSelectMonth(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors cursor-pointer hover:bg-white/[0.04] flex items-center justify-between ${
                    isSelected ? 'text-[#A3E635] font-bold bg-white/[0.02]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#A3E635] shadow-[0_0_6px_#A3E635]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
