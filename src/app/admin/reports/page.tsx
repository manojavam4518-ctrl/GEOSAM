'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  BarChart3,
  FileText,
  Truck,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  Download,
  Loader2,
  CheckCircle2,
  UserCheck,
  Package,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logistics' | 'shopping' | 'subscriptions'>('logistics');

  async function loadReports() {
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  const logistics = reports?.logistics || {};
  const shopping = reports?.shopping || {};
  const subscriptions = reports?.subscriptions || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Platform Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time performance analytics for Logistics Operations, Packaging Commerce, and SaaS Subscriptions</p>
        </div>

        <button
          onClick={() => alert('Exporting platform report...')}
          className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-4 h-4" /> Export Report CSV
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('logistics')}
          className={`py-3 px-6 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'logistics'
              ? 'border-[#0F4C3A] text-[#0F4C3A] bg-[#E8F5E9]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" /> Logistics Operations Report
        </button>

        <button
          onClick={() => setActiveTab('shopping')}
          className={`py-3 px-6 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'shopping'
              ? 'border-[#0F4C3A] text-[#0F4C3A] bg-[#E8F5E9]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Shopping Commerce Report
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`py-3 px-6 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'subscriptions'
              ? 'border-[#0F4C3A] text-[#0F4C3A] bg-[#E8F5E9]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" /> SaaS Subscriptions Report
        </button>
      </div>

      {/* TAB 1: LOGISTICS REPORT */}
      {activeTab === 'logistics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Quotations</span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">{logistics.totalQuotations || 0}</strong>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Domestic Quotations</span>
              <strong className="text-2xl font-black text-blue-600 mt-1 block">{logistics.domesticQuotations || 0}</strong>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">International Quotations</span>
              <strong className="text-2xl font-black text-indigo-600 mt-1 block">{logistics.internationalQuotations || 0}</strong>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Converted Sales Leads</span>
              <strong className="text-2xl font-black text-emerald-600 mt-1 block">{logistics.signedSalesLeads || 0} / {logistics.totalSalesLeads || 0}</strong>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0F4C3A]" />
              Recent Generated Quotations Ledger
            </h3>
            {logistics.recentQuotations?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No recent quotations found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Quotation No</th>
                      <th className="px-4 py-2.5">Customer Name</th>
                      <th className="px-4 py-2.5">Service Type</th>
                      <th className="px-4 py-2.5">Rate Card</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {logistics.recentQuotations?.map((q: any) => (
                      <tr key={q.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold font-mono text-slate-900">#{q.quotationNumber}</td>
                        <td className="px-4 py-2.5 text-slate-800">{q.customerName}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-600">{q.serviceType}</td>
                        <td className="px-4 py-2.5 text-slate-600">{q.rateCardName}</td>
                        <td className="px-4 py-2.5 font-black text-slate-900">₹{q.totalAmount?.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-[11px]">{formatDateIndian(q.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SHOPPING REPORT */}
      {activeTab === 'shopping' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Packaging Orders</span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">{shopping.totalOrders || 0}</strong>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivered Orders</span>
              <strong className="text-2xl font-black text-emerald-600 mt-1 block">{shopping.deliveredOrders || 0}</strong>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cancelled Orders</span>
              <strong className="text-2xl font-black text-rose-600 mt-1 block">{shopping.cancelledOrders || 0}</strong>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Packaging Sales Revenue</span>
              <strong className="text-2xl font-black text-[#0F4C3A] mt-1 block">₹{shopping.totalShoppingRevenue?.toLocaleString() || '0.00'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTIONS REPORT */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Accounts</span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">{subscriptions.totalUsers || 0}</strong>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active SaaS Subscribers</span>
              <strong className="text-2xl font-black text-emerald-600 mt-1 block">{subscriptions.activeSubscribers || 0}</strong>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs lg:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total SaaS Subscription Revenue</span>
              <strong className="text-2xl font-black text-[#0F4C3A] mt-1 block">₹{subscriptions.totalSaaSRevenue?.toLocaleString() || '0.00'}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
