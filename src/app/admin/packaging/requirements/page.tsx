'use client';

import React, { useEffect, useState } from 'react';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  ClipboardList,
  Calendar,
  MapPin,
  FileText,
  HelpCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Modal from '@/components/Modal';

export default function AdminRequirementsPage() {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Selected requirement for actions
  const [activeReq, setActiveReq] = useState<any>(null);
  
  // Actions Modals state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [clarifyModalOpen, setClarifyModalOpen] = useState(false);

  // Quote Form state
  const [quoteForm, setQuoteForm] = useState({
    unitPrice: '',
    quantity: '',
    shippingCharge: '0',
    taxAmount: '0',
    discountAmount: '0',
    finalAmount: 0,
    validityDays: '30',
    adminNotes: '',
  });

  // Clarification Form state
  const [clarificationQuestion, setClarificationQuestion] = useState('');

  async function loadRequirements() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/packaging/requirements');
      if (res.ok) {
        const data = await res.json();
        setRequirements(data.requirements || []);
      } else {
        throw new Error('Failed to load custom requirements.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading custom requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequirements();
  }, []);

  // Open Quote Modal
  const handleOpenQuoteModal = (req: any) => {
    setActiveReq(req);
    setQuoteForm({
      unitPrice: '',
      quantity: req.requiredQuantity.toString(),
      shippingCharge: '0',
      taxAmount: '0',
      discountAmount: '0',
      finalAmount: 0,
      validityDays: '30',
      adminNotes: '',
    });
    setQuoteModalOpen(true);
  };

  // Auto calculate total in Quote form
  useEffect(() => {
    if (!quoteModalOpen) return;
    const up = parseFloat(quoteForm.unitPrice) || 0;
    const qty = parseInt(quoteForm.quantity) || 0;
    const ship = parseFloat(quoteForm.shippingCharge) || 0;
    const tax = parseFloat(quoteForm.taxAmount) || 0;
    const disc = parseFloat(quoteForm.discountAmount) || 0;

    const subtotal = up * qty;
    const finalVal = Math.max(0, subtotal + ship + tax - disc);
    
    setQuoteForm(prev => {
      // Avoid infinite loop by only updating if changed
      if (prev.finalAmount !== finalVal) {
        return { ...prev, finalAmount: parseFloat(finalVal.toFixed(2)) };
      }
      return prev;
    });
  }, [quoteForm.unitPrice, quoteForm.quantity, quoteForm.shippingCharge, quoteForm.taxAmount, quoteForm.discountAmount, quoteFormOpenTriggered()]);

  // Small helper to avoid React warning on effect dependency
  function quoteFormOpenTriggered() {
    return quoteModalOpen;
  }

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq) return;

    setActionLoading(true);
    setError('');
    setMessage('');

    const subtotal = (parseFloat(quoteForm.unitPrice) || 0) * (parseInt(quoteForm.quantity) || 0);

    try {
      const res = await fetch(`/api/admin/packaging/requirements/${activeReq.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quoteForm,
          subtotal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quotation.');

      setMessage('Quotation submitted successfully to the customer.');
      setQuoteModalOpen(false);
      await loadRequirements();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Clarification Modal
  const handleOpenClarifyModal = (req: any) => {
    setActiveReq(req);
    setClarificationQuestion('');
    setClarifyModalOpen(true);
  };

  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq || !clarificationQuestion.trim()) return;

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/packaging/requirements/${activeReq.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clarify',
          question: clarificationQuestion.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request clarification.');

      setMessage('Clarification inquiry registered.');
      setClarifyModalOpen(false);
      await loadRequirements();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequirement = async (req: any) => {
    if (!confirm(`Are you sure you want to REJECT the custom requirement from ${req.customerName}?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/packaging/requirements/${req.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          note: 'Rejected by administrator during initial specs evaluation.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject requirement.');

      setMessage('Requirement rejected.');
      await loadRequirements();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">New</span>;
      case 'UNDER_REVIEW':
        return <span className="bg-amber-50 text-amber-800 border border-amber-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Under Review</span>;
      case 'CLARIFICATION_REQUIRED':
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider animate-pulse">Clarification Needed</span>;
      case 'APPROVED_QUOTED':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Quotation Ready</span>;
      case 'CUSTOMER_ACCEPTED':
        return <span className="bg-green-50 text-green-800 border border-green-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Customer Accepted</span>;
      case 'CUSTOMER_REJECTED':
        return <span className="bg-red-50 text-red-800 border border-red-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Customer Rejected</span>;
      case 'PAYMENT_PENDING':
        return <span className="bg-amber-50 text-amber-850 border border-amber-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider animate-pulse">Payment Verification Pending</span>;
      case 'PAID':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Paid / Confirmed</span>;
      case 'ORDER_CONFIRMED':
        return <span className="bg-green-100 text-green-900 border border-green-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Order Complete</span>;
      case 'CANCELLED':
        return <span className="bg-slate-100 text-slate-500 border border-slate-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">Packaging Custom Inquiries</h1>
        <p className="text-xs text-slate-500 mt-1">Review bulk customization requests, send clarifications, and generate checkout quotations</p>
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

      {requirements.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm text-slate-400 font-medium text-xs">
          No custom packaging inquiries logged in the system.
        </div>
      ) : (
        <div className="space-y-4">
          {requirements.map((req) => {
            const isPendingAction = ['NEW', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED'].includes(req.status);
            const latestQuote = req.quotations && req.quotations[0];

            return (
              <div key={req.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header Row */}
                <div className="bg-[#F4F7F6] border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Inquiry ID</span>
                      <strong className="text-slate-800 font-mono">#{req.id.slice(-6).toUpperCase()}</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Date Submitted</span>
                      <span className="text-slate-700 font-semibold">{formatDateIndian(req.createdAt)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">Material</span>
                      <strong className="text-slate-800">{req.productMaterial}</strong>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(req.status)}
                  </div>
                </div>

                {/* Body Row */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
                  {/* Customer Information */}
                  <div>
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 mb-2">Customer Details</h4>
                    <p className="space-y-1">
                      <strong className="text-slate-850 block font-bold">{req.customerName}</strong>
                      <span className="text-slate-500 font-medium block">{req.companyName}</span>
                      <span className="block mt-1 font-mono text-[11px]">{req.email}</span>
                      <span className="block font-mono text-[11px]">{req.phone}</span>
                    </p>
                  </div>

                  {/* Requirements details */}
                  <div className="border-l border-slate-100 pl-6">
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 mb-2">Specs & Request</h4>
                    <p className="space-y-1">
                      <span className="block text-slate-500 font-medium">Quantity Needed: <strong>{req.requiredQuantity.toLocaleString()} pcs</strong></span>
                      {req.requiredDimension && <span className="block text-slate-500 font-medium">Dimension specs: <strong>{req.requiredDimension}</strong></span>}
                      <span className="block flex items-center gap-1 mt-1"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" /> Target Date: {formatDateIndian(req.requiredDate)}</span>
                      <span className="block flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" /> Delivery: {req.deliveryLocation}</span>
                      {req.attachmentUrl && (
                        <a
                          href={req.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 font-bold text-[#0F4C3A] hover:underline"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Specs Attachment
                        </a>
                      )}
                    </p>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] text-slate-500 italic mt-3 leading-relaxed">
                      "{req.additionalRequirements || 'No description notes provided.'}"
                    </div>
                  </div>

                  {/* Admin notes & quote summary / actions */}
                  <div className="border-l border-slate-100 pl-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 mb-2">Review Notes</h4>
                      {req.clarificationQuestion && (
                        <div className="mb-2 text-purple-800 bg-purple-50 p-2 rounded border border-purple-100 leading-normal text-[11px]">
                          <strong>Clarification sent:</strong> "{req.clarificationQuestion}"
                        </div>
                      )}
                      
                      {latestQuote ? (
                        <div className="bg-emerald-50 border border-emerald-150 p-2.5 rounded-lg text-[11px] leading-normal text-emerald-800 space-y-1.5">
                          <span className="font-bold uppercase text-[9px] text-emerald-600 block">Active Quotation</span>
                          <div className="flex justify-between">
                            <span>Quote Number:</span>
                            <span className="font-bold">{latestQuote.quotationNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Quoted Final Price:</span>
                            <strong className="font-black text-sm">₹{latestQuote.finalAmount.toFixed(2)}</strong>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-medium">No quotation generated yet.</span>
                      )}

                      {req.adminNotes && (
                        <div className="text-[10px] text-slate-400 mt-2 font-medium italic">
                          Notes: {req.adminNotes}
                        </div>
                      )}
                    </div>

                    {isPendingAction && (
                      <div className="flex flex-col gap-2 w-full pt-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectRequirement(req)}
                            className="flex-1 border border-red-200 text-red-650 hover:bg-red-50 py-1.5 rounded-lg font-bold transition flex items-center justify-center text-[10px]"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleOpenClarifyModal(req)}
                            className="flex-1 border border-purple-200 text-purple-800 hover:bg-purple-50 py-1.5 rounded-lg font-bold transition flex items-center justify-center text-[10px]"
                          >
                            Clarify
                          </button>
                        </div>
                        <button
                          onClick={() => handleOpenQuoteModal(req)}
                          className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 text-[11px] shadow-sm"
                        >
                          Approve & Quote <ArrowRight className="w-3.5 h-3.5" />
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

      {/* Approve & Quote Form Modal */}
      {quoteModalOpen && activeReq && (
        <Modal isOpen={quoteModalOpen} onClose={() => setQuoteModalOpen(false)} title="Approve & Send Custom Quotation">
          <form onSubmit={handleQuoteSubmit} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-500 leading-normal border border-slate-100 mb-2">
              <strong className="text-slate-700">Client specs:</strong> {activeReq.requiredQuantity.toLocaleString()}x {activeReq.productMaterial} {activeReq.requiredDimension ? `(${activeReq.requiredDimension})` : ''} to deliver to {activeReq.deliveryLocation}.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quoted Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={quoteForm.unitPrice}
                  onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  value={quoteForm.quantity}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="col-span-1">
                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Shipping Fee (₹)</label>
                <input
                  type="number"
                  required
                  value={quoteForm.shippingCharge}
                  onChange={(e) => setQuoteForm({ ...quoteForm, shippingCharge: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Taxes / GST (₹)</label>
                <input
                  type="number"
                  required
                  value={quoteForm.taxAmount}
                  onChange={(e) => setQuoteForm({ ...quoteForm, taxAmount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Discount (₹)</label>
                <input
                  type="number"
                  required
                  value={quoteForm.discountAmount}
                  onChange={(e) => setQuoteForm({ ...quoteForm, discountAmount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Validity (Days)</label>
                <input
                  type="number"
                  required
                  value={quoteForm.validityDays}
                  onChange={(e) => setQuoteForm({ ...quoteForm, validityDays: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition"
                />
              </div>
            </div>

            <div className="bg-[#F4F7F6] p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
              <span className="text-xs font-black text-slate-800 uppercase">Gross Quoted Total:</span>
              <strong className="text-lg font-black text-[#0F4C3A]">₹{quoteForm.finalAmount.toFixed(2)}</strong>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Admin Notes / Terms</label>
              <textarea
                rows={3}
                value={quoteForm.adminNotes}
                onChange={(e) => setQuoteForm({ ...quoteForm, adminNotes: e.target.value })}
                placeholder="Detail materials specs, shipping rules, or custom parameters..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuoteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Send Quotation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Clarification Form Modal */}
      {clarifyModalOpen && activeReq && (
        <Modal isOpen={clarifyModalOpen} onClose={() => setClarifyModalOpen(false)} title="Send Clarification Inquiry">
          <form onSubmit={handleClarifySubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Inquiry Question to Customer</label>
              <textarea
                rows={3}
                required
                value={clarificationQuestion}
                onChange={(e) => setClarificationQuestion(e.target.value)}
                placeholder="What details require clarification? (e.g. Please clarify exact width in inches, select a box thickness, confirm loading dock access...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-sans"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClarifyModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-purple-650 hover:bg-purple-755 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                Send Question
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
