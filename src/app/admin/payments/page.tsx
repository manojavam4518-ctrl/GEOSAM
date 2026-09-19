'use client';

import React, { useEffect, useState } from 'react';
import { Check, X, Loader2, Image, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('PENDING'); // default to pending payments
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  // Interaction States
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  
  // Rejection Dialog State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function loadPayments() {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        status,
        page: page.toString(),
        limit: '10',
      });
      const res = await fetch(`/api/admin/payments?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [page, status]);

  async function handleApprove(paymentId: string) {
    if (!confirm('Are you sure you want to APPROVE this payment? This will immediately activate the user subscription and generate a serial tax invoice.')) {
      return;
    }

    setActionLoading(paymentId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Approval failed.');
      }

      setMessage(data.message || 'Payment approved and subscription activated.');
      await loadPayments();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingId || !rejectReason) return;

    setActionLoading(rejectingId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/payments/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: rejectingId, reason: rejectReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Rejection failed.');
      }

      setMessage(data.message || 'Payment rejected.');
      setRejectingId(null);
      setRejectReason('');
      await loadPayments();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#0F4C3A]">SaaS Subscription Payments</h1>
          <span className="bg-purple-100 text-purple-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">
            Subscription Module
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Review UTR transfers and payment screenshots to approve/reject user SaaS subscription plan upgrades & renewals</p>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setStatus('PENDING'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
              status === 'PENDING' ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]' : 'border-slate-200 text-slate-600'
            }`}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => { setStatus('APPROVED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
              status === 'APPROVED' ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]' : 'border-slate-200 text-slate-600'
            }`}
          >
            Approved Payments
          </button>
          <button
            onClick={() => { setStatus('REJECTED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
              status === 'REJECTED' ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]' : 'border-slate-200 text-slate-600'
            }`}
          >
            Rejected Payments
          </button>
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
          No payment submissions logged under status &apos;{status}&apos;.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">User Details</th>
                    <th className="px-4 py-3">Plan Details</th>
                    <th className="px-4 py-3">Gross Pricing</th>
                    <th className="px-4 py-3">Payment Info</th>
                    <th className="px-4 py-3">UTR Reference</th>
                    <th className="px-4 py-3 text-center">Screenshot</th>
                    {status === 'PENDING' && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className="block font-bold text-slate-900">{p.user?.name}</span>
                        <span className="block text-[10px] text-slate-500">{p.user?.company || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-bold text-slate-800">{p.planName}</span>
                        <span className="block text-[10px] text-slate-400">Duration: {p.duration} Months</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-bold text-slate-900">₹{p.totalAmount.toFixed(2)}</span>
                        <span className="block text-[9px] text-slate-400">Base: ₹{p.baseAmount} | GST: ₹{p.gstAmount}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <span className="block">{p.paymentMethod}</span>
                        <span className="block text-[10px]">
                          Invoice: {p.invoiceRequired ? 'Requested' : 'Not required'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 select-all">{p.utr}</td>
                      <td className="px-4 py-3 text-center">
                        {p.screenshotUrl ? (
                          <button
                            onClick={() => setSelectedScreenshot(p.screenshotUrl)}
                            className="bg-[#E8F5E9] hover:bg-[#c9ebd0] border border-emerald-200 text-[#0F4C3A] p-1.5 rounded-lg transition inline-flex items-center gap-1 font-bold text-[9px] shadow-sm"
                          >
                            <Image className="w-3.5 h-3.5" />
                            View Image
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No screenshot</span>
                        )}
                      </td>
                      {status === 'PENDING' && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={actionLoading !== null}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-1.5 rounded-lg transition inline-flex items-center gap-1 font-bold text-[10px] shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectingId(p.id); setRejectReason(''); }}
                              disabled={actionLoading !== null}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-lg transition inline-flex items-center gap-1 font-bold text-[10px] shadow-sm"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-1.5 px-3 rounded-lg text-xs font-bold disabled:opacity-50 transition"
              >
                Previous
              </button>
              <span className="text-xs font-medium text-slate-500 self-center">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={page === pagination.pages}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-1.5 px-3 rounded-lg text-xs font-bold disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* SCREENSHOT PREVIEW MODAL */}
      <Modal
        isOpen={!!selectedScreenshot}
        onClose={() => setSelectedScreenshot(null)}
        title="UTR Payment Screenshot Receipt"
        size="lg"
      >
            <div className="overflow-y-auto flex-grow flex items-center justify-center p-2 bg-slate-50 rounded-xl border border-slate-100 min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedScreenshot || undefined}
                alt="Receipt screenshot"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
      </Modal>

      {/* REJECTION REASON DIALOG MODAL */}
      <Modal
        isOpen={!!rejectingId}
        onClose={() => setRejectingId(null)}
        title="Rejection Verification Reason"
        size="sm"
      >
            
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Specify details for payment rejection:
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="UTR number could not be validated. Screen receipt matches a duplicate transaction."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none min-h-[80px]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-1.5 px-3 rounded-lg text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="bg-rose-600 hover:bg-rose-700 text-white py-1.5 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
