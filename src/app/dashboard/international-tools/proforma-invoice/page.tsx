'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  Printer,
  Download,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  Ship,
  Plane,
  ArrowRight,
  Package,
  Loader2,
  Lock,
  KeyRound,
  Sparkles,
  PenTool,
  Clock,
} from 'lucide-react';
import ProformaInvoiceLivePreviewCard from '@/components/ProformaInvoiceLivePreviewCard';
import DigitalSignatureModal from '@/components/DigitalSignatureModal';
import DigitalSignaturePad from '@/components/DigitalSignaturePad';
import CountryAutocompleteInput from '@/components/CountryAutocompleteInput';
import LocationAutocompleteInput from '@/components/LocationAutocompleteInput';
import HsnRowSuggestInput from '@/components/HsnRowSuggestInput';
import GoodsDescriptionRowInput from '@/components/GoodsDescriptionRowInput';
import CountryCallingCodeSelect from '@/components/CountryCallingCodeSelect';
import ValidatedEmailInput from '@/components/ValidatedEmailInput';
import IndianDatePicker from '@/components/IndianDatePicker';
import { validateEmail } from '@/utils/emailValidation';
import ConsigneeOtpVerificationModal from '@/components/ConsigneeOtpVerificationModal';
import {
  ProformaInvoiceInput,
  ProformaInvoiceRecord,
  ProformaInvoiceItem,
  initialProformaInvoiceState,
  calculateInvoiceTotals,
  generateProformaInvoiceNumber,
  loadProformaInvoicesFromStorage,
  saveProformaInvoiceToStorage,
  deleteProformaInvoiceFromStorage,
  PROFORMA_RELATIONSHIP_TYPES,
  formatRelationshipDisplay,
  PROFORMA_NAME_TITLES,
  formatNameWithTitle,
} from '@/lib/proformaInvoiceDb';
import { getCountryDialCode } from '@/lib/proformaLocationData';
import { COUNTRIES } from '@/lib/countryCodes';
import {
  downloadProformaInvoicePdf,
  printProformaInvoiceDocument,
} from '@/utils/proformaInvoicePdfExport';

