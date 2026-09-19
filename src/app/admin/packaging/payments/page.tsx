'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  CreditCard,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  ShoppingBag,
  Search,
  RefreshCw,
  Eye,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminShoppingPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Selected screenshot view state
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Selected order details modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Rejection Dialog State
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function loadPayments() {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'ALL') q.append('status', statusFilter);
      if (searchTerm) q.append('search', searchTerm);

      const res = await fetch(`/api/admin/packaging/payments?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      } else {
        throw new Error('Failed to load shopping payments.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading payments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPayments();
  };

  async function handleApprove(paymentId: string, orderNumber: string) {
    if (!confirm(`Are you sure you want to APPROVE payment for Order #${orderNumber}? This will mark the order as PAID.`)) {
      return;
    }

    setActionLoading(paymentId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/packaging/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'approve' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed.');

      setMessage(data.message || 'Shopping payment approved.');
      await loadPayments();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingPaymentId || !rejectReason.trim()) return;

    setActionLoading(rejectingPaymentId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/packaging/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: rejectingPaymentId,
          action: 'reject',
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed.');

      setMessage(data.message || 'Payment rejected.');
      setRejectingPaymentId(null);
      setRejectReason('');
      await loadPayments();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  }

  // Summary Metrics
  const totalCount = payments.length;
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
  const paidCount = payments.filter((p) => p.status === 'PAID').length;
  const totalRevenue = payments
    .filter((p) => p.status === 'PAID')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F4C3A]">Packaging Shop Payments</h1>
            <span className="bg-emerald-100 text-[#0F4C3A] text-[9px] font-black uppercase px-2 py-0.5 rounded">
              Shopping Module
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Review UTR transaction references, payment proofs, and approve packaging order receipts</p>
        </div>

        <button
          onClick={() => { setRefreshing(true); loadPayments(); }}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Records
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Transactions</span>
          <strong className="text-xl font-black text-slate-900 mt-1 block">{totalCount}</strong>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approval</span>
          <strong className="text-xl font-black text-amber-600 mt-1 block">{pendingCount}</strong>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Approved / Paid</span>
          <strong className="text-xl font-black text-emerald-600 mt-1 block">{paidCount}</strong>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Shopping Sales Total</span>
          <strong className="text-xl font-black text-[#0F4C3A] mt-1 block">₹{totalRevenue.toFixed(2)}</strong>
        </div>
      </div>

      {/* Search & Status Filters Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by UTR reference code or Order #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Status Filter:</span>
          {['ALL', 'PENDING', 'PAID', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                statusFilter === st
                  ? 'bg-[#0F4C3A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No packaging shop payment records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order # & Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">UTR Reference</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {payments.map((p) => {
                  const isPending = p.status === 'PENDING';
                  const isPaid = p.status === 'PAID';
                  const isFailed = p.status === 'FAILED' || p.status === 'REJECTED';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(p.order)}
                          className="font-bold text-[#0F4C3A] hover:underline block text-left"
                        >
                          #{p.order?.orderNumber || 'N/A'}
                        </button>
                        <span className="text-[11px] text-slate-500 block">
                          {p.order?.billingDetails?.fullName || 'Customer'} • {p.order?.billingDetails?.phone || ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900">
                        ₹{p.amount?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 uppercase font-bold text-slate-600 text-[10px]">
                        {p.paymentMethod}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 select-all">
                        {p.utr}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {formatDateIndian(p.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' :
                          isPending ? 'bg-amber-100 text-amber-800 animate-pulse font-extrabold' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.screenshotUrl && (
                            <button
                              onClick={() => setSelectedScreenshot(p.screenshotUrl)}
                              className="p-1.5 text-slate-500 hover:text-[#0F4C3A] hover:bg-emerald-50 rounded-lg transition"
                              title="View Receipt Screenshot"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          )}

                          {isPending && (
                            <>
                              <button
                                onClick={() => setRejectingPaymentId(p.id)}
                                disabled={actionLoading === p.id}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-bold text-[10px] transition border border-red-200"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApprove(p.id, p.order?.orderNumber)}
                                disabled={actionLoading === p.id}
                                className="px-2.5 py-1 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-lg font-bold text-[10px] transition shadow-xs"
                              >
                                Approve
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedOrder(p.order)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                            title="View Packaging Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screenshot viewer modal */}
      {selectedScreenshot && (
        <Modal isOpen={!!selectedScreenshot} onClose={() => setSelectedScreenshot(null)} title="Transaction Screenshot Proof">
          <div className="text-center p-2">
            <img
              src={selectedScreenshot}
              alt="UTR receipt verification attachment"
              className="max-w-full max-h-[500px] border border-slate-200 rounded-xl mx-auto shadow-sm object-contain"
            />
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded-lg text-xs font-bold transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Packaging Order #${selectedOrder.orderNumber}`}>
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Information</span>
                <span className="bg-emerald-100 text-[#0F4C3A] font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                  Order Status: {selectedOrder.status}
                </span>
              </div>
              <strong className="text-sm font-bold text-slate-900 block">{selectedOrder.billingDetails?.fullName}</strong>
              <p className="text-slate-500 font-medium">Company: {selectedOrder.billingDetails?.companyName || 'N/A'}</p>
              <p className="text-slate-500">Phone: {selectedOrder.billingDetails?.phone} | Email: {selectedOrder.billingDetails?.email || 'N/A'}</p>
              <p className="text-slate-500">
                Address: {selectedOrder.billingDetails?.address}, {selectedOrder.billingDetails?.city}, {selectedOrder.billingDetails?.state} - {selectedOrder.billingDetails?.pincode}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Items Ordered</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {selectedOrder.items && selectedOrder.items.map((item: any) => (
                  <div key={item.id} className="p-3 flex justify-between items-center">
                    <div>
                      <strong className="text-slate-800 font-bold block">{item.productName}</strong>
                      {item.variantInfo && <span className="text-[10px] text-slate-400 block">{item.variantInfo}</span>}
                      <span className="text-[10px] text-slate-500">Qty: {item.quantity} × ₹{item.price}</span>
                    </div>
                    <span className="font-extrabold text-slate-900">₹{item.totalAmount}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center bg-[#E8F5E9] p-3 rounded-xl border border-emerald-200 text-[#0F4C3A]">
              <span className="font-extrabold uppercase text-xs">Total Order Value:</span>
              <strong className="text-base font-black">₹{selectedOrder.totalAmount?.toFixed(2)}</strong>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Link
                href="/admin/packaging/orders"
                className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-4 py-2 rounded-lg text-xs font-bold transition"
              >
                Go to Packaging Orders &rarr;
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Payment Reason modal */}
      {rejectingPaymentId && (
        <Modal isOpen={!!rejectingPaymentId} onClose={() => setRejectingPaymentId(null)} title="Reject Shopping Payment Submission">
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="UTR mismatch, attachment unreadable, amount discrepancy, etc. This note will be recorded in audit log."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-sans"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingPaymentId(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                Reject Proof Reference
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
