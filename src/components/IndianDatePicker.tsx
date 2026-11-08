'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
} from 'lucide-react';

export interface IndianDatePickerProps {
  value: string; // "DD/MM/YYYY" or "DD.MM.YYYY"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  separator?: '/' | '.';
  align?: 'left' | 'right';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Indian calendar convention: Monday is day 0
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * Parses "DD.MM.YYYY", "DD/MM/YYYY" or ISO "YYYY-MM-DD" safely without timezone offsets
 */
function parseIndianDate(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // 1. Try DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const dotParts = trimmed.split(/[.\-/]/);
  if (dotParts.length === 3) {
    // If year is first (YYYY-MM-DD)
    if (dotParts[0].length === 4) {
      const year = parseInt(dotParts[0], 10);
      const month = parseInt(dotParts[1], 10);
      const day = parseInt(dotParts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return { day, month, year };
      }
    } else {
      // DD.MM.YYYY or DD/MM/YYYY
      const day = parseInt(dotParts[0], 10);
      const month = parseInt(dotParts[1], 10);
      const year = parseInt(dotParts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return { day, month, year };
      }
    }
  }

  return null;
}

function formatToIndianDate(day: number, month: number, year: number, separator: string = '/'): string {
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year);
  return `${dd}${separator}${mm}${separator}${yyyy}`;
}

export default function IndianDatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  className = '',
  disabled = false,
  separator = '/',
  align = 'left',
}: IndianDatePickerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view month/year from value or current date
  const parsed = parseIndianDate(value);
  const now = new Date();

  const [viewYear, setViewYear] = useState<number>(parsed ? parsed.year : now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed ? parsed.month : now.getMonth() + 1);

  // When value changes from outside, keep view synchronized
  useEffect(() => {
    if (value) {
      const p = parseIndianDate(value);
      if (p) {
        setViewYear(p.year);
        setViewMonth(p.month);
      }
    }
  }, [value]);

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

  // Calendar calculations (Monday = 0, Sunday = 6)
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7;
  const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handlePrevYear = () => setViewYear((y) => y - 1);
  const handleNextYear = () => setViewYear((y) => y + 1);

  const handleSelectDay = (day: number) => {
    const formatted = formatToIndianDate(day, viewMonth, viewYear, separator);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const formatted = formatToIndianDate(
      today.getDate(),
      today.getMonth() + 1,
      today.getFullYear(),
      separator
    );
    onChange(formatted);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setIsOpen(false);
  };

  const isToday = (day: number) => {
    return (
      day === now.getDate() &&
      viewMonth === now.getMonth() + 1 &&
      viewYear === now.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!parsed) return false;
    return parsed.day === day && parsed.month === viewMonth && parsed.year === viewYear;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Date Input with Clickable Calendar Trigger */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => !disabled && setIsOpen(true)}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          title="Open Indian Date Calendar"
          className="absolute right-2.5 p-1 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Indian Calendar Popover */}
      {isOpen && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 z-50 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-100 select-none`}>
          {/* Calendar Header with Navigation & Dropdowns */}
          <div className="flex items-center justify-between gap-1 mb-3">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevYear}
                title="Previous Year"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Month & Year Select Dropdowns for Fast Navigation */}
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-1 px-1.5 rounded-lg border border-slate-200 cursor-pointer focus:outline-none"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-100 hover:bg-slate-200 text-emerald-800 font-mono text-xs font-bold py-1 px-1.5 rounded-lg border border-slate-200 cursor-pointer focus:outline-none"
              >
                {Array.from({ length: 41 }, (_, i) => now.getFullYear() - 25 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                title="Next Year"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Row (Indian Convention: Monday First) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((day, idx) => (
              <div
                key={day}
                className={`text-[10px] font-black uppercase tracking-wider py-1 ${
                  idx >= 5 ? 'text-amber-700' : 'text-slate-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Days from previous month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="p-1 text-[11px] font-mono text-slate-300 pointer-events-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const selected = isSelected(dayNum);
              const today = isToday(dayNum);

              return (
                <button
                  key={`cur-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`w-7 h-7 mx-auto flex items-center justify-center rounded-lg font-mono text-xs transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#0F4C3A] text-white font-black shadow-sm'
                      : today
                        ? 'border border-emerald-500 font-extrabold text-[#0F4C3A] hover:bg-emerald-50'
                        : 'text-slate-700 font-semibold hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer with Today shortcut & Format indicator */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Format: DD/MM/YYYY
            </span>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              Select Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