export default function ProformaInvoiceWorkspacePage() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [formData, setFormData] = useState<ProformaInvoiceInput>(initialProformaInvoiceState);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Signature Whiteboard Modal State
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);

  // Consignor Pincode Auto-Detection State
  const [isLookingUpConsignorPincode, setIsLookingUpConsignorPincode] = useState<boolean>(false);
  const [consignorPincodeLookupMessage, setConsignorPincodeLookupMessage] = useState<string | null>(null);

  const pincodeCacheRef = useRef<Record<string, { city: string; state: string }>>({});

  // Non-India Country of Origin memory cache (restores custom selection when unchecking)
  const lastNonIndiaOriginCountryRef = useRef<string>('');

  // Consignee Signature OTP Verification State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [otpContact, setOtpContact] = useState<string>('');
  const [otpMaskedContact, setOtpMaskedContact] = useState<string>('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | undefined>(undefined);
  const [otpCooldownSec, setOtpCooldownSec] = useState<number>(0);
  const [inlineOtpCode, setInlineOtpCode] = useState<string>('');
  const [isVerifyingInlineOtp, setIsVerifyingInlineOtp] = useState<boolean>(false);
  const [inlineOtpError, setInlineOtpError] = useState<string | null>(null);

  // OTP Cooldown Timer countdown
  useEffect(() => {
    if (otpCooldownSec <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldownSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldownSec]);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<ProformaInvoiceRecord[]>([]);
  const [historySearch, setHistorySearch] = useState<string>('');

  // Load history on mount
  useEffect(() => {
    refreshHistory();
  }, []);

  const refreshHistory = () => {
    const records = loadProformaInvoicesFromStorage();
    setHistoryList(records);
  };

  // Update a simple scalar field
  const updateField = (field: keyof ProformaInvoiceInput, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Intelligent Consignor PIN code detection (Auto City & State)
  const handleConsignorPincodeChange = async (val: string) => {
    const cleanPin = val.replace(/\D/g, '').slice(0, 6);
    updateField('consignorPincode', cleanPin);
    setConsignorPincodeLookupMessage(null);

    // Only trigger lookup after all 6 digits have been entered
    if (cleanPin.length === 6) {
      if (pincodeCacheRef.current[cleanPin]) {
        const cached = pincodeCacheRef.current[cleanPin];
        setFormData((prev) => ({
          ...prev,
          consignorPincode: cleanPin,
          consignorCity: cached.city || prev.consignorCity,
          consignorState: cached.state || prev.consignorState,
          consignorCountry: prev.consignorCountry || 'India',
        }));
        setConsignorPincodeLookupMessage(`✓ Detected: ${cached.city}, ${cached.state}`);
        return;
      }

      try {
        setIsLookingUpConsignorPincode(true);
        const res = await fetch(`/api/pincode/${cleanPin}`);
        const data = await res.json();

        if (res.ok && data.info) {
          const detectedCity = data.info.city || data.info.district || '';
          const detectedState = data.info.state || '';

          pincodeCacheRef.current[cleanPin] = {
            city: detectedCity,
            state: detectedState,
          };

          setFormData((prev) => ({
            ...prev,
            consignorPincode: cleanPin,
            consignorCity: detectedCity || prev.consignorCity,
            consignorState: detectedState || prev.consignorState,
            consignorCountry: prev.consignorCountry || 'India',
          }));
          setConsignorPincodeLookupMessage(`✓ Detected: ${detectedCity}, ${detectedState}`);
        } else {
          setConsignorPincodeLookupMessage(data.error || 'PIN code not found in Indian directory.');
        }
      } catch (err) {
        console.warn('Consignor pincode lookup failed:', err);
        setConsignorPincodeLookupMessage('PIN code lookup unavailable. Please enter City and State manually.');
      } finally {
        setIsLookingUpConsignorPincode(false);
      }
    }
  };

  // Automatic Consignee Country Phone Code Identification
  const handleConsigneeCountryChange = (countryName: string) => {
    const dialCode = getCountryDialCode(countryName);
    setFormData((prev) => ({
      ...prev,
      consigneeCountry: countryName,
      consigneeCountryCode: dialCode,
    }));
  };

  // Toggle Default Country of Origin (India Checkbox)
  const handleToggleDefaultOriginIndia = (checked: boolean) => {
    if (checked) {
      if (formData.countryOfOrigin && formData.countryOfOrigin.toLowerCase() !== 'india') {
        lastNonIndiaOriginCountryRef.current = formData.countryOfOrigin;
      }
      setFormData((prev) => ({
        ...prev,
        defaultOriginIndia: true,
        countryOfOrigin: 'India',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        defaultOriginIndia: false,
        countryOfOrigin: lastNonIndiaOriginCountryRef.current || '',
      }));
    }
  };

  // Consignee Authorized Signature OTP Workflow
  const handleInitiateOtpVerification = async () => {
    const rawContact = (formData.consigneeContact || '').trim();
    const contact = rawContact
      ? (formData.consigneeCountryCode && !rawContact.startsWith('+')
          ? `${formData.consigneeCountryCode} ${rawContact}`
          : rawContact)
      : (formData.consigneeEmail || '').trim();

    if (!contact || contact.length < 5) {
      setErrorMessage('Please enter Consignee Contact Number or Email in Section 3 first.');
      return;
    }

    try {
      setIsSendingOtp(true);
      setErrorMessage(null);
      setInlineOtpError(null);

      const res = await fetch('/api/organization/proforma-invoices/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP verification code.');
      }

      setOtpContact(contact);
      setOtpMaskedContact(data.maskedContact || contact);
      setOtpExpiresAt(data.expiresAt);
      setOtpCooldownSec(data.cooldownSeconds || 30);
      updateField('signatureStatus', 'OTP_SENT');
      setIsOtpModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpVerifiedSuccess = (verifiedContact: string, verifiedAt: string) => {
    setFormData((prev) => ({
      ...prev,
      signatureStatus: 'VERIFIED',
      signatureVerifiedAt: verifiedAt,
      signatureVerifiedContact: verifiedContact,
    }));
    setSaveSuccessMessage('Digital signature verified successfully!');
  };

  const handleSignatureChange = (sig: string) => {
    setFormData((prev) => ({
      ...prev,
      signatureBase64: sig,
      // If signature is changed or cleared after verification, invalidate verification status!
      signatureStatus: sig ? (prev.signatureVerificationMethod === 'DIRECT' ? 'SIGNED' : 'SIGNED') : 'PENDING',
      signatureVerifiedAt: '',
      signatureVerifiedContact: '',
    }));
  };

  const handleVerifyInlineOtp = async () => {
    const code = inlineOtpCode.trim();
    if (code.length !== 6) {
      setInlineOtpError('Please enter the 6-digit verification code.');
      return;
    }
    const rawContact = (formData.consigneeContact || '').trim();
    const contact = rawContact
      ? (formData.consigneeCountryCode && !rawContact.startsWith('+')
          ? `${formData.consigneeCountryCode} ${rawContact}`
          : rawContact)
      : (formData.consigneeEmail || '').trim();

    try {
      setIsVerifyingInlineOtp(true);
      setInlineOtpError(null);

      const res = await fetch('/api/organization/proforma-invoices/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please check the code.');
      }

      handleOtpVerifiedSuccess(data.verifiedContact || contact, data.verifiedAt || new Date().toISOString());
      setInlineOtpCode('');
      setInlineOtpError(null);
    } catch (err: any) {
      setInlineOtpError(err.message || 'Invalid verification code.');
    } finally {
      setIsVerifyingInlineOtp(false);
    }
  };

  // Update goods row and recalculate totals automatically
  const updateItemRow = (index: number, key: keyof ProformaInvoiceItem, value: any) => {
    const updated = [...formData.items];
    const currentRow = { ...updated[index], [key]: value };

    // Recompute row value
    const q = key === 'quantity' ? (value === '' ? '' : parseFloat(value) || 0) : (currentRow.quantity === '' ? 0 : parseFloat(String(currentRow.quantity)) || 0);
    const r = key === 'rate' ? (value === '' ? '' : parseFloat(value) || 0) : (currentRow.rate === '' ? 0 : parseFloat(String(currentRow.rate)) || 0);
    const computedVal = typeof q === 'number' && typeof r === 'number' ? Math.round(q * r * 100) / 100 : 0;
    currentRow.valueInr = computedVal;

    updated[index] = currentRow;
    const totals = calculateInvoiceTotals(updated);

    setFormData((prev) => ({
      ...prev,
      items: totals.items,
      totalValue: totals.totalValue,
      valueInWords: totals.valueInWords,
    }));
  };

  // Add new goods row
  const handleAddRow = () => {
    const newRow: ProformaInvoiceItem = {
      id: `item-${Date.now()}`,
      sNo: formData.items.length + 1,
      description: '',
      hsnCode: '',
      quantity: '',
      rate: '',
      valueInr: 0,
    };
    const updated = [...formData.items, newRow];
    const totals = calculateInvoiceTotals(updated);
    setFormData((prev) => ({
      ...prev,
      items: totals.items,
      totalValue: totals.totalValue,
      valueInWords: totals.valueInWords,
    }));
  };

  // Remove goods row (keep at least 1 row)
  const handleRemoveRow = (index: number) => {
    if (formData.items.length <= 1) return;
    const updated = formData.items.filter((_, i) => i !== index);
    const totals = calculateInvoiceTotals(updated);
    setFormData((prev) => ({
      ...prev,
      items: totals.items,
      totalValue: totals.totalValue,
      valueInWords: totals.valueInWords,
    }));
  };

  // Auto-generate fresh invoice number
  const handleRegenerateInvoiceNo = () => {
    updateField('invoiceNumber', generateProformaInvoiceNumber());
  };

  // Reset form
  const handleResetForm = () => {
    setFormData({
      ...initialProformaInvoiceState,
      invoiceNumber: generateProformaInvoiceNumber(),
    });
    setEditingRecordId(null);
    setSaveSuccessMessage(null);
    setErrorMessage(null);
  };

  // Save Proforma Invoice
  const handleSaveInvoice = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      // Validate mandatory fields
      if (!formData.consignorName.trim()) {
        setErrorMessage('Consignor Name is required.');
        setIsSaving(false);
        return;
      }
      if (!formData.consigneeName.trim()) {
        setErrorMessage('Consignee Name is required.');
        setIsSaving(false);
        return;
      }

      // Validate Consignor Email if entered
      if (formData.consignorEmail?.trim()) {
        const cRes = validateEmail(formData.consignorEmail, { fieldName: 'Consignor E - Mail ID' });
        if (!cRes.isValid) {
          setErrorMessage(cRes.errorMessage || 'Please enter a valid Consignor E - Mail ID.');
          setIsSaving(false);
          return;
        }
      }

      // Validate Consignee Email if entered
      if (formData.consigneeEmail?.trim()) {
        const cRes = validateEmail(formData.consigneeEmail, { fieldName: 'Consignee E - Mail ID' });
        if (!cRes.isValid) {
          setErrorMessage(cRes.errorMessage || 'Please enter a valid Consignee E - Mail ID.');
          setIsSaving(false);
          return;
        }
      }

      // 1. Save to local storage
      const savedRecord = saveProformaInvoiceToStorage({
        ...formData,
        id: editingRecordId || undefined,
      });

      // 2. Also attempt API save in background for organization sync
      try {
        await fetch('/api/organization/proforma-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedRecord),
        });
      } catch (apiErr) {
        console.warn('API sync bypassed, saved locally:', apiErr);
      }

      setEditingRecordId(savedRecord.id);
      refreshHistory();
      setSaveSuccessMessage(`Proforma Invoice ${savedRecord.invoiceNumber} saved successfully!`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Save failed:', err);
      setErrorMessage('Failed to save proforma invoice. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load record from history for editing
  const handleLoadRecord = (record: ProformaInvoiceRecord) => {
    setFormData(record);
    setEditingRecordId(record.id);
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete record from history
  const handleDeleteRecord = (id: string) => {
    if (confirm('Are you sure you want to delete this Proforma Invoice record?')) {
      deleteProformaInvoiceFromStorage(id);
      refreshHistory();
      if (editingRecordId === id) {
        handleResetForm();
      }
    }
  };

  // Filtered history list
  const filteredHistory = historyList.filter((item) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      (item.invoiceNumber || '').toLowerCase().includes(q) ||
      (item.consignorName || '').toLowerCase().includes(q) ||
      (item.consigneeName || '').toLowerCase().includes(q) ||
      (item.countryOfFinalDestination || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 w-full mx-auto pb-16">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/international-tools"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>International Tools</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Proforma Invoice
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#0F4C3A]" />
            <span>PROFORMA INVOICE CREATION WORKSPACE</span>
          </h1>
          <p className="text-xs text-slate-500">
            Generate compliant cross-border commercial proforma invoices with instant live A4 synchronization.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Create &amp; Edit Invoice
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              refreshHistory();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <span>Invoice History</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
              {historyList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Save Success / Error Alerts */}
      {saveSuccessMessage && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: CREATE & EDIT PROFORMA INVOICE WORKSPACE */}
      {/* ============================================================== */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-[55%_45%] 2xl:grid-cols-[54%_46%] gap-6 items-start">
          {/* LEFT SIDE: ENTRY FORM (Balanced ~55% width on desktop) */}
          <div className="w-full space-y-6">
            {/* SECTION A: Invoice Meta Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-800">
                    Invoice Header &amp; Metadata
                  </h3>
                </div>
                {editingRecordId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Editing Saved Invoice
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Invoice Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => updateField('invoiceNumber', e.target.value)}
                      placeholder="e.g. 1516"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleRegenerateInvoiceNo}
                      title="Generate new invoice number"
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Invoice Date <span className="text-rose-500">*</span>
                  </label>
                  <IndianDatePicker
                    value={formData.invoiceDate}
                    onChange={(val) => updateField('invoiceDate', val)}
                    placeholder="DD.MM.YYYY e.g. 29.03.2025"
                  />
                </div>
              </div>
            </div>

            {/* SECTION B: Consignor Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-800">
                    Consignor Details (Shipper / Exporter)
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* Consignor Name & Relationship Row (Arranged side by side in the same row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Consignor Name with Title Selection Dropdown (-25% dropdown width) */}
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      Consignor Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-[108px] sm:w-[132px] shrink-0">
                        <select
                          value={formData.consignorTitle || ''}
                          onChange={(e) => updateField('consignorTitle', e.target.value)}
                          className="w-full px-2.5 py-2 h-10 rounded-xl border border-slate-300 font-semibold text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="">Select Title</option>
                          {PROFORMA_NAME_TITLES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={formData.consignorName}
                          onChange={(e) => updateField('consignorName', e.target.value)}
                          placeholder="Company or Exporter Legal Name"
                          className="w-full px-3 py-2 h-10 rounded-xl border border-slate-300 font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consignor Relationship Selection & Name Entry (-25% dropdown width) */}
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      Relationship <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-[108px] sm:w-[132px] shrink-0">
                        <select
                          value={formData.consignorRelationshipType || ''}
                          onChange={(e) => updateField('consignorRelationshipType', e.target.value)}
                          className="w-full px-2.5 py-2 h-10 rounded-xl border border-slate-300 font-semibold text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="">Select Relationship</option>
                          {PROFORMA_RELATIONSHIP_TYPES.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={formData.consignorRelationshipName || ''}
                          onChange={(e) => updateField('consignorRelationshipName', e.target.value)}
                          placeholder="Enter father's / mother's / guardian's name"
                          className="w-full px-3 py-2 h-10 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">Address</label>
                  <input
                    type="text"
                    value={formData.consignorAddress}
                    onChange={(e) => updateField('consignorAddress', e.target.value)}
                    placeholder="Street, Industrial Area, Building No."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Consignor Address Grid: PINCODE -> CITY -> STATE -> COUNTRY */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[15px] font-bold text-slate-800">
                        1. PIN Code <span className="text-[10px] text-slate-400 font-normal">(6-digit)</span>
                      </label>
                      {isLookingUpConsignorPincode && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                          <span>Detecting...</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.consignorPincode}
                      onChange={(e) => handleConsignorPincodeChange(e.target.value)}
                      placeholder="e.g. 400001"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {consignorPincodeLookupMessage && (
                      <p className={`text-[10px] font-semibold mt-1 truncate ${consignorPincodeLookupMessage.startsWith('✓') ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {consignorPincodeLookupMessage}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      2. City / District
                    </label>
                    <input
                      type="text"
                      value={formData.consignorCity}
                      onChange={(e) => updateField('consignorCity', e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      3. State
                    </label>
                    <input
                      type="text"
                      value={formData.consignorState}
                      onChange={(e) => updateField('consignorState', e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      4. Country
                    </label>
                    <input
                      type="text"
                      value={formData.consignorCountry}
                      onChange={(e) => updateField('consignorCountry', e.target.value)}
                      placeholder="India"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      Consignor Contact Number
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Field 1: COUNTRY CALLING CODE */}
                      <div className="w-28 sm:w-32 shrink-0">
                        <CountryCallingCodeSelect
                          value={formData.consignorCountryCode || '+91'}
                          onChange={(dialCode) => updateField('consignorCountryCode', dialCode)}
                        />
                      </div>

                      {/* Field 2: ACTUAL MOBILE NUMBER */}
                      <div className="flex-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={15}
                          value={formData.consignorContact}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            const isIndia = (formData.consignorCountryCode || '+91') === '+91';
                            const clean = isIndia ? digitsOnly.slice(0, 10) : digitsOnly.slice(0, 15);
                            updateField('consignorContact', clean);
                          }}
                          placeholder={
                            (formData.consignorCountryCode || '+91') === '+91'
                              ? 'e.g. 9876543210'
                              : 'Mobile number'
                          }
                          className="w-full px-3 py-2 h-10 rounded-xl border border-slate-300 font-mono font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      E - Mail ID
                    </label>
                    <ValidatedEmailInput
                      value={formData.consignorEmail}
                      onChange={(val) => updateField('consignorEmail', val)}
                      placeholder="exporter@example.com"
                      fieldName="Consignor E - Mail ID"
                      required={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION C: Consignee Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-800">
                    Consignee Details (Buyer / Importer)
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* Consignee Name & Relationship Row (Arranged side by side in the same row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Consignee Name with Title Selection Dropdown (-25% dropdown width) */}
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      Consignee Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-[108px] sm:w-[132px] shrink-0">
                        <select
                          value={formData.consigneeTitle || ''}
                          onChange={(e) => updateField('consigneeTitle', e.target.value)}
                          className="w-full px-2.5 py-2 h-10 rounded-xl border border-slate-300 font-semibold text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="">Select Title</option>
                          {PROFORMA_NAME_TITLES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={formData.consigneeName}
                          onChange={(e) => updateField('consigneeName', e.target.value)}
                          placeholder="Recipient Company or Person Name"
                          className="w-full px-3 py-2 h-10 rounded-xl border border-slate-300 font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consignee Relationship Selection & Name Entry (-25% dropdown width) */}
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      Relationship <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-[108px] sm:w-[132px] shrink-0">
                        <select
                          value={formData.consigneeRelationshipType || ''}
                          onChange={(e) => updateField('consigneeRelationshipType', e.target.value)}
                          className="w-full px-2.5 py-2 h-10 rounded-xl border border-slate-300 font-semibold text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="">Select Relationship</option>
                          {PROFORMA_RELATIONSHIP_TYPES.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={formData.consigneeRelationshipName || ''}
                          onChange={(e) => updateField('consigneeRelationshipName', e.target.value)}
                          placeholder="Enter father's / mother's / guardian's name"
                          className="w-full px-3 py-2 h-10 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">Address</label>
                  <input
                    type="text"
                    value={formData.consigneeAddress}
                    onChange={(e) => updateField('consigneeAddress', e.target.value)}
                    placeholder="Overseas Street Address, Unit / Suite"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Consignee Address Grid: PIN CODE / ZIP CODE -> CITY -> STATE -> COUNTRY */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      1. PIN Code / ZIP Code
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={formData.consigneePincode}
                      onChange={(e) => updateField('consigneePincode', e.target.value)}
                      placeholder="e.g. 560001 or 90210"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      2. City / District
                    </label>
                    <input
                      type="text"
                      value={formData.consigneeCity}
                      onChange={(e) => updateField('consigneeCity', e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      3. State / Province
                    </label>
                    <input
                      type="text"
                      value={formData.consigneeState}
                      onChange={(e) => updateField('consigneeState', e.target.value)}
                      placeholder="e.g. Karnataka"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      4. Country
                    </label>
                    <CountryAutocompleteInput
                      value={formData.consigneeCountry}
                      onChange={(val) => handleConsigneeCountryChange(val)}
                      placeholder="Type country e.g. United Kingdom, India, UAE"
                    />
                  </div>
                </div>

                {/* Consignee Contact Number: Field 1 (Country Code) & Field 2 (Contact Number) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      Consignee Contact Number
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Field 1: COUNTRY CALLING CODE */}
                      <div className="w-28 sm:w-32 shrink-0">
                        <CountryCallingCodeSelect
                          value={formData.consigneeCountryCode || '+91'}
                          onChange={(dialCode) => updateField('consigneeCountryCode', dialCode)}
                        />
                      </div>

                      {/* Field 2: ACTUAL CONTACT NUMBER */}
                      <div className="flex-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={15}
                          value={formData.consigneeContact}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            const isIndia = (formData.consigneeCountryCode || '+91') === '+91';
                            const clean = isIndia ? digitsOnly.slice(0, 10) : digitsOnly.slice(0, 15);
                            updateField('consigneeContact', clean);
                          }}
                          placeholder={
                            (formData.consigneeCountryCode || '+91') === '+91'
                              ? 'e.g. 9876543210'
                              : 'Mobile number'
                          }
                          className="w-full px-3 py-2 h-10 rounded-xl border border-slate-300 font-mono font-semibold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Calling code automatically syncs when country is selected, or can be chosen from the dropdown.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      E - Mail ID
                    </label>
                    <ValidatedEmailInput
                      value={formData.consigneeEmail}
                      onChange={(val) => updateField('consigneeEmail', val)}
                      placeholder="importer@example.com"
                      fieldName="Consignee E - Mail ID"
                      required={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION D: KYC Details & Country Routing */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-wide text-slate-800">
                    KYC Details &amp; Country Routing
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* KYC Type & Number */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">KYC Identification Type</label>
                    <select
                      value={formData.kycType}
                      onChange={(e) => updateField('kycType', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-900"
                    >
                      <option value="AADHAAR NO">AADHAAR NO (Default)</option>
                      <option value="PASSPORT NO">PASSPORT NO</option>
                      <option value="PAN NO">PAN NO</option>
                      <option value="IEC NO">IEC NO (Import Export Code)</option>
                      <option value="KYC ID">KYC IDENTIFICATION ID</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[15px] font-bold text-slate-800">KYC Number</label>
                      <button
                        type="button"
                        onClick={() => updateField('kycMasked', !formData.kycMasked)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        {formData.kycMasked ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Show Full
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Mask Sensitive
                          </>
                        )}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.kycNumber}
                      onChange={(e) => updateField('kycNumber', e.target.value)}
                      placeholder="e.g. 6566 1068 9680"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* Country Routing */}
                <div className="space-y-3">
                  {/* Country of Origin with India Default Checkbox */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-[15px] font-bold text-slate-800">
                        Country of Origin of Goods
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.defaultOriginIndia ?? true}
                          onChange={(e) => handleToggleDefaultOriginIndia(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Set India as Default Country of Origin</span>
                      </label>
                    </div>

                    {formData.defaultOriginIndia ? (
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value="India"
                          readOnly
                          disabled
                          className="w-full pl-3 pr-24 py-2 rounded-xl border border-emerald-300 bg-emerald-50/60 font-bold text-xs text-emerald-950 cursor-not-allowed select-none"
                        />
                        <div className="absolute right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                          <Lock className="w-3 h-3 text-emerald-700" />
                          <span>INDIA (DEFAULT)</span>
                        </div>
                      </div>
                    ) : (
                      <CountryAutocompleteInput
                        value={formData.countryOfOrigin}
                        onChange={(val) => {
                          lastNonIndiaOriginCountryRef.current = val;
                          updateField('countryOfOrigin', val);
                        }}
                        placeholder="Type origin country e.g. United States, Germany, Japan"
                      />
                    )}
                  </div>

                  {/* Country of Final Destination (Remains Independent) */}
                  <div>
                    <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                      Country of Final Destination
                    </label>
                    <CountryAutocompleteInput
                      value={formData.countryOfFinalDestination}
                      onChange={(val) => updateField('countryOfFinalDestination', val)}
                      placeholder="Type destination country e.g. United Kingdom, UAE, USA"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION E: Shipment & Transportation Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-wide text-slate-800">
                    Shipment &amp; Transportation Details
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Pre Carriage by
                  </label>
                  <input
                    type="text"
                    value={formData.preCarriageBy}
                    onChange={(e) => updateField('preCarriageBy', e.target.value)}
                    placeholder="e.g. Road Transport / Container"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-[15px] font-bold text-slate-800">
                      Place of Receipt by Pre-carrier
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-800 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.defaultPlaceOfReceiptIndia ?? true}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            defaultPlaceOfReceiptIndia: isChecked,
                            placeOfReceiptByPreCarrier: isChecked
                              ? 'India'
                              : prev.placeOfReceiptByPreCarrier === 'India'
                                ? ''
                                : prev.placeOfReceiptByPreCarrier,
                          }));
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Set India as Default Country</span>
                    </label>
                  </div>

                  {formData.defaultPlaceOfReceiptIndia ? (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value="India"
                        readOnly
                        className="w-full pl-3 pr-8 py-2 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900 bg-emerald-50/50 cursor-default select-none focus:outline-none"
                      />
                      <span className="absolute right-2.5 text-sm leading-none pointer-events-none">
                        🇮🇳
                      </span>
                    </div>
                  ) : (
                    <CountryAutocompleteInput
                      value={formData.placeOfReceiptByPreCarrier}
                      onChange={(val) => updateField('placeOfReceiptByPreCarrier', val)}
                      placeholder="Search or select country (e.g. United Kingdom, UAE, USA)"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Vessel / Flight No
                  </label>
                  <input
                    type="text"
                    value={formData.vesselFlightNo}
                    onChange={(e) => updateField('vesselFlightNo', e.target.value)}
                    placeholder="e.g. AI-191 / CMA CGM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Port of Loading
                  </label>
                  <input
                    type="text"
                    value={formData.portOfLoading}
                    onChange={(e) => updateField('portOfLoading', e.target.value)}
                    placeholder="e.g. Mumbai Air Cargo (BOM)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Port of Discharge
                  </label>
                  <input
                    type="text"
                    value={formData.portOfDischarge}
                    onChange={(e) => updateField('portOfDischarge', e.target.value)}
                    placeholder="e.g. Dubai Cargo (DXB)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                    Final Destination
                  </label>
                  <CountryAutocompleteInput
                    value={formData.finalDestination}
                    onChange={(val) => updateField('finalDestination', val)}
                    placeholder="Search destination country (e.g. United Kingdom, UAE, USA)"
                  />
                </div>
              </div>
            </div>

            {/* SECTION F: Goods Description Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    6
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-wide text-slate-800">
                    Goods Description &amp; Valuation Table
                  </h3>
                </div>
              </div>

              {/* Items Table Input Editor */}
              <div className="space-y-2.5 overflow-x-auto">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[13px] font-black text-slate-800 uppercase tracking-wider">
                      <th className="py-2.5 px-2 w-10 text-center">#</th>
                      <th className="py-2.5 px-2 min-w-[220px]">Description of Goods</th>
                      <th className="py-2.5 px-2 w-36 sm:w-40">HSN Code</th>
                      <th className="py-2.5 px-2 w-24 sm:w-28 text-center">QTY</th>
                      <th className="py-2.5 px-2 w-28 sm:w-32 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 w-28 sm:w-32 text-right">Value INR</th>
                      <th className="py-2.5 px-1 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2 min-w-[220px]">
                          <GoodsDescriptionRowInput
                            value={row.description}
                            rowIndex={idx}
                            currentHsnCode={row.hsnCode}
                            onChange={(desc) => updateItemRow(idx, 'description', desc)}
                            onSelectHsn={(code) => updateItemRow(idx, 'hsnCode', code)}
                            placeholder={`Enter item ${idx + 1} (e.g. Cotton T-shirt, Books, Mobile Phone)`}
                          />
                        </td>
                        <td className="py-2.5 px-2 w-36 sm:w-40">
                          <HsnRowSuggestInput
                            value={row.hsnCode}
                            description={row.description}
                            onChange={(code) => updateItemRow(idx, 'hsnCode', code)}
                            onDescriptionAssist={(catTitle) => {
                              if (!row.description || row.description.trim() === '') {
                                updateItemRow(idx, 'description', catTitle);
                              }
                            }}
                            placeholder="HSN / Product"
                            openUpward={idx >= formData.items.length - 2 && formData.items.length >= 3}
                          />
                        </td>
                        <td className="py-2.5 px-2 w-24 sm:w-28">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={row.quantity}
                            onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-mono text-xs font-semibold text-center text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2.5 px-2 w-28 sm:w-32">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={row.rate}
                            onChange={(e) => updateItemRow(idx, 'rate', e.target.value)}
                            placeholder="Rate (₹)"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-mono text-xs font-semibold text-right text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2.5 px-2 w-28 sm:w-32 text-right font-mono font-bold text-xs text-slate-900">
                          {row.valueInr ? row.valueInr.toLocaleString('en-IN') : '0'}
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={formData.items.length <= 1}
                            title="Remove Row"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 disabled:opacity-20 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* + ADD GOODS ROW Button - Positioned Directly Below the Last Goods Entry Row */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-xs font-black transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>+ ADD GOODS ROW</span>
                </button>
              </div>

              {/* Live Totals & Amount in Words Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[15px] uppercase tracking-wide text-slate-800">
                    Total Invoice Value:
                  </span>
                  <span className="font-mono font-black text-base text-[#0F4C3A]">
                    ₹{formData.totalValue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-[13px] font-bold text-slate-700 leading-tight">
                  <span className="text-slate-800 font-bold uppercase tracking-wide text-[13px] block mb-0.5">
                    Value in Words:
                  </span>
                  <span className="text-slate-900 font-mono">{formData.valueInWords}</span>
                </div>
              </div>
            </div>

            {/* SECTION G: Consignee Authorized Digital Signature & OTP Verification */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    7
                  </div>
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wide text-slate-800">
                      Consignee Authorized Digital Signature &amp; OTP Verification
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Multi-factor authentication (MFA) ensures legal cross-border invoice verification.
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {formData.signatureStatus === 'VERIFIED' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Signature Verified ✓</span>
                    </span>
                  ) : formData.signatureVerificationMethod === 'DIRECT' ? (
                    formData.signatureBase64 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Digital Signature Saved</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                        <PenTool className="w-3.5 h-3.5 text-blue-600" />
                        <span>Direct Signing Mode</span>
                      </span>
                    )
                  ) : formData.signatureStatus === 'SIGNED' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                      <PenTool className="w-3.5 h-3.5 text-amber-600" />
                      <span>Signature Saved (Pending OTP Verification)</span>
                    </span>
                  ) : formData.signatureStatus === 'OTP_SENT' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      <span>OTP Sent (Pending Verification)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Pending Signature &amp; OTP</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">Declaration Statement</label>
                <textarea
                  rows={2}
                  value={formData.declarationText}
                  onChange={(e) => updateField('declarationText', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Mutually Exclusive Signature Verification Method Options */}
              <div className="space-y-2">
                <label className="block text-[15px] font-bold text-slate-800 mb-1.5">
                  Choose Signature Verification Method:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      formData.signatureVerificationMethod !== 'DIRECT'
                        ? 'bg-emerald-50/50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="signatureVerificationMethod"
                      checked={formData.signatureVerificationMethod !== 'DIRECT'}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          signatureVerificationMethod: 'OTP',
                          signatureStatus: prev.signatureVerifiedAt ? 'VERIFIED' : (prev.signatureBase64 ? 'SIGNED' : 'PENDING'),
                        }));
                      }}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-slate-900">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Sign &amp; Verify via OTP (Recommended)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Draw digital signature first, then send OTP to authenticated consignee contact to verify.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      formData.signatureVerificationMethod === 'DIRECT'
                        ? 'bg-blue-50/50 border-blue-500 shadow-xs ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="signatureVerificationMethod"
                      checked={formData.signatureVerificationMethod === 'DIRECT'}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          signatureVerificationMethod: 'DIRECT',
                          signatureStatus: prev.signatureBase64 ? 'SIGNED' : 'PENDING',
                        }));
                      }}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-slate-900">
                        <PenTool className="w-3.5 h-3.5 text-blue-600" />
                        <span>Proceed with Digital Signature Only</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Direct whiteboard signature. Bypasses OTP code and allows signing immediately on canvas.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {formData.signatureVerificationMethod === 'DIRECT' ? (
                /* DIRECT SIGNING MODE */
                <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[15px] font-bold text-slate-800">
                        <PenTool className="w-4 h-4 text-blue-700" />
                        <span>Direct Digital Signature Mode:</span>
                        <span className="text-blue-900 font-bold">Whiteboard Signing Active</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        OTP verification requirement bypassed. Draw signature directly using the canvas below or click to open whiteboard.
                      </p>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setIsSignModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>{formData.signatureBase64 ? 'Re-draw Signature' : 'Open Whiteboard to Sign'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <DigitalSignaturePad
                      title="CONSIGNEE AUTHORIZED SIGNATURE & DATE"
                      value={formData.signatureBase64 || ''}
                      onChange={handleSignatureChange}
                    />
                  </div>
                </div>
              ) : (
                /* OTP VERIFICATION WORKFLOW: STEP 1 (SIGNATURE) -> STEP 2 (SEND OTP) -> STEP 3 (CONFIRMATION) */
                <div className="space-y-4">
                  {/* STEP 1 - DIGITAL SIGNATURE (FIRST POSITION) */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                            1
                          </span>
                          <span className="text-[15px] font-black uppercase tracking-wide text-slate-800">
                            Step 1 – Digital Signature (Draw &amp; Save)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-7">
                          Draw your digital signature below. Saving records the signature, but identity must still be confirmed via OTP.
                        </p>
                      </div>

                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsSignModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>{formData.signatureBase64 ? 'Re-draw on Whiteboard' : 'Open Whiteboard to Sign'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <DigitalSignaturePad
                        title="CONSIGNEE AUTHORIZED SIGNATURE & DATE"
                        value={formData.signatureBase64 || ''}
                        onChange={handleSignatureChange}
                      />
                    </div>
                  </div>

                  {/* STEP 2 - SEND OTP & VERIFY */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    formData.signatureStatus === 'VERIFIED'
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : formData.signatureBase64
                        ? 'bg-white border-slate-300 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-80'
                  }`}>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 ${
                              formData.signatureStatus === 'VERIFIED'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-white'
                            }`}>
                              2
                            </span>
                            <span className="text-[15px] font-black uppercase tracking-wide text-slate-800">
                              Step 2 – Consignee OTP Verification
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 pl-7">
                            Destination:{' '}
                            <span className="font-mono font-bold text-slate-800">
                              {formData.consigneeContact
                                ? `${formData.consigneeCountryCode && !formData.consigneeContact.startsWith('+') ? `${formData.consigneeCountryCode} ` : ''}${formData.consigneeContact}`
                                : formData.consigneeEmail || 'Please specify consignee contact or email in Section 3'}
                            </span>
                          </p>
                        </div>

                        {/* Send OTP button or status */}
                        {formData.signatureStatus !== 'VERIFIED' && (
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={handleInitiateOtpVerification}
                              disabled={
                                !formData.signatureBase64 ||
                                isSendingOtp ||
                                (!formData.consigneeContact && !formData.consigneeEmail) ||
                                otpCooldownSec > 0
                              }
                              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0F4C3A] hover:bg-[#155d47] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isSendingOtp ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Sending OTP...</span>
                                </>
                              ) : otpCooldownSec > 0 ? (
                                <>
                                  <Clock className="w-4 h-4" />
                                  <span>Resend OTP ({otpCooldownSec}s)</span>
                                </>
                              ) : (
                                <>
                                  <KeyRound className="w-4 h-4" />
                                  <span>{formData.signatureStatus === 'OTP_SENT' ? 'Resend OTP' : 'Send OTP'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Case A: Signature not drawn yet notice */}
                      {!formData.signatureBase64 && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Please draw and save your digital signature in Step 1 first to unlock OTP verification.</span>
                        </div>
                      )}

                      {/* Case B: Signature saved, OTP requested or ready to verify */}
                      {formData.signatureBase64 && formData.signatureStatus !== 'VERIFIED' && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <span className="text-[15px] font-bold text-slate-800">
                                Enter 6-Digit OTP Received:
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Enter the verification code sent to {otpMaskedContact || 'the registered contact'} (expires in 5 minutes).
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsOtpModalOpen(true)}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer text-left sm:text-right"
                            >
                              Open OTP Modal Window
                            </button>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={inlineOtpCode}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setInlineOtpCode(digits);
                                setInlineOtpError(null);
                              }}
                              placeholder="Enter 6-digit OTP"
                              className="px-4 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-center text-sm tracking-widest text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-56"
                            />

                            <button
                              type="button"
                              onClick={handleVerifyInlineOtp}
                              disabled={isVerifyingInlineOtp || inlineOtpCode.length !== 6}
                              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                            >
                              {isVerifyingInlineOtp ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Verifying...</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Verify OTP</span>
                                </>
                              )}
                            </button>
                          </div>

                          {inlineOtpError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{inlineOtpError}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* STEP 3 - SIGNATURE VERIFICATION CONFIRMATION */}
                      {formData.signatureStatus === 'VERIFIED' && (
                        <div className="p-4 rounded-xl bg-emerald-100/70 border border-emerald-300 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                              3
                            </span>
                            <span className="text-xs font-black uppercase tracking-wide text-emerald-950 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-700" />
                              Step 3 – Digital Signature Verified &amp; Authenticated ✓
                            </span>
                          </div>
                          <div className="pl-7 space-y-1 text-xs text-emerald-900">
                            <div>
                              <span className="font-bold">Authenticated Channel:</span>{' '}
                              <span className="font-mono">{formData.signatureVerifiedContact || otpMaskedContact || 'Consignee Contact'}</span>
                            </div>
                            {formData.signatureVerifiedAt && (
                              <div>
                                <span className="font-bold">Verified Timestamp:</span>{' '}
                                <span className="font-mono">{new Date(formData.signatureVerifiedAt).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            <p className="text-[11px] text-emerald-800 pt-1">
                              Note: If this digital signature is re-drawn or modified in Step 1, this verification status will be automatically invalidated, requiring OTP re-verification.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions Footer */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>

              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F4C3A] hover:bg-[#155d47] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save & Record Proforma Invoice'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT SIDE: LIVE PROFORMA INVOICE PREVIEW (Sticky ~45% width on desktop) */}
          <div className="w-full xl:sticky xl:top-6">
            <ProformaInvoiceLivePreviewCard
              data={formData}
              onSave={handleSaveInvoice}
              onSignatureClick={() => setIsSignModalOpen(true)}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PROFORMA INVOICE ARCHIVE & HISTORY */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Saved Proforma Invoices History
              </h2>
              <p className="text-xs text-slate-500">
                View, re-edit, download A4 PDFs, and print previously created proforma invoices.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search invoice no, consignor, consignee..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">No Proforma Invoices Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {historySearch
                  ? 'No invoices match your search query.'
                  : 'You have not created any Proforma Invoices yet. Switch to the Create tab to generate your first invoice.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Invoice</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Consignor</th>
                    <th className="py-3 px-4">Consignee</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredHistory.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-emerald-800">
                        {invoice.invoiceNumber || '1516'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {invoice.invoiceDate || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 truncate max-w-[160px]">
                        {formatNameWithTitle(invoice.consignorTitle, invoice.consignorName) || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 truncate max-w-[160px]">
                        {formatNameWithTitle(invoice.consigneeTitle, invoice.consigneeName) || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {invoice.countryOfFinalDestination || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{(invoice.totalValue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadRecord(invoice)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                            title="Edit Invoice"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => printProformaInvoiceDocument(invoice)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            title="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadProformaInvoicePdf(invoice)}
                            className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(invoice.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Consignee Signature OTP Verification Modal */}
      <ConsigneeOtpVerificationModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        contact={otpContact}
        maskedContact={otpMaskedContact}
        expiresAt={otpExpiresAt}
        onSuccess={handleOtpVerifiedSuccess}
      />

      {/* Signature Whiteboard Modal */}
      <DigitalSignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        initialSignature={formData.signatureBase64}
        title="CONSIGNEE AUTHORIZED SIGNATURE"
        onSave={(sig) => {
          handleSignatureChange(sig);
          setIsSignModalOpen(false);
        }}
      />
    </div>
  );
}

