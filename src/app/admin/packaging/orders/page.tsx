'use client';

import React, { useEffect, useState } from 'react';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  ShoppingCart,
  Check,
  X,
  Truck,
  Loader2,
  Calendar,
  Image as ImageIcon,
  DollarSign,
  User,
  CheckCircle2,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Selected screenshot view state
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Reject modal state
  const [rejectingPayment, setRejectingPayment] = useState<{ orderId: string; paymentId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/packaging/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        throw new Error('Failed to load orders.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading orders.');
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      order.orderNumber?.toLowerCase().includes(q) ||
      order.billingDetails?.fullName?.toLowerCase().includes(q) ||
      order.billingDetails?.phone?.includes(q) ||
      order.billingDetails?.companyName?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const handleApprovePayment = async (orderId: string, paymentId: string) => {
    if (!confirm('Are you sure you want to APPROVE this payment transaction? This will mark the order as PAID / PROCESSING.')) {
      return;
    }

    setActionLoading(paymentId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/packaging/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentId,
          action: 'approve_payment',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve payment.');

      setMessage(data.message || 'Payment transaction approved.');
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPayment || !rejectReason.trim()) return;

    const { orderId, paymentId } = rejectingPayment;
    setActionLoading(paymentId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/packaging/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentId,
          action: 'reject_payment',
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject payment.');

      setMessage('Payment transaction rejected.');
      setRejectingPayment(null);
      setRejectReason('');
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/packaging/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          action: 'update_status',
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update order status.');

      setMessage(`Order status updated to ${newStatus}.`);
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">Packaging Order Management</h1>
        <p className="text-xs text-slate-500 mt-1">Review UTR payment reference codes, approve transactions, and update shipping schedules</p>
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

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-grow max-w-md">
          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Phone, or Company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Filter Status:</span>
          {['ALL', 'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                statusFilter === st
                  ? 'bg-[#0F4C3A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
          No packaging orders found matching current criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const pendingPayment = order.payments && order.payments.find((p: any) => p.status === 'PENDING');
            const paidPayment = order.payments && order.payments.find((p: any) => p.status === 'PAID');
            const latestPayment = pendingPayment || paidPayment || (order.payments && order.payments[0]);
            
            return (
              <div key={order.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header info */}
                <div className="bg-[#F4F7F6] border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Order No</span>
                      <strong className="text-slate-800 font-black">#{order.orderNumber}</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Date</span>
                      <span className="text-slate-700 font-semibold">{formatDateIndian(order.createdAt)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                      <strong className="text-[#0F4C3A] font-extrabold">₹{order.totalAmount.toFixed(2)}</strong>
                    </div>
                    {order.requirementId && (
                      <span className="bg-purple-100 text-purple-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Custom B2B Order
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Status:</span>
                    <select
                      value={order.status}
                      disabled={actionLoading === order.id}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700"
                    >
                      <option value="PENDING_PAYMENT">Pending Payment</option>
                      <option value="PAID">Paid / Confirmed</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="PACKED">Packed</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Items & Shipping & Payments details */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
                  {/* Items column */}
                  <div className="space-y-2.5">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">Items Summary</h4>
                    {order.items && order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-start leading-tight">
                        <div>
                          <strong className="text-slate-800">{item.productName}</strong>
                          {item.variantInfo && <span className="block text-[9px] text-slate-400">{item.variantInfo}</span>}
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Qty: {item.quantity} × ₹{item.price}</span>
                        </div>
                        <span className="font-extrabold text-slate-700">₹{item.totalAmount}</span>
                      </div>
                    ))}
                  </div>

                  {/* Shipping Details column */}
                  <div className="space-y-2 border-l border-slate-100 pl-6">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">Delivery Destination</h4>
                    <p className="leading-normal">
                      <strong className="text-slate-800 block font-bold">{order.billingDetails?.fullName}</strong>
                      <span className="text-slate-500 font-medium block mt-0.5">{order.billingDetails?.companyName}</span>
                      <span className="block text-[11px] mt-1">{order.billingDetails?.address}, {order.billingDetails?.city}, {order.billingDetails?.state} - {order.billingDetails?.pincode}</span>
                      <span className="block text-[11px] text-slate-500 font-medium mt-1">Phone: {order.billingDetails?.phone}</span>
                    </p>
                  </div>

                  {/* Payments Column */}
                  <div className="space-y-3 border-l border-slate-100 pl-6 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">Payment Reference</h4>
                      {latestPayment ? (
                        <div className="space-y-1 mt-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">UTR Reference:</span>
                            <strong className="text-slate-800 font-mono select-all font-bold">{latestPayment.utr}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Method:</span>
                            <span className="text-slate-700 font-semibold uppercase">{latestPayment.paymentMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Verification:</span>
                            <span className={`font-bold uppercase text-[10px] ${
                              latestPayment.status === 'PAID' ? 'text-emerald-600' : latestPayment.status === 'FAILED' ? 'text-red-500' : 'text-amber-600 font-extrabold animate-pulse'
                            }`}>{latestPayment.status}</span>
                          </div>
                          
                          {latestPayment.screenshotUrl && (
                            <button
                              type="button"
                              onClick={() => setSelectedScreenshot(latestPayment.screenshotUrl)}
                              className="mt-2 text-xs font-bold text-[#0F4C3A] hover:underline flex items-center gap-1"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> View Payment Attachment
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic mt-1 block">Awaiting customer payment submission...</span>
                      )}
                    </div>

                    {pendingPayment && (
                      <div className="flex gap-2 w-full pt-3">
                        <button
                          onClick={() => setRejectingPayment({ orderId: order.id, paymentId: pendingPayment.id })}
                          disabled={actionLoading === pendingPayment.id}
                          className="flex-1 border border-red-200 text-red-650 hover:bg-red-50 py-1 rounded-lg font-bold transition flex items-center justify-center gap-0.5 text-[11px]"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => handleApprovePayment(order.id, pendingPayment.id)}
                          disabled={actionLoading === pendingPayment.id}
                          className="flex-1 bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1 rounded-lg font-bold transition flex items-center justify-center gap-0.5 text-[11px] shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Reject Payment Reason modal */}
      {rejectingPayment && (
        <Modal isOpen={!!rejectingPayment} onClose={() => setRejectingPayment(null)} title="Reject Payment Submission">
          <form onSubmit={handleRejectPaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="UTR mismatch, attachment blurred, amount discrepancy, etc. This note will be visible to the customer."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-sans"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
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
