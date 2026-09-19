'use client';

import React, { useEffect, useState } from 'react';
import { takeScreenshot } from '@/utils/exportUtils';
import { formatDateIndian, formatDateTimeIndian } from '@/utils/dateUtils';
import ExportQuoteModal from '@/components/ExportQuoteModal';
import { History, FileDown, Camera, Loader2, ArrowRight } from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCalc, setSelectedCalc] = useState<any>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, histRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/calculator/history')
        ]);
        
        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user);
        }
        if (histRes.ok) {
          const data = await histRes.json();
          setHistory(data.history || []);
          if (data.history?.length > 0) {
            setSelectedCalc(data.history[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-2xl font-bold text-[#0F4C3A] tracking-tight">Calculation History</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">Access and download your last 20 volumetric calculations</p>
      </div>

      {history.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs flex flex-col justify-center items-center gap-2">
          <History className="w-8 h-8 text-slate-300 animate-pulse" />
          <span>No calculations logged in history yet.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* List panel (2 Columns) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Pkgs</th>
                    <th className="px-4 py-3">Divisor</th>
                    <th className="px-4 py-3">Act Wt</th>
                    <th className="px-4 py-3">Vol Wt</th>
                    <th className="px-4 py-3 text-right">Chargeable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((calc) => {
                    const isSelected = selectedCalc?.id === calc.id;
                    return (
                      <tr
                        key={calc.id}
                        onClick={() => setSelectedCalc(calc)}
                        className={`hover:bg-slate-50 cursor-pointer transition ${
                          isSelected ? 'bg-emerald-50/50 font-semibold' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateIndian(calc.createdAt)}
                        </td>
                        <td className="px-4 py-3">{calc.unit}</td>
                        <td className="px-4 py-3">{calc.packageCount}</td>
                        <td className="px-4 py-3">{calc.divisor}</td>
                        <td className="px-4 py-3">{calc.actualWeight} kg</td>
                        <td className="px-4 py-3">{calc.volumetricWeight} kg</td>
                        <td className="px-4 py-3 text-right text-[#0F4C3A] font-bold">
                          {calc.chargeableWeight} kg
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details & Download panel (1 Column) */}
          <div className="space-y-4">
            {selectedCalc && (
              <div id="history-detail-card" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-[#0F4C3A] text-white p-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider">Calculation Details</h3>
                  <span className="block text-[8px] text-emerald-100 font-mono mt-0.5">{selectedCalc.id}</span>
                </div>
                
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-bold text-[9px] uppercase">Created At</span>
                      <span className="text-slate-700 font-semibold">{formatDateTimeIndian(selectedCalc.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold text-[9px] uppercase">Unit / Divisor</span>
                      <span className="text-slate-700 font-semibold">{selectedCalc.unit} / {selectedCalc.divisor}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-b border-slate-100 py-3 text-center">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Actual</span>
                      <span className="text-sm font-bold text-slate-800">{selectedCalc.actualWeight} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Volumetric</span>
                      <span className="text-sm font-bold text-slate-800">{selectedCalc.volumetricWeight} kg</span>
                    </div>
                    <div>
                      <span className="text-[#0F4C3A] block text-[9px] font-bold uppercase">Chargeable</span>
                      <span className="text-sm font-extrabold text-[#0F4C3A]">{selectedCalc.chargeableWeight} kg</span>
                    </div>
                  </div>

                  {/* Packages breakdown list */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Packages Breakdown</span>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {Array.isArray(selectedCalc.packages) && selectedCalc.packages.map((pkg: any, idx: number) => (
                        <div key={idx} className="p-2 border border-slate-100 rounded-lg bg-slate-50 text-[10px] flex justify-between items-center">
                          <div>
                            <span className="font-bold text-[#0F4C3A]">Pkg {idx + 1}: </span>
                            <span className="text-slate-600 font-medium">
                              {pkg.length} x {pkg.width} x {pkg.height} {selectedCalc.unit}
                            </span>
                            <span className="block text-slate-400 text-[9px] mt-0.5">
                              Act: {pkg.actualWeight} kg | Vol: {pkg.volumetricWeightPerUnit} kg
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block font-bold text-slate-700">Qty: {pkg.quantity}</span>
                            <span className="block font-bold text-[#0F4C3A] mt-0.5">Total: {pkg.totalChargeableWeight} kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setExportModalOpen(true)}
                      className="flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-[#E8F5E9]/50 hover:border-emerald-300 text-slate-700 hover:text-[#0F4C3A] py-2 rounded-lg text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-xs"
                    >
                      <FileDown className="w-4 h-4 text-emerald-600" />
                      PDF Export
                    </button>
                    <button
                      onClick={() => takeScreenshot('history-detail-card', 'geotransit-calculation-history')}
                      className="flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 text-slate-700 hover:text-slate-900 py-2 rounded-lg text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-xs"
                    >
                      <Camera className="w-4 h-4 text-slate-600" />
                      Screenshot
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {exportModalOpen && (
        <ExportQuoteModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          calculation={selectedCalc}
          userName={user?.name || 'User'}
        />
      )}
    </div>
  );
}
