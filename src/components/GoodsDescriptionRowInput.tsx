'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, Check, X } from 'lucide-react';
import { suggestHsnCodes, HsnMatchResult } from '@/lib/hsnDatabase';

export interface GoodsDescriptionRowInputProps {
  value: string;
  onChange: (description: string) => void;
  onSelectHsn: (hsnCode: string) => void;
  currentHsnCode?: string;
  rowIndex: number;
  placeholder?: string;
  className?: string;
}

export default function GoodsDescriptionRowInput({
  value,
  onChange,
  onSelectHsn,
  currentHsnCode = '',
  rowIndex,
  placeholder = 'Enter description (e.g. Cotton T-shirt, Books, Mobile Phone)',
  className = '',
}: GoodsDescriptionRowInputProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<HsnMatchResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const trimmed = (value || '').trim();
    if (trimmed.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        const matches = suggestHsnCodes(trimmed, 4);
        setSuggestions(matches);
        if (matches.length > 0) {
          setIsOpen(true);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectCode = (code: string) => {
    onSelectHsn(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium placeholder-slate-400"
        />
        {suggestions.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen((prev) => !prev)}
            title={`View ${suggestions.length} HSN suggestions for row ${rowIndex + 1}`}
            className="absolute right-1.5 text-amber-500 hover:text-amber-600 cursor-pointer p-0.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating HSN Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-80 sm:w-96 max-h-64 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xl divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 flex items-center justify-between border-b border-slate-100">
            <span className="flex items-center gap-1.5 text-amber-700">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Suggested HSN for Row #{rowIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="p-1 space-y-0.5">
            {suggestions.map((item, idx) => {
              const isSelected = item.entry.code === currentHsnCode;
              return (
                <div
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectCode(item.entry.code);
                  }}
                  className={`p-2 rounded-lg cursor-pointer transition-colors text-xs flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        HSN {item.entry.code}
                      </span>
                      <span className="text-[10px] text-slate-600 font-bold uppercase truncate max-w-[160px]">
                        {item.entry.category}
                      </span>
                      {item.entry.gstRate && (
                        <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                          {item.entry.gstRate}
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-600 line-clamp-1 leading-tight">
                      {item.entry.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                  >
                    <span>{isSelected ? 'Applied' : 'Apply'}</span>
                    {isSelected ? <Check className="w-3 h-3" /> : <ArrowRight className="w-2.5 h-2.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

