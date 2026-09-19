'use client';

import React, { useEffect, useState } from 'react';
import { formatDateIndian } from '@/utils/dateUtils';
import { FileCode, CheckCircle2, Loader2, Save, FileText, Building2, CreditCard, Layout } from 'lucide-react';

export default function AdminTemplatesPage() {
  const [activeSubTab, setActiveSubTab] = useState<'pdf' | 'email'>('pdf');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ----------------------------------------------------
  // PDF Invoice & Quotation Branding Form State
  // ----------------------------------------------------
  const [pdfBranding, setPdfBranding] = useState({
    companyName: 'GEO TRANSIT',
    companyTagline: 'Enterprise Logistics Tools & Calculations',
    address: 'Corporate Office, Mumbai, India',
    phone: '+91 9999999999',
    email: 'support@geotransit.com',
    website: 'www.geotransit.com',
    gstNumber: '27AAAAA0000A1Z5',
    footerText: '© 2026 GEO TRANSIT. All rights reserved.',
    terms: '1. Quotation rates valid for 30 days.\n2. GST applicable as per government regulations.\n3. Volumetric weight calculated using divisor 5000.',
    bankAccountHolder: 'GEO TRANSIT LOGISTICS PRIVATE LIMITED',
    bankName: 'HDFC Bank',
    bankAccountNumber: '50200012345678',
    bankIfsc: 'HDFC0001234',
    bankBranch: 'Mumbai Main Branch',
  });

  // ----------------------------------------------------
  // Email SMTP Templates State
  // ----------------------------------------------------
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load Email Templates
      const resTmpl = await fetch('/api/admin/settings/templates');
      if (resTmpl.ok) {
        const data = await resTmpl.json();
        setTemplates(data.templates || []);
        if (data.templates?.length > 0) {
          selectEmailTemplate(data.templates[0]);
        }
      }

      // 2. Load Payment & PDF Settings
      const resPay = await fetch('/api/admin/settings/payment');
      if (resPay.ok) {
        const payData = await resPay.json();
        const p = payData.paymentSettings || {};
        setPdfBranding((prev) => ({
          ...prev,
          bankAccountHolder: p.bankAccountHolder || prev.bankAccountHolder,
          bankName: p.bankName || prev.bankName,
          bankAccountNumber: p.bankAccountNumber || prev.bankAccountNumber,
          bankIfsc: p.bankIfsc || prev.bankIfsc,
          bankBranch: p.bankBranch || prev.bankBranch,
        }));
      }

      // 3. Load Website Settings
      const resWeb = await fetch('/api/admin/settings/demo');
      if (resWeb.ok) {
        const webData = await resWeb.json();
        if (webData.supportEmail) {
          setPdfBranding((prev) => ({
            ...prev,
            email: webData.supportEmail,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load template settings:', err);
    } fontally: {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function selectEmailTemplate(tmpl: any) {
    setSelectedTemplate(tmpl);
    setSubject(tmpl.subject);
    setBody(tmpl.body);
    setMessage('');
    setError('');
  }

  async function handleSavePdfBranding(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      // Save payment bank details
      await fetch('/api/admin/settings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upiId: 'geotransit@upi',
          upiName: pdfBranding.companyName,
          bankAccountHolder: pdfBranding.bankAccountHolder,
          bankName: pdfBranding.bankName,
          bankAccountNumber: pdfBranding.bankAccountNumber,
          bankIfsc: pdfBranding.bankIfsc,
          bankBranch: pdfBranding.bankBranch,
          bankAccountType: 'Current Account',
          gstEnabled: true,
          gstRate: 18.0,
        }),
      });

      setMessage('Invoice & PDF Document Templates updated successfully! PDF generators will use these updated branding details.');
    } catch (err: any) {
      setError(err.message || 'An error occurred saving PDF templates.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEmailTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTemplate.id,
          subject,
          body,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update email template.');

      setMessage(data.message || 'Email template updated successfully.');
      setTemplates((prev) => prev.map((t) => (t.id === selectedTemplate.id ? data.template : t)));
      setSelectedTemplate(data.template);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  function getTemplateVariables(name: string) {
    if (name === 'VERIFY_EMAIL') return '{{name}}, {{link}}';
    if (name === 'WELCOME') return '{{name}}';
    if (name === 'PASSWORD_RESET') return '{{name}}, {{link}}';
    if (name === 'PAYMENT_SUBMITTED') return '{{name}}, {{planName}}, {{duration}}, {{utr}}, {{amount}}';
    if (name === 'PAYMENT_APPROVED') return '{{name}}, {{planName}}, {{duration}}, {{amount}}, {{deviceLimit}}, {{expiryDate}}';
    if (name === 'PAYMENT_REJECTED') return '{{name}}, {{planName}}, {{utr}}, {{reason}}';
    if (name === 'SUBSCRIPTION_ACTIVATED') return '{{name}}, {{planName}}, {{deviceLimit}}, {{expiryDate}}';
    if (name === 'SUBSCRIPTION_EXPIRY_WARNING') return '{{name}}, {{planName}}, {{expiryDate}}';
    if (name === 'INVOICE') return '{{name}}, {{invoiceNumber}}, {{planName}}, {{duration}}, {{amount}}';
    return '';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-[#1E8262] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-[#0F4C3A]">Invoice, PDF & Email Templates</h1>
        <p className="text-xs text-slate-500 mt-1">Configure company branding, tax information, invoice/quotation PDF headers, and SMTP email templates</p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveSubTab('pdf'); setMessage(''); setError(''); }}
          className={`py-3 px-5 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeSubTab === 'pdf'
              ? 'border-[#0F4C3A] text-[#0F4C3A] bg-[#E8F5E9]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Invoice & Quotation PDF Templates
        </button>

        <button
          onClick={() => { setActiveSubTab('email'); setMessage(''); setError(''); }}
          className={`py-3 px-5 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeSubTab === 'email'
              ? 'border-[#0F4C3A] text-[#0F4C3A] bg-[#E8F5E9]/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4" /> Transactional Email SMTP Templates
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

      {/* TAB 1: INVOICE & PDF DOCUMENT TEMPLATES */}
      {activeSubTab === 'pdf' && (
        <form onSubmit={handleSavePdfBranding} className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Company & Invoice PDF Branding
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={pdfBranding.companyName}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GSTIN / Tax Number</label>
                <input
                  type="text"
                  required
                  value={pdfBranding.gstNumber}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, gstNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-800 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Support Phone</label>
                <input
                  type="text"
                  required
                  value={pdfBranding.phone}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Support Email</label>
                <input
                  type="email"
                  required
                  value={pdfBranding.email}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Website URL</label>
                <input
                  type="text"
                  required
                  value={pdfBranding.website}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, website: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Corporate Office Address</label>
              <textarea
                rows={2}
                required
                value={pdfBranding.address}
                onChange={(e) => setPdfBranding({ ...pdfBranding, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white font-sans"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#0F4C3A] uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Bank Account & PDF Payment Instructions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bank Account Holder</label>
                <input
                  type="text"
                  required
                  value={pdfBranding.bankAccountHolder}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, bankAccountHolder: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={pdfBranding.bankName}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, bankName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  value={pdfBranding.bankAccountNumber}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, bankAccountNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={pdfBranding.bankIfsc}
                  onChange={(e) => setPdfBranding({ ...pdfBranding, bankIfsc: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quotation Terms & Conditions (PDF Footer)</label>
              <textarea
                rows={3}
                value={pdfBranding.terms}
                onChange={(e) => setPdfBranding({ ...pdfBranding, terms: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:bg-white font-sans"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Invoice & PDF Template Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: TRANSACTIONAL EMAIL TEMPLATES */}
      {activeSubTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Templates List Sidebar */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 space-y-2">
            <span className="block text-[10px] font-bold text-[#0F4C3A] uppercase tracking-wider mb-3">Email Templates List</span>
            <div className="space-y-1">
              {templates.map((tmpl) => {
                const isSelected = selectedTemplate?.id === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => selectEmailTemplate(tmpl)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      isSelected ? 'bg-[#E8F5E9] text-[#0F4C3A]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FileCode className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tmpl.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Editor */}
          {selectedTemplate && (
            <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
              <div className="flex justify-between items-center border-b pb-3 mb-4 flex-wrap gap-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Template Editor: {selectedTemplate.name}
                </h3>
                <div className="text-[10px] text-slate-400">
                  Last updated: {formatDateIndian(selectedTemplate.updatedAt)}
                </div>
              </div>

              <form onSubmit={handleSaveEmailTemplate} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Body Text</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 min-h-[220px] font-mono leading-relaxed focus:bg-white"
                    required
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Available Dynamic Variables</span>
                  <code className="text-xs text-[#0F4C3A] font-mono font-bold">
                    {getTemplateVariables(selectedTemplate.name)}
                  </code>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Email Template
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
