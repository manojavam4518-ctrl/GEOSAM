'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Check,
  ChevronDown,
  X,
  Search,
  BookOpen,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { suggestHsnCodes, HsnMatchResult, HSN_DATABASE, HsnEntry } from '@/lib/hsnDatabase';

export interface HsnCodeAutoSuggestProps {
  value: string;
  onChange: (hsnCode: string) => void;
  goodsDescription: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function HsnCodeAutoSuggest({
  value,
  onChange,
  goodsDescription,
  className = '',
  placeholder = 'e.g. 85423100 or search by product',
  disabled = false,
}: HsnCodeAutoSuggestProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [suggestions, setSuggestions] = useState<HsnMatchResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedConfirmed, setSelectedConfirmed] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Cache previously calculated results
  const cacheRef = useRef<Map<string, HsnMatchResult[]>>(new Map());

  // Debounced auto-analysis when goodsDescription changes
  useEffect(() => {
    if (!goodsDescription || goodsDescription.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const cleanDesc = goodsDescription.replace(/<[^>]*>?/gm, ' ').trim();
    if (cleanDesc.length < 2) return;

    setIsAnalyzing(true);
    const timer = setTimeout(() => {
      // Check cache first
      if (cacheRef.current.has(cleanDesc)) {
        const cached = cacheRef.current.get(cleanDesc) || [];
        setSuggestions(cached);
        setIsAnalyzing(false);
        return;
      }

      const results = suggestHsnCodes(cleanDesc, 6);
      cacheRef.current.set(cleanDesc, results);
      setSuggestions(results);
      setIsAnalyzing(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [goodsDescription]);

  // Combined suggestions: Auto-suggested from description + user manual typing filter
  const displayedSuggestions = useMemo(() => {
    if (!searchFilter.trim()) {
      return suggestions;
    }
    // If user has typed in the input, search HSN database directly by code or keyword
    return suggestHsnCodes(searchFilter, 8);
  }, [suggestions, searchFilter]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || displayedSuggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % displayedSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? displayedSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < displayedSuggestions.length) {
        handleSelectSuggestion(displayedSuggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectSuggestion = useCallback(
    (item: HsnMatchResult) => {
      onChange(item.entry.code);
      setSelectedConfirmed(true);
      setIsOpen(false);
      setSearchFilter('');
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    setSearchFilter(newVal);
    setSelectedConfirmed(false);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const cleanDescription = goodsDescription.replace(/<[^>]*>?/gm, ' ').trim();

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* 1. Main Input with Status Icons */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (displayedSuggestions.length > 0 || cleanDescription.length > 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 pr-20 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono text-slate-900 bg-white shadow-2xs transition-all disabled:opacity-50"
        />

        {/* Action icons on right of input */}
        <div className="absolute right-2 flex items-center gap-1">
          {/* Clear Button */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSearchFilter('');
                setSelectedConfirmed(false);
              }}
              title="Clear HSN Code"
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* AI Suggestions Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            title={
              displayedSuggestions.length > 0
                ? `${displayedSuggestions.length} HSN Suggestions Available`
                : 'Browse HSN Suggestions'
            }
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
              displayedSuggestions.length > 0
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-emerald-500' : 'text-emerald-600'}`} />
            <span className="hidden sm:inline">HSN AI</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Mini Helper Badge Below Input */}
      {selectedConfirmed && value && (
        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Verified Indian GST/Customs Classification confirmed</span>
        </div>
      )}

      {/* 3. Intelligent Suggestion Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 max-h-[380px] flex flex-col">
          {/* Header Bar */}
          <div className="px-3.5 py-2 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                Intelligent HSN Suggestions
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0">
              {displayedSuggestions.length > 0 && (
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400 font-bold border border-slate-700">
                  {displayedSuggestions.length} found
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:text-white p-0.5"
                title="Close suggestions"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Context pill showing current goods description */}
          {cleanDescription && (
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
              <span className="truncate">
                Detected Material:{' '}
                <strong className="text-slate-900 font-bold">{cleanDescription.slice(0, 45)}...</strong>
              </span>
              <span className="text-[10px] text-emerald-700 font-bold shrink-0 ml-2">Indian Tariff DB</span>
            </div>
          )}

          {/* Suggestions List */}
          <div className="overflow-y-auto divide-y divide-slate-100 p-1 flex-1">
            {displayedSuggestions.length > 0 ? (
              displayedSuggestions.map((item, idx) => {
                const isSelected = selectedIndex === idx || value === item.entry.code;
                return (
                  <div
                    key={`${item.entry.code}-${idx}`}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-2.5 rounded-lg transition-colors cursor-pointer text-left flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-emerald-50/80 border border-emerald-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {/* Top Row: Code + Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-300">
                          {item.entry.code}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {item.entry.digits}-digit
                        </span>
                        {item.entry.gstRate && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            GST {item.entry.gstRate}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                            item.confidence === 'HIGH'
                              ? 'bg-emerald-600 text-white'
                              : item.confidence === 'MEDIUM'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-500 text-white'
                          }`}
                        >
                          {item.confidence === 'HIGH' ? 'Best Match' : `${item.score}% Match`}
                        </span>

                        {value === item.entry.code && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category Title */}
                    <div className="font-bold text-xs text-slate-800 leading-snug">
                      {item.entry.category}
                    </div>

                    {/* Official Description */}
                    <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.entry.description}
                    </div>

                    {/* Match explanation */}
                    {item.matchedTerms && item.matchedTerms.length > 0 && (
                      <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                        Matched keywords: {item.matchedTerms.slice(0, 4).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center space-y-2">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  No matching HSN code found. Please enter manually.
                </p>
                <p className="text-[11px] text-slate-500">
                  You can type any 4, 6, or 8-digit Indian Customs / GST tariff code directly into the field.
                </p>
              </div>
            )}
          </div>

          {/* Footer Guide */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 shrink-0 gap-1.5">
            <span className="inline-flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400" />
              <span>Click any suggestion to populate • Manual entry always supported</span>
            </span>

            <span className="font-mono text-slate-400 hidden sm:inline">
              ↑↓ keys to navigate • Enter to select
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

