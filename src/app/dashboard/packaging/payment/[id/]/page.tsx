'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  QrCode,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

export default function OrderPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [utr, setUtr] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function loadPaymentData() {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Order Details
      const oRes = await fetch(`/api/packaging/order/${orderId}`);
      if (!oRes.ok) throw new Error('Order not found');
      const oData = await oRes.json();
      setOrder(oData.order);

      if (oData.order.status !== 'PENDING_PAYMENT') {
        setSuccess(true); // If already paid or processing, skip payment
      }

      // 2. Fetch Active Payment Gateway settings
      const setRes = await fetch('/api/admin/settings/payment');
      if (setRes.ok) {
        const setData = await setRes.json();
        setPaymentSettings(setData.paymentSettings);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load order billing details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      loadPaymentData();
    }
  }, [orderId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      setScreenshotUrl(data.url);
      alert('Transaction screenshot uploaded successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim()) {
      setError('Transaction UTR / Reference number is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/packaging/order/${orderId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          utr: utr.trim(),
          screenshotUrl: screenshotUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register payment.');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment transaction details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-md my-12 space-y-5">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-full mx-auto">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0F4C3A]">Payment Verification Pending</h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          Thank you! We have received your payment UTR details for Order <strong>#{order?.orderNumber}</strong>. Once our billing admin verifies this reference, your order status will be updated to confirmed.
        </p>
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/packaging/orders"
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-5 rounded-xl text-xs font-bold transition shadow-sm"
          >
            View Packaging Orders
          </Link>
          <Link
            href="/dashboard/packaging"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-5 rounded-xl text-xs font-bold transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A] flex items-center gap-2">
          <CreditCard className="w-6 h-6" /> Complete Packaging Checkout
        </h1>
        <p className="text-xs text-slate-500 mt-1">Submit bank transfer receipt proof to complete order dispatch registration</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Payment Transfer Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Box */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount Payable (Incl. GST)</span>
              <strong className="text-2xl font-black text-[#0F4C3A]">₹{order?.totalAmount.toFixed(2)}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Order Reference</span>
              <span className="text-xs font-bold text-slate-800">#{order?.orderNumber}</span>
            </div>
          </div>

          {/* Payment Methods Tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">1. Select Payment Method</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-3 rounded-xl border font-bold text-xs transition flex flex-col items-center gap-2 ${
                  paymentMethod === 'UPI'
                    ? 'border-[#0F4C3A] bg-[#E8F5E9]/10 text-[#0F4C3A]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <QrCode className="w-5 h-5" />
                UPI / QR Payment
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`p-3 rounded-xl border font-bold text-xs transition flex flex-col items-center gap-2 ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-[#0F4C3A] bg-[#E8F5E9]/10 text-[#0F4C3A]'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Bank IMPS/NEFT
              </button>
            </div>

            {/* Instruction Details */}
            {paymentSettings && (
              <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200/50 text-xs leading-relaxed text-slate-600">
                {paymentMethod === 'UPI' ? (
                  <>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="font-semibold text-slate-500">UPI Address:</span>
                      <strong className="text-slate-800 select-all font-mono">{paymentSettings.upiId}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="font-semibold text-slate-500">Payee Name:</span>
                      <strong className="text-slate-800">{paymentSettings.upiName}</strong>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal mt-2">
                      {paymentSettings.upiInstructions || 'Open any UPI client (GPay, PhonePe, Paytm), scan or enter ID, and transfer exact order total.'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Account Holder</span>
                        <strong className="text-slate-800">{paymentSettings.bankAccountHolder}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">IFSC Code</span>
                        <strong className="text-slate-800 font-mono select-all">{paymentSettings.bankIfsc}</strong>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-400 font-bold block">Bank & Branch</span>
                        <strong className="text-slate-800">{paymentSettings.bankName} ({paymentSettings.bankBranch})</strong>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-400 font-bold block">Account Number</span>
                        <strong className="text-slate-800 font-mono select-all">{paymentSettings.bankAccountNumber}</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal mt-2">
                      {paymentSettings.bankInstructions || 'Please register the payee and transfer via IMPS/NEFT. Add company/invoice reference in payment description.'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Verification Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">2. Submit Verification</h3>
          
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Transaction Ref / UTR Number
              </label>
              <input
                type="text"
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="12-digit UTR or Reference number"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:bg-white transition font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Upload Proof Screenshot (Optional)
              </label>
              <div className="relative border border-dashed border-slate-200 hover:border-[#0F4C3A] rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50 hover:bg-slate-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#1E8262]" />
                ) : screenshotUrl ? (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-bold">
                    <CheckCircle className="w-4 h-4" /> Screenshot Attached
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                    <ImageIcon className="w-5 h-5 text-slate-350" />
                    <span>Upload image file</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 mt-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Transaction Proof'}
            </button>
          </form>

          <div className="bg-amber-50/40 border border-amber-200/50 p-3 rounded-xl flex items-start gap-2 text-[10px] text-amber-800 leading-normal font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>Submissions undergo strict bank reconciliation. Duplicate or falsified UTR submissions will block account access.</span>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/dashboard/packaging/orders"
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to orders list
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
