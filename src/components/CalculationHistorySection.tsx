'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
        const records = histData.history || [];
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

  return (
    <section
      id="calculation-history"
      className={`border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${
        isDark ? 'bg-[#14231E] border-[#1E374B]' : 'bg-white border-[#CFE1F6]'
      }`}
    >
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

        {/* Right: Subtle Clickable Breakdown Indicator */}
        <div className="flex items-center gap-2 shrink-0">
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
          {/* Breakdown Controls Toolbar: Search, Unit Filter, Refresh */}
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
                  Use the Weight Calculator above to evaluate cargo dimensions and compute weights. Your calculation results will be saved here automatically.
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

                {/* Table footer count */}
                <div
                  className={`px-4 py-2 border-t text-[10px] flex justify-between items-center ${
                    isDark ? 'bg-[#142620] border-[#264E41] text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-500'
                  }`}
                >
                  <span>Showing {filteredHistory.length} of {history.length} calculations</span>
                  <span>Click any row to view breakdown and export</span>
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
