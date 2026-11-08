'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { takeScreenshot } from '@/utils/exportUtils';
import { formatDateIndian, formatDateTimeIndian } from '@/utils/dateUtils';
import ExportQuoteModal from '@/components/ExportQuoteModal';
import {
  History,
  FileDown,
  Camera,
  Loader2,
  RotateCcw,
  Search,
  ChevronDown,
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';

interface CalculationHistorySectionProps {
  isDark?: boolean;
  currentUser?: any;
  refreshTrigger?: number | string | null;
  title?: string;
  subtitle?: string;
  defaultExpanded?: boolean;
}

export default function CalculationHistorySection({
  isDark = false,
  currentUser = null,
  refreshTrigger = null,
  title = 'Calculation History',
  subtitle = 'Access, inspect, and export your recent volumetric weight calculation records',
  defaultExpanded = false,
}: CalculationHistorySectionProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [user, setUser] = useState<any>(currentUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCalc, setSelectedCalc] = useState<any>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'CM' | 'MM' | 'INCH' | 'FEET'>('ALL');
  
  // One-click breakdown state (Closed by default as shown in reference)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Dropdown menu state (for Delete All and Delete by Period)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete All Modal state
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Delete by Period Modal state
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [periodStep, setPeriodStep] = useState<'SELECT' | 'CONFIRM'>('SELECT');
  const [periodMatchingCount, setPeriodMatchingCount] = useState<number | null>(null);
  const [isDeletingPeriod, setIsDeletingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState('');

  // Notification Banner state
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const promises: Promise<any>[] = [fetch('/api/calculator/history')];
      if (!user) {
        promises.push(fetch('/api/auth/me'));
      }

      const results = await Promise.all(promises);
      const histRes = results[0];
      const meRes = results[1];

      if (meRes && meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        const rawRecords = histData.history || [];
        
        // Auto-delete safeguard: strictly filter out any records older than 20 days based on their individual creation timestamp
        const twentyDaysAgoMs = Date.now() - 20 * 24 * 60 * 60 * 1000;
        const records = rawRecords.filter((r: any) => new Date(r.createdAt).getTime() >= twentyDaysAgoMs);
        setHistory(records);

        // Preserve current selection if still valid, or default to first
        setSelectedCalc((prev: any) => {
          if (!prev && records.length > 0) return records[0];
          if (prev) {
            const found = records.find((c: any) => c.id === prev.id);
            return found || records[0] || null;
          }
          return null;
        });
      }
    } catch (err) {
      console.error('Failed to load calculation history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Automatically open breakdown if URL has #calculation-history anchor
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#calculation-history') {
      setIsExpanded(true);
    }
  }, []);

  // Refetch when external trigger signals new calculation completed
  useEffect(() => {
    if (refreshTrigger !== null && refreshTrigger !== undefined) {
      fetchHistory(true);
    }
  }, [refreshTrigger, fetchHistory]);

  // Sync user prop if passed
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser]);

  // Filtered history records
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Unit filter
      if (unitFilter !== 'ALL') {
        if ((item.unit || '').toUpperCase() !== unitFilter) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (item.id || '').toLowerCase().includes(q);
        const unitMatch = (item.unit || '').toLowerCase().includes(q);
        const dateMatch = formatDateIndian(item.createdAt).toLowerCase().includes(q);
        const actMatch = String(item.actualWeight || '').includes(q);
        const volMatch = String(item.volumetricWeight || '').includes(q);
        const chgMatch = String(item.chargeableWeight || '').includes(q);
        const divisorMatch = String(item.divisor || '').includes(q);

        return idMatch || unitMatch || dateMatch || actMatch || volMatch || chgMatch || divisorMatch;
      }

      return true;
    });
  }, [history, searchQuery, unitFilter]);

  // Action: Handle Delete All History
  const handleDeleteAll = async () => {
    if (isDeletingAll) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/calculator/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ALL' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete calculation history.');
      }

      setHistory([]);
      setSelectedCalc(null);
      setIsDeleteAllModalOpen(false);
      setNotification({
        type: 'success',
        message: data.message || 'All calculation history records have been successfully deleted.',
      });
    } catch (err: any) {
      console.error('Delete All Error:', err);
      setNotification({
        type: 'error',
        message: err.message || 'An error occurred while deleting calculation history.',
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Action: Open Period Modal
  const openPeriodModal = () => {
    setPeriodStartDate('');
    setPeriodEndDate('');
    setPeriodStep('SELECT');
    setPeriodMatchingCount(null);
    setPeriodError('');
    setIsPeriodModalOpen(true);
  };

  // Action: Proceed from Date Selection to Confirmation
  const handleProceedPeriodConfirmation = () => {
    setPeriodError('');
    if (!periodStartDate || !periodEndDate) {
      setPeriodError('Please select both Start Date and End Date.');
      return;
    }

    const start = new Date(`${periodStartDate}T00:00:00`);
    const end = new Date(`${periodEndDate}T23:59:59.999`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setPeriodError('Invalid dates selected.');
      return;
    }

    if (start.getTime() > end.getTime()) {
      setPeriodError('Start Date cannot be after End Date.');
      return;
    }

    // Check if matching records exist within the selected period
    const matching = history.filter((item) => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= start && itemDate <= end;
    });

    if (matching.length === 0) {
      setPeriodError('No calculation history records found in the selected period.');
      return;
    }

    setPeriodMatchingCount(matching.length);
    setPeriodStep('CONFIRM');
  };

  // Action: Confirm and Execute Delete by Period
  const handleConfirmDeletePeriod = async () => {
    if (isDeletingPeriod) return;
    setIsDeletingPeriod(true);
    setPeriodError('');

    try {
      const start = new Date(`${periodStartDate}T00:00:00`);
      const end = new Date(`${periodEndDate}T23:59:59.999`);

      const res = await fetch('/api/calculator/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'PERIOD',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete records for the selected period.');
      }

      if (!data.success && data.matchingCount === 0) {
        setPeriodError(data.message || 'No calculation history records exist in the selected period.');
        setIsDeletingPeriod(false);
        return;
      }

      setIsPeriodModalOpen(false);
      await fetchHistory(true);
      setNotification({
        type: 'success',
        message: data.message || `Deleted calculation history records from ${formatDateIndian(periodStartDate)} to ${formatDateIndian(periodEndDate)}.`,
      });
    } catch (err: any) {
      console.error('Delete by Period Error:', err);
      setPeriodError(err.message || 'An error occurred while deleting records.');
    } finally {
      setIsDeletingPeriod(false);
    }
  };

  return (
    <section
      id="calculation-history"
      className={`border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${
        isDark ? 'bg-[#14231E] border-[#1E374B]' : 'bg-white border-[#CFE1F6]'
      }`}
    >
      {/* Notification Banner */}
      {notification && (
        <div
          className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 border-b animate-in fade-in duration-150 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
              : 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <History className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* One-Click Clickable Header Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls="calculation-history-breakdown"
        className={`w-full text-left px-5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between gap-4 cursor-pointer select-none transition-all duration-200 group ${
          isExpanded ? 'border-b' : ''
        } ${
          isDark
            ? 'bg-[#13222E] hover:bg-[#182C3B] border-[#1E374B]'
            : 'bg-[#EEF4FB] hover:bg-[#E4EFFB] border-[#D4E4F7]'
        }`}
      >
        {/* Left: Icon, Title, Records Badge, Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${
              isDark
                ? 'bg-[#182C3B] text-sky-400 border-[#25465F]'
                : 'bg-[#E1ECF9] text-[#1E56A0] border-[#BFD7F2]'
            }`}
          >
            <History className="w-5 h-5 text-[#1E56A0] dark:text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className={`font-black text-sm sm:text-base tracking-tight ${isDark ? 'text-sky-300' : 'text-[#0F4C3A]'}`}>
                {title}
              </h2>
              <span
                className={`text-[10px] sm:text-[10.5px] px-2.5 py-0.5 rounded-full font-bold border transition-colors ${
                  isDark
                    ? 'bg-sky-950/80 text-sky-300 border-sky-700/60'
                    : 'bg-[#E2EDFA] text-[#18529B] border-[#BBD5F3]'
                }`}
              >
                {history.length} {history.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 truncate font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions Dropdown Menu + Breakdown Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* History Management Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              title="Calculation History Options"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#182C3B] text-slate-300 border-[#25465F] hover:bg-[#1E374B] hover:text-white'
                  : 'bg-white text-slate-700 border-[#BCD4F0] hover:bg-[#F4F9FF] hover:border-[#96BEEB]'
              }`}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Delete History</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 mt-1.5 w-48 rounded-xl shadow-lg border p-1 z-30 animate-in fade-in zoom-in-95 duration-100 ${
                  isDark
                    ? 'bg-[#13222E] border-[#25465F] text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    openPeriodModal();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition text-left cursor-pointer ${
                    isDark ? 'hover:bg-[#182C3B] text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>Delete by Period</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDeleteAllModalOpen(true);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition text-left cursor-pointer text-rose-600 ${
                    isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-50'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Delete All</span>
                </button>
              </div>
            )}
          </div>

          {/* View / Hide Breakdown Button */}
          <span
            className={`text-xs font-bold hidden sm:inline-block transition-colors duration-150 ${
              isDark
                ? 'text-sky-400 group-hover:text-sky-200'
                : 'text-[#1E56A0] group-hover:text-[#133E78]'
            }`}
          >
            {isExpanded ? 'Hide Breakdown' : 'View Breakdown'}
          </span>
          <div
            className={`p-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center ${
              isDark
                ? 'bg-[#182C3B] text-sky-300 border-[#25465F] group-hover:border-sky-500 group-hover:bg-[#1E374B]'
                : 'bg-white text-[#1E56A0] border-[#BCD4F0] group-hover:border-[#96BEEB] group-hover:bg-[#F4F9FF]'
            }`}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 stroke-[2.5] ${
                isExpanded ? 'rotate-180 text-[#1E56A0] dark:text-sky-300' : 'text-[#1E56A0] dark:text-sky-300'
              }`}
            />
          </div>
        </div>
      </div>

      {/* One-Click Breakdown View Area */}
      {isExpanded && (
        <div id="calculation-history-breakdown" className="p-4 sm:p-6 transition-all duration-200 animate-in fade-in duration-150">
          {/* Breakdown Controls Toolbar: Search, Unit Filter, Refresh, Delete Shortcuts */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Filter Calculations
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {/* Search box */}
              <div className="relative min-w-[170px] sm:min-w-[210px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by date, ID, weight..."
                  className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none transition ${
                    isDark
                      ? 'bg-[#10231D] border-[#2E5448] text-slate-200 placeholder-slate-500 focus:border-emerald-400'
                      : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#107c5a]'
                  }`}
                />
              </div>

              {/* Unit filter */}
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none transition cursor-pointer ${
                  isDark
                    ? 'bg-[#10231D] border-[#2E5448] text-slate-200 focus:border-emerald-400'
                    : 'bg-white border-slate-200 text-slate-700 focus:border-[#107c5a]'
                }`}
              >
                <option value="ALL">All Units</option>
                <option value="CM">CM</option>
                <option value="MM">MM</option>
                <option value="INCH">INCH</option>
                <option value="FEET">FEET</option>
              </select>

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => fetchHistory(true)}
                disabled={loading || refreshing}
                title="Refresh history"
                className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                  isDark
                    ? 'bg-[#10231D] border-[#2E5448] text-slate-300 hover:text-emerald-300 hover:border-emerald-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-[#0F4C3A] hover:bg-slate-50'
                }`}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
              <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Loading calculation records...
              </span>
            </div>
          ) : history.length === 0 ? (
            <div
              className={`border rounded-2xl p-10 text-center flex flex-col justify-center items-center gap-3 ${
                isDark ? 'bg-[#10231D]/50 border-[#264E41]' : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-[#182B25] text-slate-400' : 'bg-white text-slate-400 border border-slate-200 shadow-2xs'
                }`}
              >
                <History className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  No calculations logged in history yet
                </h3>
                <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Use the Weight Calculator above to evaluate cargo dimensions and compute weights. Your calculation results will be saved here automatically (auto-deleted after 20 days).
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* List Table Panel (2 Columns) */}
              <div
                className={`lg:col-span-2 border rounded-xl overflow-hidden shadow-2xs ${
                  isDark ? 'bg-[#10231D] border-[#264E41]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead
                      className={`font-bold uppercase text-[9.5px] tracking-wider border-b ${
                        isDark
                          ? 'bg-[#182B25] text-emerald-300 border-[#264E41]'
                          : 'bg-[#F4F7F6] text-[#0F4C3A] border-slate-200'
                      }`}
                    >
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-3 py-3">Unit</th>
                        <th className="px-3 py-3 text-center">Pkgs</th>
                        <th className="px-3 py-3">Divisor</th>
                        <th className="px-3 py-3">Actual Wt</th>
                        <th className="px-3 py-3">Vol Wt</th>
                        <th className="px-4 py-3 text-right">Chargeable</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                            No calculations match your current search or unit filter.
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((calc) => {
                          const isSelected = selectedCalc?.id === calc.id;
                          return (
                            <tr
                              key={calc.id}
                              onClick={() => setSelectedCalc(calc)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? isDark
                                    ? 'bg-[#18362B] font-semibold text-emerald-200'
                                    : 'bg-emerald-50/80 font-semibold text-[#0F4C3A]'
                                  : isDark
                                  ? 'text-slate-300 hover:bg-[#142B23]'
                                  : 'text-slate-700 hover:bg-slate-50/90'
                              }`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`block font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  {formatDateIndian(calc.createdAt)}
                                </span>
                                <span className={`block text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {calc.id ? calc.id.substring(0, 10) : ''}...
                                </span>
                              </td>
                              <td className="px-3 py-3 font-semibold">{calc.unit}</td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isDark ? 'bg-[#182B25] text-slate-300' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {calc.packageCount}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-medium">{calc.divisor}</td>
                              <td className="px-3 py-3 font-medium">{calc.actualWeight} kg</td>
                              <td className="px-3 py-3 font-medium">{calc.volumetricWeight} kg</td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-black border shadow-2xs ${
                                    isDark
                                      ? 'bg-amber-950/80 text-amber-200 border-amber-700/60'
                                      : 'bg-[#FDE68A] text-[#78350F] border-[#F59E0B]/40'
                                  }`}
                                >
                                  {calc.chargeableWeight} kg
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table footer count & 20-day policy indicator */}
                <div
                  className={`px-4 py-2 border-t text-[10px] flex justify-between items-center flex-wrap gap-2 ${
                    isDark ? 'bg-[#142620] border-[#264E41] text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                  }`}
                >
                  <span>Showing {filteredHistory.length} of {history.length} calculations</span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Auto-deleted after 20 days</span>
                  </span>
                </div>
              </div>

              {/* Details & Actions Panel (1 Column) */}
              <div className="space-y-4">
                {selectedCalc ? (
                  <div
                    id="history-detail-card"
                    className={`border rounded-xl shadow-sm overflow-hidden ${
                      isDark ? 'bg-[#10231D] border-[#264E41]' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className={`p-4 ${isDark ? 'bg-[#0A261D] text-emerald-300' : 'bg-[#0F4C3A] text-white'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-xs uppercase tracking-wider">Calculation Details</h3>
                        <span className="text-[10px] opacity-80 font-medium">
                          {selectedCalc.packageCount} {selectedCalc.packageCount === 1 ? 'Package' : 'Packages'}
                        </span>
                      </div>
                      <span className="block text-[8.5px] font-mono mt-1 opacity-75 truncate">
                        ID: {selectedCalc.id}
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Timestamp & Divisor */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className={`block font-bold text-[9px] uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                            Created At
                          </span>
                          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {formatDateTimeIndian(selectedCalc.createdAt)}
                          </span>
                        </div>
                        <div>
                          <span className={`block font-bold text-[9px] uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                            Unit / Divisor
                          </span>
                          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {selectedCalc.unit} / {selectedCalc.divisor}
                          </span>
                        </div>
                      </div>

                      {/* Weight Metric Cards */}
                      <div
                        className={`grid grid-cols-3 gap-2 border-t border-b py-3 text-center ${
                          isDark ? 'border-slate-800 bg-[#0E1F1A] rounded-lg' : 'border-slate-100 bg-slate-50/70 rounded-lg'
                        }`}
                      >
                        <div className="p-1">
                          <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Actual
                          </span>
                          <span className={`text-xs sm:text-sm font-bold block mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {selectedCalc.actualWeight} kg
                          </span>
                        </div>
                        <div className="p-1">
                          <span className={`block text-[9px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Volumetric
                          </span>
                          <span className={`text-xs sm:text-sm font-bold block mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {selectedCalc.volumetricWeight} kg
                          </span>
                        </div>
                        <div className="p-1">
                          <span className={`block text-[9px] font-extrabold uppercase ${isDark ? 'text-emerald-400' : 'text-[#0F4C3A]'}`}>
                            Chargeable
                          </span>
                          <span className={`text-xs sm:text-sm font-black block mt-0.5 ${isDark ? 'text-amber-300' : 'text-[#0F4C3A]'}`}>
                            {selectedCalc.chargeableWeight} kg
                          </span>
                        </div>
                      </div>

                      {/* Packages Breakdown List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`block text-[9.5px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Package Breakdown
                          </span>
                          <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Unit: {selectedCalc.unit}
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                          {Array.isArray(selectedCalc.packages) && selectedCalc.packages.length > 0 ? (
                            selectedCalc.packages.map((pkg: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-2.5 border rounded-lg text-[10px] flex justify-between items-center transition ${
                                  isDark
                                    ? 'bg-[#142B23] border-[#264E41] text-slate-200'
                                    : 'bg-slate-50 border-slate-100 text-slate-700'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1">
                                    <span className={`font-bold ${isDark ? 'text-emerald-300' : 'text-[#0F4C3A]'}`}>
                                      Pkg {idx + 1}:
                                    </span>
                                    <span className="font-semibold truncate">
                                      {pkg.length} × {pkg.width} × {pkg.height} {selectedCalc.unit}
                                    </span>
                                  </div>
                                  <span className={`block text-[9px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                                    Act: {pkg.actualWeight} kg | Vol: {pkg.volumetricWeightPerUnit} kg
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block font-bold">Qty: {pkg.quantity}</span>
                                  <span className={`block font-black mt-0.5 ${isDark ? 'text-amber-300' : 'text-[#0F4C3A]'}`}>
                                    {pkg.totalChargeableWeight} kg
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className={`p-3 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Package details not recorded for this calculation.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Export Actions */}
                      <div className={`grid grid-cols-2 gap-2.5 border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <button
                          type="button"
                          onClick={() => setExportModalOpen(true)}
                          className={`flex items-center justify-center gap-1.5 border py-2.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                            isDark
                              ? 'bg-[#103A2D] hover:bg-[#164B3A] text-emerald-200 border-emerald-700/60'
                              : 'bg-[#E8F5E9]/60 hover:bg-[#E8F5E9] text-[#0F4C3A] border-emerald-300'
                          }`}
                        >
                          <FileDown className="w-4 h-4 text-emerald-600" />
                          PDF Export
                        </button>
                        <button
                          type="button"
                          onClick={() => takeScreenshot('history-detail-card', `geotransit-calc-${selectedCalc.id || 'history'}`)}
                          className={`flex items-center justify-center gap-1.5 border py-2.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                            isDark
                              ? 'bg-[#182B25] hover:bg-[#1F3730] text-slate-200 border-[#2E5448]'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Camera className="w-4 h-4 text-slate-500" />
                          Screenshot
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border rounded-xl p-8 text-center text-xs font-medium ${
                      isDark ? 'bg-[#10231D] border-[#264E41] text-slate-400' : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    Select a calculation row from the table to view details.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete All Confirmation Dialog */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`rounded-2xl shadow-xl border w-full max-w-sm p-6 space-y-4 animate-in fade-in duration-150 ${
              isDark ? 'bg-[#13222E] border-[#25465F]' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Delete Calculation History
                </h3>
                <p className={`text-xs mt-1.5 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Are you sure you want to delete all calculation history?
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  This will permanently delete all your calculation history records. No other application data will be affected.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete by Period Modal */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`rounded-2xl shadow-xl border w-full max-w-md p-6 space-y-4 animate-in fade-in duration-150 ${
              isDark ? 'bg-[#13222E] border-[#25465F]' : 'bg-white border-slate-200'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {periodStep === 'SELECT' ? 'Delete History by Period' : 'Confirm Period Deletion'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {periodStep === 'SELECT'
                      ? 'Select date range of calculation records to delete'
                      : 'Review and confirm the period before deleting'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {periodError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{periodError}</span>
              </div>
            )}

            {periodStep === 'SELECT' ? (
              /* Step 1: Date Range Selection */
              <div className="space-y-4 py-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={periodStartDate}
                      onChange={(e) => {
                        setPeriodStartDate(e.target.value);
                        setPeriodError('');
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition ${
                        isDark
                          ? 'bg-[#10231D] border-[#2E5448] text-slate-200 focus:border-sky-400'
                          : 'bg-white border-slate-200 text-slate-800 focus:border-sky-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={periodEndDate}
                      onChange={(e) => {
                        setPeriodEndDate(e.target.value);
                        setPeriodError('');
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition ${
                        isDark
                          ? 'bg-[#10231D] border-[#2E5448] text-slate-200 focus:border-sky-400'
                          : 'bg-white border-slate-200 text-slate-800 focus:border-sky-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <p>• Records created between the start and end dates (inclusive) will be deleted.</p>
                  <p>• Only Calculation History records will be deleted. All other data remains intact.</p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPeriodModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedPeriodConfirmation}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0F4C3A] hover:bg-[#1E8262] rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Confirmation Dialog with Selected Period Display */
              <div className="space-y-4 py-1">
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/40 dark:border-amber-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Confirm Record Deletion</span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                    Are you sure you want to delete calculation history for the selected period?
                  </p>
                  <div className="pt-2 border-t border-amber-200 dark:border-amber-900/60 grid grid-cols-2 gap-2 text-[11.5px]">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                        Start Date
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {formatDateIndian(periodStartDate)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                        End Date
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {formatDateIndian(periodEndDate)}
                      </span>
                    </div>
                  </div>
                  {periodMatchingCount !== null && (
                    <div className="pt-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      Records to be deleted: <span className="underline font-black">{periodMatchingCount}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isDeletingPeriod}
                    onClick={() => {
                      setPeriodStep('SELECT');
                      setPeriodError('');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Change Dates
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeletingPeriod}
                      onClick={() => setIsPeriodModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingPeriod}
                      onClick={handleConfirmDeletePeriod}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isDeletingPeriod ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Delete Records</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Quote Modal */}
      {exportModalOpen && selectedCalc && (
        <ExportQuoteModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          calculation={selectedCalc}
          userName={user?.name || 'User'}
        />
      )}
    </section>
  );
}
