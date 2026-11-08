'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Hash, Check, Loader2, ArrowRight } from 'lucide-react';
import { suggestHsnCodes, HsnMatchResult } from '@/lib/hsnDatabase';

export interface HsnRowSuggestInputProps {
  value: string;
  description?: string;
  onChange: (hsnCode: string) => void;
  onDescriptionAssist?: (description: string) => void;
  placeholder?: string;
  className?: string;
  openUpward?: boolean;
}

export default function HsnRowSuggestInput({
  value,
  description = '',
  onChange,
  onDescriptionAssist,
  placeholder = 'HSN Code or Name',
  className = '',
  openUpward = false,
}: HsnRowSuggestInputProps) {
  const [inputValue, setInputValue] = useState<string>(value || '');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<HsnMatchResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [shouldOpenUp, setShouldOpenUp] = useState<boolean>(openUpward);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal display with incoming value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Determine whether to open upward if near the bottom of viewport
  const updateDropdownDirection = () => {
    if (openUpward) {
      setShouldOpenUp(true);
      return;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If space below is less than 260px and space above is ample, open upward
      if (spaceBelow < 260 && rect.top > 260) {
        setShouldOpenUp(true);
      } else {
        setShouldOpenUp(false);
      }
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed a product keyword without selecting, revert to confirmed numeric value
        const isNumeric = /^\d+$/.test(inputValue.trim());
        if (!isNumeric && inputValue.trim().length > 0) {
          setInputValue(value || '');
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [inputValue, value]);

  // Handle Input Changes: Dual-Input Capability (Direct HSN digits vs. Product Keyword Search)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const isNumericOnly = /^\d*$/.test(text);

    if (isNumericOnly) {
      // 1. Direct Numeric Entry (4, 6, 8 digits allowed)
      const cleanNum = text.slice(0, 8);
      setInputValue(cleanNum);
      onChange(cleanNum); // directly update the model with valid digits

      if (cleanNum.length >= 2) {
        setIsLoading(true);
        updateDropdownDirection();
        debounceTimerRef.current = setTimeout(() => {
          const res = suggestHsnCodes(cleanNum, 6);
          setSuggestions(res);
          setIsLoading(false);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }, 150);
      } else {
        setSuggestions([]);
        setIsOpen(false);
        setIsLoading(false);
      }
    } else {
      // 2. Product Name / Keyword Search (e.g. Cotton, Shoes, Textile, Mobile phone, Electronics)
      // Do NOT save raw product keywords into the final HSN numeric code
      const trimmed = text.trim();
      if (trimmed.length >= 2) {
        setIsLoading(true);
        setIsOpen(true);
        updateDropdownDirection();
        debounceTimerRef.current = setTimeout(() => {
          const res = suggestHsnCodes(trimmed, 6);
          setSuggestions(res);
          setIsLoading(false);
          setHighlightedIndex(res.length > 0 ? 0 : -1);
        }, 180);
      } else {
        setSuggestions([]);
        setIsOpen(false);
        setIsLoading(false);
      }
    }
  };

  const handleSelect = (item: HsnMatchResult) => {
    const code = item.entry.code;
    setInputValue(code);
    onChange(code);

    if (onDescriptionAssist) {
      onDescriptionAssist(item.entry.category);
    }

    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If clicking inside the dropdown, ignore blur
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }

    // Revert non-numeric product search keywords to last confirmed code
    const isNumeric = /^\d+$/.test(inputValue.trim());
    if (!isNumeric && inputValue.trim().length > 0) {
      setInputValue(value || '');
    }

    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleFocus = () => {
    updateDropdownDirection();
    const query = (inputValue || '').trim() || (description || '').trim();
    if (query.length >= 2) {
      const res = suggestHsnCodes(query, 6);
      setSuggestions(res);
      if (res.length > 0) {
        setIsOpen(true);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const isConfirmedHsn = /^\d{4,8}$/.test(value || '');

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full pl-2.5 pr-7 py-1.5 rounded-lg border text-xs font-bold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
            isConfirmedHsn
              ? 'border-emerald-300 font-mono bg-emerald-50/20'
              : 'border-slate-300 font-sans'
          }`}
        />

        {/* Status / Trigger Indicator */}
        <div className="absolute right-1.5 flex items-center">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
          ) : isConfirmedHsn ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                updateDropdownDirection();
                setIsOpen((prev) => !prev);
              }}
              title="Verified HSN Code"
              className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          ) : suggestions.length > 0 ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                updateDropdownDirection();
                setIsOpen((prev) => !prev);
              }}
              title={`${suggestions.length} HSN suggestions found`}
              className="text-amber-500 hover:text-amber-600 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Hash className="w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 right-auto z-50 w-72 sm:w-84 max-h-64 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xl divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 ${
            shouldOpenUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {/* Header */}
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
            <span className="flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-3 h-3 text-amber-500" />
              HSN Code Directory
            </span>
            {suggestions.length > 0 && (
              <span className="font-mono text-emerald-700 font-bold">
                {suggestions.length} Match{suggestions.length > 1 ? 'es' : ''}
              </span>
            )}
          </div>

          {/* Empty State */}
          {!isLoading && suggestions.length === 0 && inputValue.trim().length >= 2 && (
            <div className="p-3 text-center text-xs text-slate-600">
              <p className="font-bold text-slate-700">
                No matching HSN codes found for &ldquo;{inputValue}&rdquo;
              </p>
              <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                Try another product keyword (e.g. Cotton, Shoes, Books, Electronics) or enter a 4/6/8-digit HSN code directly.
              </p>
            </div>
          )}

          {/* Suggestions List */}
          {suggestions.map((item, idx) => {
            const isMatch = item.entry.code === value;
            const isHighlighted = idx === highlightedIndex;

            return (
              <div
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input onBlur from firing first
                  handleSelect(item);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`p-2.5 cursor-pointer transition-colors text-xs ${
                  isHighlighted
                    ? 'bg-emerald-50 text-emerald-950 font-bold'
                    : isMatch
                      ? 'bg-emerald-50/60 text-emerald-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                      {item.entry.code}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold uppercase truncate">
                      {item.entry.category}
                    </span>
                  </div>
                  {item.entry.gstRate && (
                    <span className="text-[9.5px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                      GST {item.entry.gstRate}
                    </span>
                  )}
                </div>

                <p className="text-[10.5px] text-slate-600 line-clamp-2 leading-tight">
                  {item.entry.description}
                </p>

                {item.explanation && (
                  <p className="text-[9px] text-emerald-700 font-medium mt-1 truncate">
                    {item.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
