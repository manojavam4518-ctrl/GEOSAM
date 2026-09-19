'use client';

import React, { useEffect, useState } from 'react';
import { exportInvoiceToPDF } from '@/utils/exportUtils';
import { formatDateIndian } from '@/utils/dateUtils';
import { FileText, FileDown, Loader2 } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const res = await fetch('/api/invoices');
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.invoices || []);
        }
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">Invoice Documents</h1>
        <p className="text-xs text-slate-500 mt-1">Access tax invoices generated for your active or past subscriptions</p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs flex flex-col justify-center items-center gap-2">
          <FileText className="w-8 h-8 text-slate-300 animate-pulse" />
          <span>No invoices available.</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Invoice Number</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Subscription Plan</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900 font-mono">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDateIndian(inv.date || inv.createdAt)}
                    </td>
                    <td className="px-6 py-4">{inv.planName}</td>
                    <td className="px-6 py-4 font-semibold">{inv.duration} Months</td>
                    <td className="px-6 py-4 font-bold text-[#0F4C3A]">₹{inv.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => exportInvoiceToPDF(inv)}
                        className="bg-white border border-slate-200 hover:bg-[#E8F5E9]/80 hover:border-[#1E8262] text-slate-700 hover:text-[#0F4C3A] py-1.5 px-3 rounded-lg transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 inline-flex items-center gap-1.5 font-bold text-[10px] shadow-xs cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
