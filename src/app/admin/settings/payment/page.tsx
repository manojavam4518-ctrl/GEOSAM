'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

export default function AdminPaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountType, setBankAccountType] = useState('Current Account');
  
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstRate, setGstRate] = useState('18');
  
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [upiInstructions, setUpiInstructions] = useState('');
  const [bankInstructions, setBankInstructions] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings/payment');
        if (res.ok) {
          const data = await res.json();
          const p = data.paymentSettings;
          setUpiId(p.upiId || '');
          setUpiName(p.upiName || '');
          setQrCodeUrl(p.qrCodeUrl || '');
          setBankAccountHolder(p.bankAccountHolder || '');
          setBankName(p.bankName || '');
          setBankAccountNumber(p.bankAccountNumber || '');
          setBankIfsc(p.bankIfsc || '');
          setBankBranch(p.bankBranch || '');
          setBankAccountType(p.bankAccountType || 'Current Account');
          setGstEnabled(p.gstEnabled);
          setGstRate(p.gstRate.toString());
          setPaymentInstructions(p.paymentInstructions || '');
          setUpiInstructions(p.upiInstructions || '');
          setBankInstructions(p.bankInstructions || '');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!upiId || !upiName || !bankAccountHolder || !bankName || !bankAccountNumber || !bankIfsc) {
      setError('UPI and basic Bank account details are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upiId,
          upiName,
          qrCodeUrl,
          bankAccountHolder,
          bankName,
          bankAccountNumber,
          bankIfsc,
          bankBranch,
          bankAccountType,
          gstEnabled,
          gstRate: parseFloat(gstRate) || 0,
          paymentInstructions,
          upiInstructions,
          bankInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings.');
      }

      setMessage(data.message || 'Payment settings saved.');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">Payment Gateway & GST configuration</h1>
        <p className="text-xs text-slate-500 mt-1">Configure UPI IDs, QR Codes, Bank clearance coordinates, and national tax percentages</p>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* UPI Box */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2">
            UPI Merchant Details
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="pay@merchant"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Merchant Display Name</label>
              <input
                type="text"
                value={upiName}
                onChange={(e) => setUpiName(e.target.value)}
                placeholder="GEO TRANSIT SOLUTIONS"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UPI Instructions</label>
            <input
              type="text"
              value={upiInstructions}
              onChange={(e) => setUpiInstructions(e.target.value)}
              placeholder="Scan QR code using GPay, PhonePe or BHIM UPI app."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Bank transfer box */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2">
            Corporate Bank Account Details
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account Holder Name</label>
              <input
                type="text"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account Type</label>
              <select
                value={bankAccountType}
                onChange={(e) => setBankAccountType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:bg-white"
              >
                <option value="Current Account">Current Account</option>
                <option value="Savings Account">Savings Account</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Account Number</label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">IFSC Code</label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-[#1c2e24] focus:bg-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bank Branch</label>
              <input
                type="text"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bank Transfer Instructions</label>
            <input
              type="text"
              value={bankInstructions}
              onChange={(e) => setBankInstructions(e.target.value)}
              placeholder="Send amount via NEFT/IMPS and copy UTR."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:bg-white"
            />
          </div>
        </div>

        {/* GST Settings Box */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2">
            Tax (GST) Settings
          </span>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="block text-xs font-bold text-slate-800">Enable GST Charges</span>
              <span className="block text-[9px] text-slate-400 mt-1">If enabled, adds GST calculation to orders</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E8262]"></div>
            </label>
          </div>

          {gstEnabled && (
            <div className="animate-fade-in max-w-xs">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GST Rate (%)</label>
              <input
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-[#0F4C3A]"
                required
              />
            </div>
          )}
        </div>

        {/* General checkout instructions */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2">
            Checkout Instructions Overview
          </span>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Global Instructions</label>
            <textarea
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Select a plan duration, make a transfer and upload receipts..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 min-h-[60px]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#0F4C3A] hover:bg-[#1E8262] disabled:bg-slate-300 text-white py-3 rounded-lg font-bold text-sm transition shadow-md"
        >
          {saving ? 'Saving payment gateway details...' : 'Save Payment & GST Configuration'}
        </button>
      </form>
    </div>
  );
}
