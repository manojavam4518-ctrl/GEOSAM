'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { ALL_COUNTRIES, CountryItem } from '@/lib/proformaLocationData';

export interface CountryCallingCodeSelectProps {
  value: string; // e.g. "+91"
  onChange: (dialCode: string, country?: CountryItem) => void;
  className?: string;
  disabled?: boolean;
}

export default function CountryCallingCodeSelect({
  value = '+91',
  onChange,
  className = '',
  disabled = false,
}: CountryCallingCodeSelectProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Identify matching country object
  const currentCountry =
    ALL_COUNTRIES.find((c) => c.dialCode === value) ||
    ALL_COUNTRIES.find((c) => c.code === 'IN') || {
      code: 'IN',
      name: 'India',
      flag: '🇮🇳',
      dialCode: '+91',
    };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter countries by search query
  const filteredCountries = ALL_COUNTRIES.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q)
    );
  });

  const handleSelect = (c: CountryItem) => {
    onChange(c.dialCode, c);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-10 px-2.5 py-2 flex items-center justify-between gap-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-white text-xs font-bold text-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title={`Selected calling code: ${currentCountry.dialCode} (${currentCountry.name})`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-base leading-none">{currentCountry.flag}</span>
          <span className="font-mono">{value || '+91'}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 sm:w-72 max-h-72 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="overflow-y-auto flex-grow divide-y divide-slate-100">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching country found.
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isMatch = c.dialCode === value;
                return (
                  <button
                    key={`${c.code}-${c.dialCode}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(c);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-xs text-left transition-colors cursor-pointer ${
                      isMatch
                        ? 'bg-emerald-50 text-emerald-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono text-xs text-slate-500 font-semibold">
                        {c.dialCode}
                      </span>
                      {isMatch && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
