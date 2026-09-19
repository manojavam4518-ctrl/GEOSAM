'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  FileText,
  Calendar,
  MapPin,
  ClipboardList,
  CheckCircle,
  XCircle,
  Loader2,
  FileQuestion,
  HelpCircle,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import Modal from '@/components/Modal';
import PackagingWorkflowVisual from '@/components/logistics/PackagingWorkflowVisual';

export default function MyRequirementsPage() {
  const router = useRouter();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadRequirements() {
    setLoading(true);
    try {
      const res = await fetch('/api/packaging/requirements');
      if (res.ok) {
        const data = await res.json();
        setRequirements(data.requirements || []);
      }
    } catch (err) {
      console.error('Failed to load requirements:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequirements();
  }, []);

  const handleOpenQuote = (req: any) => {
    setSelectedReq(req);
    setQuoteModalOpen(true);
    setError('');
  };

  const handleAcceptQuote = async (reqId: string) => {
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/packaging/requirements/${reqId}/accept`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept quotation.');

      setQuoteModalOpen(false);
      // Redirect to the checkout payment page for the newly generated order!
      router.push(`/dashboard/packaging/payment/${data.orderId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to accept quote.');
      setActionLoading(false);
    }
  };

  const handleRejectQuote = async (reqId: string) => {
    if (!confirm('Are you sure you want to REJECT this custom quotation? This action cannot be undone.')) {
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/packaging/requirements/${reqId}/reject`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject quotation.');

      setQuoteModalOpen(false);
      await loadRequirements();
    } catch (err: any) {
      setError(err.message || 'Failed to reject quote.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">New</span>;
      case 'UNDER_REVIEW':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Under Review</span>;
      case 'CLARIFICATION_REQUIRED':
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider animate-pulse">Clarification Needed</span>;
      case 'APPROVED_QUOTED':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Quotation Ready</span>;
      case 'CUSTOMER_ACCEPTED':
        return <span className="bg-green-50 text-green-800 border border-green-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Quotation Accepted</span>;
      case 'CUSTOMER_REJECTED':
        return <span className="bg-red-50 text-red-800 border border-red-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Quotation Rejected</span>;
      case 'PAYMENT_PENDING':
        return <span className="bg-amber-50 text-amber-850 border border-amber-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Payment Verification Pending</span>;
      case 'PAID':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Paid</span>;
      case 'ORDER_CONFIRMED':
        return <span className="bg-green-100 text-green-800 border border-green-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Order Complete</span>;
      case 'CANCELLED':
        return <span className="bg-slate-100 text-slate-500 border border-slate-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200 py-0.5 px-2 rounded-full font-bold text-[9px] uppercase tracking-wider">{status}</span>;
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">My Packaging Requests</h1>
        <p className="text-xs text-slate-500 mt-1">Review bulk packaging requirement inquiries and verify generated quotations</p>
      </div>

      {/* GEO TRANSIT Packaging Order Lifecycle Visual */}
      <PackagingWorkflowVisual />

      {requirements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm text-slate-400 font-medium text-xs">
          No custom packaging requirements submitted yet.
        </div>
      ) : (
        <div className="space-y-4">
          {requirements.map((req) => {
            const hasQuote = req.status === 'APPROVED_QUOTED' && req.quotations && req.quotations.length > 0;
            const quote = hasQuote ? req.quotations[0] : null;

            return (
              <div key={req.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 hover:border-slate-350 transition flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-slate-50 border border-slate-200/60 text-slate-600 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                      Material: {req.productMaterial}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>
                  
                  <h3 className="font-bold text-sm text-slate-800 mt-1">
                    Inquiry for {req.requiredQuantity.toLocaleString()} pieces
                    {req.requiredDimension && <span className="text-xs text-slate-400 font-medium ml-2">({req.requiredDimension})</span>}
                  </h3>
                  
                  <div className="flex items-center gap-4 flex-wrap text-[10px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Required: {formatDateIndian(req.requiredDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Deliver: {req.deliveryLocation}
                    </span>
                  </div>

                  {req.status === 'CLARIFICATION_REQUIRED' && req.clarificationQuestion && (
                    <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg text-xs mt-3">
                      <strong className="text-purple-900 block font-bold">Admin Clarification Request:</strong>
                      <p className="text-purple-800 mt-1 leading-normal font-medium italic">"{req.clarificationQuestion}"</p>
                    </div>
                  )}

                  {req.adminNotes && (
                    <div className="text-[10px] text-slate-400 leading-normal italic mt-2">
                      Notes: {req.adminNotes}
                    </div>
                  )}
                </div>

                <div className="shrink-0 md:border-l md:border-slate-100 md:pl-6 flex flex-col justify-center min-w-[160px]">
                  {hasQuote && quote ? (
                    <div className="space-y-2 text-center">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Quoted Amount</span>
                      <strong className="text-lg font-black text-[#0F4C3A] block">₹{quote.finalAmount.toFixed(2)}</strong>
                      <button
                        onClick={() => handleOpenQuote(req)}
                        className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-3 rounded-lg font-bold transition text-xs shadow-sm"
                      >
                        View Quotation
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 font-medium">
                      {req.status === 'NEW' && 'Awaiting review...'}
                      {req.status === 'UNDER_REVIEW' && 'Under review by Admin...'}
                      {req.status === 'CLARIFICATION_REQUIRED' && 'Please clarify details'}
                      {req.status === 'CUSTOMER_REJECTED' && 'Quote Rejected'}
                      {req.status === 'CUSTOMER_ACCEPTED' && 'Quote Approved! Paid.'}
                      {req.status === 'PAYMENT_PENDING' && 'UTR Verification Pending'}
                      {req.status === 'PAID' && 'Paid / Processing'}
                      {req.status === 'ORDER_CONFIRMED' && 'Order Complete'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Quotation Detailed Modal */}
      {quoteModalOpen && selectedReq && selectedReq.quotations?.[0] && (() => {
        const quote = selectedReq.quotations[0];
        return (
          <Modal isOpen={quoteModalOpen} onClose={() => setQuoteModalOpen(false)} title="CUSTOM PACKAGING QUOTATION">
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-2.5 rounded-lg text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* original requirement summary */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Original Requirement Details</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Material/Product:</span>
                  <strong className="text-slate-800">{selectedReq.productMaterial}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Required Quantity:</span>
                  <strong className="text-slate-800">{selectedReq.requiredQuantity.toLocaleString()} pcs</strong>
                </div>
                {selectedReq.requiredDimension && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dimensions:</span>
                    <strong className="text-slate-800">{selectedReq.requiredDimension}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Location:</span>
                  <strong className="text-slate-800">{selectedReq.deliveryLocation}</strong>
                </div>
              </div>

              {/* Quotation pricing breakdowns */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Quote Number:</span>
                  <span className="text-xs font-bold text-slate-700">{quote.quotationNumber}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quoted Unit Price:</span>
                    <span className="font-semibold text-slate-700">₹{quote.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold text-slate-700">₹{quote.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shipping Charge:</span>
                    <span className="font-semibold text-slate-700">₹{quote.shippingCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Tax/GST Amount:</span>
                    <span className="font-semibold text-slate-700">₹{quote.taxAmount.toFixed(2)}</span>
                  </div>
                  {quote.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{quote.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 uppercase">Final Quoted Price:</span>
                  <strong className="text-lg font-black text-[#0F4C3A]">₹{quote.finalAmount.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Quote Validity: {quote.validityDays} Days</span>
                  <span>Expires: {formatDateIndian(quote.validUntil)}</span>
                </div>
              </div>

              {quote.adminNotes && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-xs">
                  <strong className="text-[#0F4C3A] block font-bold">Admin Notes:</strong>
                  <p className="text-slate-600 mt-1 leading-normal font-medium">{quote.adminNotes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleRejectQuote(selectedReq.id)}
                  className="px-4 py-2 border border-red-200 text-red-650 hover:bg-red-50 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  Reject Quotation
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAcceptQuote(selectedReq.id)}
                  className="px-5 py-2 bg-[#0F4C3A] hover:bg-[#1E8262] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Accept & Proceed to Payment
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
