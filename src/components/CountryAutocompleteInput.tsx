'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { searchCountries, CountryItem, ALL_COUNTRIES } from '@/lib/proformaLocationData';

export interface CountryAutocompleteInputProps {
  value: string;
  onChange: (countryName: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  disabled?: boolean;
}

export default function CountryAutocompleteInput({
  value,
  onChange,
  placeholder = 'Type country name e.g. India, United Kingdom',
  className = '',
  inputClassName = '',
  id,
  disabled = false,
}: CountryAutocompleteInputProps) {
  const [query, setQuery] = useState<string>(value || '');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const suggestions = searchCountries(query, 10);

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

  const handleSelect = (country: CountryItem) => {
    setQuery(country.name);
    onChange(country.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    onChange(newVal);
    setIsOpen(true);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-3 pr-8 py-2 rounded-xl border text-xs font-semibold transition-colors ${
            disabled
              ? 'bg-slate-100/90 text-slate-700 border-slate-300 cursor-not-allowed select-none'
              : 'bg-white text-slate-900 border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
          } ${inputClassName}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`absolute right-2.5 transition-colors ${
            disabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600 cursor-pointer'
          }`}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span>Matching Countries</span>
            <span className="font-mono text-emerald-700">{suggestions.length} Found</span>
          </div>
          {suggestions.map((country, idx) => {
            const isSelected = selectedIndex === idx;
            const isExactMatch = country.name.toLowerCase() === (value || '').toLowerCase();
            return (
              <div
                key={country.code}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  handleSelect(country);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                  isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{country.flag}</span>
                  <span className="font-medium">{country.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">({country.code})</span>
                </div>
                {isExactMatch && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

