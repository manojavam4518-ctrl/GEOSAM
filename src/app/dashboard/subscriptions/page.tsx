'use client';

import React, { useEffect, useState } from 'react';
import { formatDateIndian } from '@/utils/dateUtils';
import {
  CreditCard,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  AlertCircle,
  Copy,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function SubscriptionsPage() {
  // Page states
  const [plans, setPlans] = useState<any[]>([]);
  const [taxSettings, setTaxSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected config
  const [duration, setDuration] = useState<3 | 6 | 12>(12);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // Checkout Wizard steps: 'PLAN' | 'BILLING' | 'PAYMENT' | 'CONFIRMATION'
  const [step, setStep] = useState<'PLAN' | 'BILLING' | 'PAYMENT' | 'CONFIRMATION'>('PLAN');
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Billing Details Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');
  const [invoiceRequired, setInvoiceRequired] = useState(false);
  const [gstin, setGstin] = useState('');

  // Payment details
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [utr, setUtr] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalPaymentRecord, setFinalPaymentRecord] = useState<any>(null);

  // Expiry date calculation preview
  const [expiryPreview, setExpiryPreview] = useState('');

  useEffect(() => {
    async function loadPlans() {
      try {
        const [plansRes, payRes] = await Promise.all([
          fetch('/api/subscription/plans'),
          fetch('/api/admin/settings/payment')
        ]);

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(plansData.plans || []);
          setTaxSettings(plansData.taxSettings);
        }

        if (payRes.ok) {
          const payData = await payRes.json();
          setPaymentSettings(payData.paymentSettings);
        }
      } catch (err) {
        setError('Failed to fetch subscription plans.');
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
    
    // Set expiry preview
    const d = new Date();
    d.setMonth(d.getMonth() + duration);
    setExpiryPreview(formatDateIndian(d));
  }, [duration]);

  // Copy helper
  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }

  // Choose Plan & trigger server checkout calculations
  async function selectPlanForCheckout(plan: any) {
    setSelectedPlan(plan);
    setCheckoutLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, duration }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout initialization failed.');
      }

      setCheckoutData(data);
      setStep('BILLING');
      
      // Auto-populate user billing details if we can
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setFullName(meData.user.name || '');
        setEmail(meData.user.email || '');
        setPhone(meData.user.mobile || '');
        setCompanyName(meData.user.company || '');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  // Handle screenshot uploading
  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScreenshotFile(file);
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed.');
      }

      setScreenshotUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload payment screenshot.');
      setScreenshotFile(null);
    } finally {
      setUploading(false);
    }
  }

  // Submit payment UTR & screenshot to admin
  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!utr) {
      setError('Transaction / UTR Number is required.');
      return;
    }

    if (!screenshotUrl) {
      setError('Please upload a screenshot of the successful transaction.');
      return;
    }

    setSubmitting(true);
    try {
      const billingDetails = {
        fullName,
        email,
        phone,
        companyName,
        address,
        city,
        state,
        country,
        pincode,
        gstin: invoiceRequired ? gstin : undefined,
      };

      const res = await fetch('/api/subscription/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          duration,
          billingDetails,
          invoiceRequired,
          paymentMethod,
          utr,
          screenshotUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment submission failed.');
      }

      setFinalPaymentRecord(data.payment);
      setStep('CONFIRMATION');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">
          {step === 'PLAN' && 'Upgrade / Renew Subscription'}
          {step === 'BILLING' && 'Commercial Checkout - Billing Info'}
          {step === 'PAYMENT' && 'Commercial Checkout - Complete Payment'}
          {step === 'CONFIRMATION' && 'Order Submitted Successfully'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {step === 'PLAN' && 'Choose duration and select a device plan to upgrade your portal licensing'}
          {step === 'BILLING' && 'Provide company billing information for tax invoice generation'}
          {step === 'PAYMENT' && 'Scan QR code or transfer to bank and input UTR reference'}
          {step === 'CONFIRMATION' && 'Your payment is pending approval by the portal administrator'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-xs font-semibold max-w-3xl">
          {error}
        </div>
      )}

      {/* STEP 1: PLAN SELECTOR */}
      {step === 'PLAN' && (
        <div className="space-y-8">
          {/* Duration Selector */}
          <div className="flex justify-start">
            <div className="bg-slate-200/80 p-1 rounded-xl inline-flex items-center gap-1 shadow-inner border border-slate-300">
              <button
                onClick={() => setDuration(3)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  duration === 3 ? 'bg-[#0F4C3A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3 Months Price
              </button>
              <button
                onClick={() => setDuration(6)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  duration === 6 ? 'bg-[#0F4C3A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                6 Months Price
              </button>
              <button
                onClick={() => setDuration(12)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                  duration === 12 ? 'bg-[#0F4C3A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                12 Months Price
              </button>
            </div>
          </div>

          {/* Pricing cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-stretch">
            {plans.map((plan) => {
              let price = plan.price12Months;
              if (duration === 3) price = plan.price3Months;
              else if (duration === 6) price = plan.price6Months;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-xl border flex flex-col p-5 transition-all duration-200 hover:-translate-y-1 ${
                    plan.recommended
                      ? 'border-2 border-[#1E8262] shadow-md ring-4 ring-emerald-50 hover:shadow-xl hover:ring-emerald-100'
                      : 'border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300'
                  }`}
                >
                  {/* Recommended Tag */}
                  {plan.recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1E8262] text-white text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                      RECOMMENDED
                    </span>
                  )}

                  <div className="mb-4">
                    <h3 className="font-bold text-sm text-slate-900">{plan.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Supports up to {plan.deviceLimit} active client {plan.deviceLimit === 1 ? 'device' : 'devices'}.
                    </p>
                  </div>

                  <div className="my-6">
                    <span className="text-2xl font-black text-[#0F4C3A]">₹{price}</span>
                    <span className="text-slate-400 text-xs font-semibold">/{duration} Mo</span>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider leading-none">
                      +18% GST Applicable
                    </p>
                  </div>

                  <ul className="text-[11px] text-slate-600 space-y-2 mb-6 flex-grow">
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{plan.deviceLimit} Device Session Limits</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Unlimited Volumetric Maths</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>Logs Retention History</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => selectPlanForCheckout(plan)}
                    disabled={checkoutLoading}
                    className={`w-full text-center py-2 rounded-lg text-xs font-bold transition-all duration-180 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center justify-center gap-1 cursor-pointer ${
                      plan.recommended
                        ? 'bg-[#0F4C3A] hover:bg-[#0c3c2e] text-white shadow-md hover:shadow-lg'
                        : 'bg-[#E8F5E9] hover:bg-[#c9ebd0] text-[#0F4C3A]'
                    }`}
                  >
                    {checkoutLoading && selectedPlan?.id === plan.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Choose Subscription'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: BILLING DETAILS */}
      {step === 'BILLING' && checkoutData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Billing Form (2 Columns) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
              Billing Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Billing Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Suite, Street Address, etc."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Invoice choice */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Do you require a tax invoice?</span>
                  <span className="block text-[10px] text-slate-500 font-light">Enables entry of your business GSTIN for tax filings</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invoiceRequired}
                    onChange={(e) => setInvoiceRequired(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
                </label>
              </div>

              {invoiceRequired && (
                <div className="animate-fade-in max-w-sm">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27AAACG1234F1Z0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep('PLAN')}
                className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold transition"
              >
                Back to Plans
              </button>
              <button
                onClick={() => {
                  if (!fullName || !email || !phone || !companyName || !address || !city || !state || !pincode) {
                    setError('All billing details are required.');
                    return;
                  }
                  setStep('PAYMENT');
                }}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-5 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                Continue to Payment
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Checkout pricing breakdown (1 Column) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-20">
            <div className="bg-[#0F4C3A] text-white p-4">
              <h3 className="font-bold text-xs uppercase tracking-wider">Order Summary</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-xs space-y-2 pb-4 border-b border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan Chosen</span>
                  <span className="font-bold text-slate-800">{checkoutData.plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Device Limit</span>
                  <span className="font-bold text-slate-800">{checkoutData.plan.deviceLimit} Devices</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-bold text-slate-800">{checkoutData.duration} Months</span>
                </div>
              </div>

              <div className="text-xs space-y-2 pb-4 border-b border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Base Price</span>
                  <span className="font-semibold text-slate-800">₹{checkoutData.baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST ({checkoutData.gstRate}%)</span>
                  <span className="font-semibold text-slate-800">₹{checkoutData.gstAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-800">Total Payable</span>
                <span className="text-xl font-black text-[#0F4C3A]">₹{checkoutData.totalAmount.toFixed(2)}</span>
              </div>

              <div className="bg-[#E8F5E9] border border-emerald-200 p-3 rounded-lg text-[10px] text-emerald-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#0F4C3A]" />
                <span>
                  The base pricing is dynamically loaded from MongoDB. This calculation is signed and enforced server-side.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PAYMENT SUBMISSION */}
      {step === 'PAYMENT' && checkoutData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Payment gateway cards (2 Columns) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Submit Payment Transaction
              </h3>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod('UPI')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                    paymentMethod === 'UPI'
                      ? 'bg-[#0F4C3A] border-[#0F4C3A] text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  UPI Method
                </button>
                <button
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'bg-[#0F4C3A] border-[#0F4C3A] text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Bank Transfer
                </button>
              </div>
            </div>

            {/* UPI GATEWAY RENDER */}
            {paymentMethod === 'UPI' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-2xl bg-slate-50">
                  {paymentSettings?.qrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={paymentSettings.qrCodeUrl}
                      alt="UPI QR Code"
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 bg-slate-200 flex flex-col justify-center items-center text-slate-400 font-bold text-[10px] text-center border border-dashed border-slate-300 rounded">
                      <span>UPI QR Code</span>
                      <span>Not Configured</span>
                    </div>
                  )}
                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-2">Scan QR to pay</span>
                </div>

                {/* UPI Credentials */}
                <div className="sm:col-span-2 space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">UPI ID</span>
                    <div className="flex items-center justify-between gap-3 bg-white p-2 border border-slate-200 rounded-lg">
                      <span className="text-xs font-bold text-[#0F4C3A] font-mono select-all">
                        {paymentSettings?.upiId || 'Not configured'}
                      </span>
                      <button
                        onClick={() => handleCopy(paymentSettings?.upiId)}
                        className="p-1 rounded text-slate-400 hover:text-slate-800"
                        type="button"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed font-light">
                    <p>
                      Payee Name: <strong>{paymentSettings?.upiName || 'N/A'}</strong>
                    </p>
                    <p>
                      Instructions: {paymentSettings?.upiInstructions || 'Pay the exact total amount and upload details.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* BANK TRANSFER RENDER */}
            {paymentMethod === 'BANK_TRANSFER' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase border-b pb-1">
                    Bank Account Details
                  </span>
                  <div className="text-xs space-y-2 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Holder</span>
                      <span className="text-slate-800 font-bold">{paymentSettings?.bankAccountHolder || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Name</span>
                      <span className="text-slate-800">{paymentSettings?.bankName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Number</span>
                      <span className="text-[#0F4C3A] font-bold font-mono">{paymentSettings?.bankAccountNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IFSC Code</span>
                      <span className="text-slate-800 font-mono font-bold">{paymentSettings?.bankIfsc || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Branch / Type</span>
                      <span className="text-slate-600 text-xs">
                        {paymentSettings?.bankBranch || 'N/A'} ({paymentSettings?.bankAccountType || 'Current'})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase mb-2">Instructions</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-light">
                      {paymentSettings?.bankInstructions || 'Transfer via NEFT/IMPS. Mention your name in transaction remarks.'}
                    </p>
                  </div>
                  <div className="text-[10px] text-amber-800 font-medium mt-4">
                    ⚠️ Processing bank transfers can take up to 24 hours for clearing.
                  </div>
                </div>
              </div>
            )}

            {/* SUBMISSION FORM DETAILS */}
            <form onSubmit={handlePaymentSubmit} className="border-t border-slate-100 pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Transaction / UTR Number
                  </label>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="12-digit transaction ID"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-[#1c2e24] focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Payment Screenshot
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 bg-[#E8F5E9] hover:bg-[#c9ebd0] border border-emerald-200 text-[#0F4C3A] py-2 px-4 rounded-lg text-xs font-bold transition cursor-pointer select-none">
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? 'Uploading...' : screenshotFile ? 'Change File' : 'Upload Receipt'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                      />
                    </label>
                    {screenshotFile && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[120px] font-medium">
                        {screenshotFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('BILLING')}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold transition"
                >
                  Back to Billing
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-2 px-5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Verification Details'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Pricing summary sticky */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-20">
            <div className="bg-[#0F4C3A] text-white p-4">
              <h3 className="font-bold text-xs uppercase tracking-wider">Summary breakdown</h3>
            </div>
            
            <div className="p-5 space-y-4 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan details</span>
                <span className="text-slate-800 font-bold">{checkoutData.plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active duration</span>
                <span className="text-slate-800">{checkoutData.duration} Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GSTIN</span>
                <span className="text-slate-800 font-mono font-bold">{invoiceRequired ? gstin || 'Yes' : 'Not requested'}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-800">Total Due</span>
                <span className="text-[#0F4C3A] text-lg font-black">₹{checkoutData.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION SCREEN */}
      {step === 'CONFIRMATION' && finalPaymentRecord && (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm max-w-xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center rounded-full mx-auto shadow-inner border border-emerald-200">
            <CreditCard className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#0F4C3A]">Payment Pending Verification</h2>
            <p className="text-xs text-slate-500 font-light max-w-md mx-auto leading-relaxed">
              Your payment submission has been logged in MongoDB. An administrator is validating your reference code.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-2.5 max-w-sm mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold text-[9px] uppercase">Plan Requested</span>
              <span className="text-slate-800 font-bold">{finalPaymentRecord.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold text-[9px] uppercase">Duration</span>
              <span className="text-slate-800 font-bold">{finalPaymentRecord.duration} Months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold text-[9px] uppercase">Total paid</span>
              <span className="text-[#0F4C3A] font-black">₹{finalPaymentRecord.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold text-[9px] uppercase">UTR / Ref ID</span>
              <span className="text-slate-800 font-mono font-bold select-all">{finalPaymentRecord.utr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold text-[9px] uppercase">Status</span>
              <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                PENDING APPROVAL
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                setStep('PLAN');
                setSelectedPlan(null);
                setCheckoutData(null);
                setUtr('');
                setScreenshotFile(null);
                setScreenshotUrl('');
              }}
              className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2 px-6 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Return to Subscriptions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
