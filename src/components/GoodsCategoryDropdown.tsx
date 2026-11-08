'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Search, Check, Sparkles, X } from 'lucide-react';
import {
  GENERALIZED_GOODS_CATEGORIES,
  OTHER_CUSTOM_DESCRIPTION_OPTION,
} from '@/lib/goodsCategories';

export const GOODS_DROPDOWN_AUTO_CLOSE_DELAY_MS = 1100;

export interface GoodsCategoryDropdownProps {
  onSelectCategory: (category: string) => void;
  selectedCategory?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * GoodsCategoryDropdown
 *
 * Searchable dropdown for generalized goods categories in Goods Declaration:
 * 1. Positioned immediately after "Content (Goods Description) *" header on the same horizontal line.
 * 2. Displays "Select Goods from the List ▼".
 * 3. Includes instant search filter across all 27 generalized categories.
 * 4. Features "Other / Custom Description" at the bottom.
 * 5. Implements 1.1s (1100ms) delayed auto-closure on cursor exit, cancellable on re-entry.
 * 6. Closes immediately when an option is selected.
 */
export default function GoodsCategoryDropdown({
  onSelectCategory,
  selectedCategory = '',
  disabled = false,
  className = '',
}: GoodsCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to safely clear pending close timeout
  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // When cursor enters the dropdown trigger button or list area, cancel pending closure
  const handleMouseEnterDropdownArea = useCallback(() => {
    clearCloseTimer();
  }, [clearCloseTimer]);

  // When cursor leaves the dropdown area, start 1.1s (1100ms) timer unless user is searching
  const handleMouseLeaveDropdownArea = useCallback(() => {
    if (!isOpen) return;
    if (isSearchFocused) return; // Keep open while user is focused on searching
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, GOODS_DROPDOWN_AUTO_CLOSE_DELAY_MS);
  }, [isOpen, isSearchFocused, clearCloseTimer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  // Clear timer whenever dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      clearCloseTimer();
      setSearchQuery('');
    } else {
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, clearCloseTimer]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        clearCloseTimer();
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearCloseTimer]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        clearCloseTimer();
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, clearCloseTimer]);

  const handleToggleDropdown = () => {
    if (disabled) return;
    clearCloseTimer();
    setIsOpen((prev) => !prev);
  };

  const handleSelectOption = (category: string) => {
    clearCloseTimer();
    onSelectCategory(category);
    setIsOpen(false);
  };

  // Filter categories based on search input
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return GENERALIZED_GOODS_CATEGORIES;
    return GENERALIZED_GOODS_CATEGORIES.filter((cat) => cat.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnterDropdownArea}
      onMouseLeave={handleMouseLeaveDropdownArea}
    >
      {/* Dropdown Selector Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        disabled={disabled}
        title="Select generalized goods category from predefined list"
        aria-label="Select Goods from the List"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-500/20'
            : 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-300'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Select Goods from the List</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Generalized Goods Categories"
          onMouseEnter={handleMouseEnterDropdownArea}
          onMouseLeave={handleMouseLeaveDropdownArea}
          className="absolute left-0 top-full mt-1.5 w-76 bg-white rounded-xl border border-slate-200 shadow-2xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100 before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2"
        >
          {/* Header Title & Search Box */}
          <div className="px-3 pb-2 border-b border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Generalized Goods Categories
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {GENERALIZED_GOODS_CATEGORIES.length} Categories
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search goods category..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-slate-50/60 text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Categories List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const isSelected = selectedCategory.trim().toLowerCase() === category.toLowerCase();
                return (
                  <button
                    key={category}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(category)}
                    className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate pr-2">{category}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3.5 py-3 text-center text-xs text-slate-400 italic">
                No matching categories found
              </div>
            )}
          </div>

          {/* Bottom Option: Other / Custom Description */}
          <div className="border-t border-slate-100 pt-1.5 mt-1 px-1.5">
            <button
              type="button"
              role="option"
              onClick={() => handleSelectOption(OTHER_CUSTOM_DESCRIPTION_OPTION)}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{OTHER_CUSTOM_DESCRIPTION_OPTION}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">Custom text</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

