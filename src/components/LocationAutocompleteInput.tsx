'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check, Plane, Ship, Building2, Globe } from 'lucide-react';
import { searchCargoLocations, CargoLocationItem } from '@/lib/proformaLocationData';

export interface LocationAutocompleteInputProps {
  value: string;
  onChange: (locationName: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  disabled?: boolean;
}

export default function LocationAutocompleteInput({
  value,
  onChange,
  placeholder = 'Search port, city, hub, or country...',
  className = '',
  inputClassName = '',
  id,
  disabled = false,
}: LocationAutocompleteInputProps) {
  const [query, setQuery] = useState<string>(value || '');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const suggestions = searchCargoLocations(query, 8);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (loc: CargoLocationItem) => {
    setQuery(loc.name);
    onChange(loc.name);
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AIRPORT':
        return <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
      case 'PORT':
        return <Ship className="w-3.5 h-3.5 text-cyan-600 shrink-0" />;
      case 'CFS':
        return <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case 'COUNTRY':
        return <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
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
          className={`w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${inputClassName}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span>Suggested Cargo Gateways &amp; Locations</span>
            <span className="font-mono text-emerald-700">{suggestions.length} Found</span>
          </div>
          {suggestions.map((loc, idx) => {
            const isSelected = selectedIndex === idx;
            const isExactMatch = loc.name.toLowerCase() === (value || '').toLowerCase();
            return (
              <div
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(loc);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                  isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1 rounded-md bg-slate-100">
                    {getCategoryIcon(loc.category)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-900 truncate">{loc.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{loc.subtext}</p>
                  </div>
                </div>
                {isExactMatch && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

