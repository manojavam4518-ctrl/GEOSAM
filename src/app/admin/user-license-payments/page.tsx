'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Loader2,
  AlertCircle,
  Eye,
  Building2,
  Calendar,
  DollarSign,
  UserCheck,
  Users,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminUserLicensePaymentsPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Modal States
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  async function loadPurchases() {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (paymentStatusFilter) q.set('paymentStatus', paymentStatusFilter);
      if (statusFilter) q.set('status', statusFilter);

      const res = await fetch(`/api/admin/user-licenses?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases || []);
        setSummary(data.summary || null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load user license purchases.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user license purchases.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPurchases();
  }, [paymentStatusFilter, statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadPurchases();
  }

  async function handleApprove(purchase: any) {
    if (
      !confirm(
        `Approve payment of ₹${purchase.totalAmount.toLocaleString('en-IN')} for ${purchase.usersCount} user license(s) (${purchase.organization?.name})?`
      )
    )
      return;

    setProcessing(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/admin/user-licenses/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: purchase.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve user license purchase.');
      }

      setMessage(data.message || 'User license purchase approved successfully!');
      setDetailModalOpen(false);
      await loadPurchases();
    } catch (err: any) {
      setError(err.message || 'Approval failed.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPurchase) return;

    setProcessing(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/admin/user-licenses/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: selectedPurchase.id,
          reason: rejectReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject purchase.');
      }

      setMessage(data.message || 'Purchase rejection recorded.');
      setRejectModalOpen(false);
      setDetailModalOpen(false);
      await loadPurchases();
    } catch (err: any) {
      setError(err.message || 'Rejection failed.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#0F4C3A]" />
            <h1 className="text-xl font-bold text-[#0F4C3A]">Additional User License Payments</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review, verify payment proof, and activate additional user capacity for customer organizations.
          </p>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Purchases</span>
              <UserCheck className="w-4 h-4 text-[#0F4C3A]" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 mt-2 block">
              {summary.totalPurchases}
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Pending Approval
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xl font-extrabold text-amber-700 mt-2 block">
              {summary.pending}
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Licensed User Slots
              </span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xl font-extrabold text-emerald-800 mt-2 block">
              {summary.totalSlotsPurchased} Slots
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C3A]">
                Approved Revenue
              </span>
              <DollarSign className="w-4 h-4 text-[#0F4C3A]" />
            </div>
            <span className="text-xl font-extrabold text-[#0F4C3A] mt-2 block">
              ₹{(summary.totalRevenue || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* Toolbar / Search Filter */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Organization name or UTR..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#1E8262]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-4 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Payment:</span>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1.5 text-slate-700 font-semibold focus:outline-none"
            >
              <option value="">All Payments</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs p-1.5 text-slate-700 font-semibold focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[220px]">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      ) : purchases.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl text-slate-400 font-medium text-xs shadow-2xs">
          No additional user license payments found matching criteria.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-[#F4F7F6] text-[#0F4C3A] font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Users & Duration</th>
                  <th className="px-4 py-3">Price & Total</th>
                  <th className="px-4 py-3">UTR / Ref ID</th>
                  <th className="px-4 py-3">Purchase Date</th>
                  <th className="px-4 py-3">Validity Window</th>
                  <th className="px-4 py-3 text-center">Payment Status</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <span className="block font-bold text-slate-900 text-xs">
                        {p.organization?.name || 'Organization'}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        ID: #{p.id.slice(-6)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-block font-extrabold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mb-0.5">
                        {p.usersCount} {p.usersCount === 1 ? 'User' : 'Users'}
                      </span>
                      <span className="block text-[10.5px] text-slate-600 font-semibold">
                        {p.durationSelected} Months ({p.actualDurationDays} Days)
                      </span>
                      {p.isProrated && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mt-0.5">
                          Prorated
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="block font-black text-[#0F4C3A] text-xs">
                        ₹{(p.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        ₹{(p.pricePerUser || 0).toLocaleString('en-IN')} / user
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                        {p.utr || 'N/A'}
                      </span>
                      <span className="block text-[9.5px] text-slate-400 font-semibold mt-0.5">
                        Method: {p.paymentMethod || 'UPI'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-500 font-medium">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-4 py-3 text-xs">
                      {p.startDate ? (
                        <>
                          <span className="block text-[10px] text-slate-500">
                            From: {new Date(p.startDate).toLocaleDateString('en-IN')}
                          </span>
                          <span className="block font-bold text-slate-800">
                            To: {new Date(p.expiryDate).toLocaleDateString('en-IN')}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Pending Approval</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[9.5px] font-extrabold tracking-wider ${
                          p.paymentStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : p.paymentStatus === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[9.5px] font-bold ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : p.status === 'EXPIRED'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedPurchase(p);
                          setDetailModalOpen(true);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>

                      {p.paymentStatus === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(p)}
                            disabled={processing}
                            className="py-1 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Approve
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPurchase(p);
                              setRejectReason('');
                              setRejectModalOpen(true);
                            }}
                            disabled={processing}
                            className="py-1 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail / Verification Modal */}
      {selectedPurchase && detailModalOpen && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`User License Purchase #${selectedPurchase.id.slice(-6)}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-[#F4F7F6] p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Organization:</span>
                <span className="font-bold text-slate-900">
                  {selectedPurchase.organization?.name}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Number of User Licenses:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedPurchase.usersCount} Users
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Selected Duration:</span>
                <span className="font-bold text-slate-800">
                  {selectedPurchase.durationSelected} Months ({selectedPurchase.actualDurationDays} Days)
                </span>
              </div>
              {selectedPurchase.isProrated && (
                <div className="flex justify-between border-b border-slate-200/80 pb-2 text-amber-800">
                  <span>Proration Applied:</span>
                  <span className="font-bold">
                    Capped at Parent Organization Subscription Expiry
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Price per User:</span>
                <span className="font-bold text-slate-800">
                  ₹{(selectedPurchase.pricePerUser || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Total Amount:</span>
                <span className="font-black text-[#0F4C3A] text-sm">
                  ₹{(selectedPurchase.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Payment Method:</span>
                <span className="font-semibold text-slate-800">
                  {selectedPurchase.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">UTR / Transaction Ref:</span>
                <span className="font-mono font-bold text-slate-900">{selectedPurchase.utr}</span>
              </div>
            </div>

            {selectedPurchase.paymentStatus === 'PENDING' && (
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setRejectReason('');
                    setRejectModalOpen(true);
                  }}
                  className="bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
                >
                  Reject Payment
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(selectedPurchase)}
                  disabled={processing}
                  className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-5 rounded-lg font-bold transition cursor-pointer"
                >
                  {processing ? 'Approving...' : 'Approve & Activate Licenses'}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedPurchase && rejectModalOpen && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject User License Payment"
          size="sm"
        >
          <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
            <p className="text-slate-600">
              Please enter the reason for rejecting the payment submission for{' '}
              <strong>{selectedPurchase.organization?.name}</strong>.
            </p>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Rejection Reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR number mismatch or payment proof invalid..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none text-xs"
                rows={3}
                required
              />
            </div>
            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-lg font-bold transition cursor-pointer"
              >
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
