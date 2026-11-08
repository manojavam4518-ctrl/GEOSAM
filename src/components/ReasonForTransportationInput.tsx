'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Plus, Loader2 } from 'lucide-react';

export const REASON_FOR_TRANSPORTATION_OPTIONS = [
  'Personal Use',
  'Samples',
  'Exhibition Purpose',
  'Testing Purpose',
  'Damaged Goods Return',
  'Household Items',
  'Shifting',
  'Replacement',
] as const;

export const DROPDOWN_AUTO_CLOSE_DELAY_MS = 1100;

export interface ReasonForTransportationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
}

/**
 * ReasonForTransportationInput
 *
 * Dedicated hybrid input component for Goods Declaration Note (Template 1):
 * 1. Displays the "REASON FOR TRANSPORTATION *" header and the "[ Select from the list ▼ ]"
 *    dropdown trigger immediately to the right of the header on the same horizontal line.
 * 2. Clicking "Select from the list" displays the 8 predefined reasons in exact order.
 * 3. Includes persistent "+ Add / Enter Custom Reason" with database storage & duplicate prevention.
 * 4. When cursor leaves the dropdown selection area, automatically closes after 1.1s (1100ms).
 * 5. If cursor returns within 1.1s, cancels closing and remains open.
 * 6. Selecting any option closes the dropdown immediately and populates the field.
 * 7. The entry field below remains fully editable for unrestricted manual text entry.
 */
