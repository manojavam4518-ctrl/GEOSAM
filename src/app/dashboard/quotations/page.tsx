'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  FileText,
  Search,
  Eye,
  Trash2,
  Share2,
  Download,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export default function QuotationsHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('ALL');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadQuotations() {
    try {
      const res = await fetch('/api/quotations');
      if (res.ok) {
        const json = await res.json();
        setQuotations(json.quotations || []);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotations();
  }, []);

  const handleCopyLink = (id: string) => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/share/quotations/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation record?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccess('Quotation deleted successfully.');
        await loadQuotations();
      } else {
        throw new Error('Failed to delete quotation.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  const handleDownloadPdf = async (quote: any) => {
    const origin = window.location.origin;
    window.open(`${origin}/share/quotations/${quote.id}`, '_blank');
  };

  const filtered = quotations.filter((q) => {
    const query = searchQuery.toLowerCase();
    const isIntlQuote = q.serviceType === 'International' || q.serviceType === 'INTERNATIONAL';

    const matchesSearch =
      q.quotationNumber.toLowerCase().includes(query) ||
      q.customerName.toLowerCase().includes(query) ||
      (q.customerCompany && q.customerCompany.toLowerCase().includes(query)) ||
      q.rateCardName.toLowerCase().includes(query) ||
      (isIntlQuote && (q.rateSnapshot?.destinationCountry || '').toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === 'ALL' || q.status === statusFilter;

    const matchesService =
      serviceTypeFilter === 'ALL' ||
      (serviceTypeFilter === 'INTERNATIONAL' && isIntlQuote) ||
      (serviceTypeFilter === 'DOMESTIC' && !isIntlQuote);

    return matchesSearch && matchesStatus && matchesService;
  });

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Loading quotations history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F4C3A]">Quotation History</h1>
          <p className="text-xs text-slate-500 mt-1 font-light">
            Manage your generated shipping rate quotations and share links.
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard/quotations/templates')}
          className="bg-white border border-slate-200 hover:border-[#1E8262] text-slate-700 hover:text-[#0F4C3A] py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          Manage Templates
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search quotes, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-[#1E8262] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl text-xs p-2 font-bold text-slate-700 focus:outline-none w-full sm:w-40"
          >
            <option value="ALL">All Services</option>
            <option value="DOMESTIC">Domestic</option>
            <option value="INTERNATIONAL">International</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl text-xs p-2 text-slate-600 focus:outline-none w-full sm:w-40"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No quotations found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-normal font-light">
            You have not created any quotations matching your criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold p-3.5">
                <th className="p-3.5">Quotation Number</th>
                <th className="p-3.5">Customer / Company</th>
                <th className="p-3.5">Route & Details</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5">Rate Card Used</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((quote) => {
                const isIntl = quote.serviceType === 'International' || quote.serviceType === 'INTERNATIONAL';
                const snap = quote.rateSnapshot || {};
                return (
                  <tr key={quote.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-[#0F4C3A]">
                      <div className="flex items-center gap-1.5">
                        <span>{quote.quotationNumber}</span>
                        {isIntl && (
                          <span className="bg-[#0F4C3A] text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                            INTERNATIONAL
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-400 font-light mt-0.5">
                        Created: {formatDateIndian(quote.createdAt)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="block font-bold text-slate-800">{quote.customerName}</span>
                      <span className="block text-[10px] text-slate-400 font-light">{quote.customerCompany || 'Individual'}</span>
                    </td>
                    <td className="p-3.5">
                      {isIntl ? (
                        <>
                          <span className="block text-slate-900 font-bold">
                            {snap.freightType || 'Air Freight'} — {snap.destinationCountry || quote.destinationPincode}
                          </span>
                          <span className="block text-[10px] text-emerald-700 font-semibold">
                            {quote.weight} KG (Rate: ₹{snap.perKgRate || quote.baseRate}/KG) {snap.tat ? `| TAT: ${snap.tat}` : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block text-slate-700 font-semibold">{quote.originPincode} → {quote.destinationPincode}</span>
                          <span className="block text-[10px] text-slate-400 font-light">{quote.weight} KG ({quote.pricingMode})</span>
                        </>
                      )}
                    </td>
                  <td className="p-3.5 text-right font-black text-slate-900">
                    ₹{quote.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-slate-600 font-semibold">{quote.rateCardName}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                      quote.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-150 text-slate-500 border-slate-200'
                    }`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDownloadPdf(quote)}
                      className="p-1.5 rounded-lg text-[#1E8262] hover:bg-emerald-50 hover:text-emerald-700 hover:scale-105 transition-all duration-150 cursor-pointer"
                      title="View & PDF"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCopyLink(quote.id)}
                      className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                        copiedId === quote.id ? 'text-emerald-600 bg-emerald-50 scale-105' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:scale-105'
                      }`}
                      title="Copy Public Sharing Link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(quote.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:scale-105 transition-all duration-150 cursor-pointer"
                      title="Delete Quote"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