export default function ReasonForTransportationInput({
  value,
  onChange,
  placeholder = 'Enter reason manually here',
  disabled = false,
  className = '',
  showLabel = true,
}: ReasonForTransportationInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customReasons, setCustomReasons] = useState<string[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newCustomReason, setNewCustomReason] = useState('');
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customError, setCustomError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to safely clear pending close timeout
  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Fetch saved custom reasons from database on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCustomReasons() {
      try {
        const res = await fetch('/api/organization/declarations/custom-reasons');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.customReasons)) {
            setCustomReasons(data.customReasons);
          }
        }
      } catch (err) {
        console.error('Failed to load custom transportation reasons:', err);
      }
    }
    loadCustomReasons();
    return () => {
      isMounted = false;
    };
  }, []);

  // Focus custom input when adding
  useEffect(() => {
    if (isAddingCustom) {
      clearCloseTimer();
      setTimeout(() => {
        customInputRef.current?.focus();
      }, 50);
    }
  }, [isAddingCustom, clearCloseTimer]);

  // When cursor enters the dropdown trigger button or list area, cancel any pending closure
  const handleMouseEnterDropdownArea = useCallback(() => {
    clearCloseTimer();
  }, [clearCloseTimer]);

  // When cursor leaves the dropdown area, start 1.1-second (1100ms) timer before closing
  // (Disabled while actively adding custom reason to avoid interrupting typing)
  const handleMouseLeaveDropdownArea = useCallback(() => {
    if (!isOpen) return;
    if (isAddingCustom) return; // Keep open while typing custom reason
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, DROPDOWN_AUTO_CLOSE_DELAY_MS);
  }, [isOpen, isAddingCustom, clearCloseTimer]);

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
      setIsAddingCustom(false);
      setNewCustomReason('');
      setCustomError('');
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
        inputRef.current?.focus();
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

  const handleSelectOption = (option: string) => {
    clearCloseTimer();
    onChange(option);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSaveCustomReason = async () => {
    const trimmed = newCustomReason.trim();
    if (!trimmed) {
      setCustomError('Please enter a valid reason.');
      return;
    }

    const normalized = trimmed.toLowerCase();

    // Check if it already matches a predefined option
    const predefinedMatch = REASON_FOR_TRANSPORTATION_OPTIONS.find(
      (opt) => opt.toLowerCase() === normalized
    );
    if (predefinedMatch) {
      handleSelectOption(predefinedMatch);
      return;
    }

    // Check if already in custom reasons list
    const existingCustom = customReasons.find((r) => r.toLowerCase() === normalized);
    if (existingCustom) {
      handleSelectOption(existingCustom);
      return;
    }

    setIsSavingCustom(true);
    setCustomError('');

    try {
      const res = await fetch('/api/organization/declarations/custom-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save custom reason to database.');
      }

      const data = await res.json();
      if (Array.isArray(data.customReasons)) {
        setCustomReasons(data.customReasons);
      } else {
        setCustomReasons((prev) => [...prev, trimmed]);
      }

      // Immediately populate field and close dropdown
      handleSelectOption(data.reason || trimmed);
    } catch (err: any) {
      console.error('Error saving custom reason:', err);
      // Fallback: still populate field locally so user is not blocked
      setCustomReasons((prev) => [...prev, trimmed]);
      handleSelectOption(trimmed);
    } finally {
      setIsSavingCustom(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'ArrowDown' || (e.altKey && e.key === 'ArrowDown')) && !isOpen) {
      e.preventDefault();
      clearCloseTimer();
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* 1. Header row: REASON FOR TRANSPORTATION * + [ Select from the list ▼ ] */}
      {showLabel && (
        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          <label
            htmlFor="reason-for-transportation-input"
            className="text-[13.2px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer"
          >
            Reason for Transportation <span className="text-red-500">*</span>
          </label>

          {/* Dropdown Selector Area with 1.1s controlled cursor exit auto-close */}
          <div
            ref={dropdownAreaRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnterDropdownArea}
            onMouseLeave={handleMouseLeaveDropdownArea}
          >
            <button
              type="button"
              onClick={handleToggleDropdown}
              disabled={disabled}
              title="Select predefined reason for transportation from list"
              aria-label="Select from the list"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                isOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-300'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span>Select from the list</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-emerald-600' : ''
                }`}
              />
            </button>

            {/* Floating Dropdown Menu with hover bridge to prevent gaps */}
            {isOpen && (
              <div
                role="listbox"
                aria-label="Predefined reasons for transportation"
                onMouseEnter={handleMouseEnterDropdownArea}
                onMouseLeave={handleMouseLeaveDropdownArea}
                className="absolute left-0 top-full mt-1.5 w-68 bg-white rounded-xl border border-slate-200 shadow-2xl py-1.5 z-50 max-h-80 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100 before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2"
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Standard Reasons
                </div>

                {/* Predefined Reasons (8 options) */}
                {REASON_FOR_TRANSPORTATION_OPTIONS.map((opt) => {
                  const isSelected = value.trim().toLowerCase() === opt.toLowerCase();
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}

                {/* Saved Custom Reasons from Database */}
                {customReasons.length > 0 && (
                  <>
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 mt-1 mb-0.5">
                      Saved Custom Reasons
                    </div>
                    {customReasons.map((customOpt) => {
                      const isSelected = value.trim().toLowerCase() === customOpt.toLowerCase();
                      return (
                        <button
                          key={customOpt}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectOption(customOpt)}
                          className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-800 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate pr-2">{customOpt}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Bottom Option: + Add / Enter Custom Reason */}
                <div className="border-t border-slate-100 pt-1.5 mt-1 px-1.5">
                  {!isAddingCustom ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustom(true);
                        setCustomError('');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>+ Add / Enter Custom Reason</span>
                    </button>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-2 animate-in fade-in-50 duration-150">
                      <div className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wide">
                        Enter Custom Reason:
                      </div>
                      <input
                        ref={customInputRef}
                        type="text"
                        value={newCustomReason}
                        onChange={(e) => {
                          setNewCustomReason(e.target.value);
                          if (customError) setCustomError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveCustomReason();
                          } else if (e.key === 'Escape') {
                            setIsAddingCustom(false);
                            setNewCustomReason('');
                            setCustomError('');
                          }
                        }}
                        placeholder="e.g. Warranty Return, Trade Exhibition"
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-white text-slate-800"
                      />
                      {customError && (
                        <div className="text-[10px] text-red-600 font-medium">
                          {customError}
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustom(false);
                            setNewCustomReason('');
                            setCustomError('');
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/70 rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCustomReason}
                          disabled={isSavingCustom || !newCustomReason.trim()}
                          className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded transition-colors cursor-pointer shadow-2xs"
                        >
                          {isSavingCustom && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Manual text entry field */}
      <input
        id="reason-for-transportation-input"
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-normal text-slate-900 bg-white placeholder:text-slate-400 shadow-2xs transition-all min-h-[40px]"
      />
    </div>
  );
}
