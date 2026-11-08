'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  FileText,
  PlusCircle,
  History,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  Download,
  Search,
  Eye,
  RotateCcw,
  Calendar,
  Sparkles,
  X,
} from 'lucide-react';
import DigitalSignaturePad from '@/components/DigitalSignaturePad';
import DigitalSignatureModal from '@/components/DigitalSignatureModal';
import DeclarationLivePreviewCard from '@/components/DeclarationLivePreviewCard';
import DeclarationRichTextEditor from '@/components/DeclarationRichTextEditor';
import ReasonForTransportationInput from '@/components/ReasonForTransportationInput';
import GoodsCategoryDropdown from '@/components/GoodsCategoryDropdown';
import HsnCodeAutoSuggest from '@/components/HsnCodeAutoSuggest';
import { convertNumberToIndianWords, formatIndianCurrency } from '@/utils/numberToWords';
import { DeclarationInput, DeclarationRecord } from '@/lib/declarationDb';
import {
  downloadDeclarationPdf,
  printDeclarationDocument,
  isValidDeclarationSignature,
  SIGNATURE_REQUIRED_ERROR_MESSAGE,
  cropSignatureDataUrl,
} from '@/utils/declarationPdfExport';
import DeclarationTemplateSelector, { DeclarationTemplateId } from '@/components/DeclarationTemplateSelector';
import IndianDatePicker from '@/components/IndianDatePicker';
import PersonalDeclarationEditor from '@/components/PersonalDeclarationEditor';
import PersonalDeclarationLivePreviewCard from '@/components/PersonalDeclarationLivePreviewCard';
import {
  PersonalDeclarationInput,
  initialPersonalDeclarationState,
} from '@/lib/personalDeclarationDb';
import {
  downloadPersonalDeclarationPdf,
  printPersonalDeclarationDocument,
  isValidPersonalDeclarationSignature,
  PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE,
  generatePersonalDeclarationHtml,
} from '@/utils/personalDeclarationPdfExport';

interface FormState extends DeclarationInput {
  otpCodeInput: string;
}

const getTodayFormattedDate = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const initialFormState: FormState = {
  consignmentNumber: '',
  consigneeName: '',
  consigneeNameHtml: '',
  receiverAddress: '',
  receiverAddressHtml: '',
  pinCode: '',
  contactNumber: '',
  consignorName: '',
  consignorNameHtml: '',
  consignorAddress: '',
  consignorAddressHtml: '',
  isGstRegistered: false,
  gstNumber: '',
  content: '',
  contentHtml: '',
  hsnCode: '',
  reasonForTransportation: '',
  reasonForTransportationHtml: '',
  isCommercial: true,
  valueInr: 0,
  amountInWords: '',
  hasInvoice: true,
  invoiceNumber: '',
  hasChallan: false,
  challanNumber: '',
  signatureBase64: '',
  declarationDate: getTodayFormattedDate(),
  selfAttested: false,
  attestationStatement:
    'The above is true to the best of my knowledge and if found false, I/we will only be responsible for all cost and consequences arising out of this declaration.',
  mobileVerified: false,
  verifiedMobileNumber: '',
  otpVerifiedAt: '',
  otpCodeInput: '',
};

export default function DeclarationsPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [selectedTemplate, setSelectedTemplate] = useState<DeclarationTemplateId>('goods');
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [personalFormData, setPersonalFormData] = useState<PersonalDeclarationInput>(initialPersonalDeclarationState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [highlightSignature, setHighlightSignature] = useState<boolean>(false);
  const [highlightPersonalSignature, setHighlightPersonalSignature] = useState<boolean>(false);
  const [isTemplate1SigModalOpen, setIsTemplate1SigModalOpen] = useState<boolean>(false);
  const [isTemplate2SigModalOpen, setIsTemplate2SigModalOpen] = useState<boolean>(false);

  // Require Consignor signature before Template 1 PDF download/print/generation
  const requireConsignorSignature = () => {
    setErrorMessage(SIGNATURE_REQUIRED_ERROR_MESSAGE);
    setHighlightSignature(true);

    const sigSection = document.getElementById('consignor-signature-section');
    if (sigSection) {
      sigSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightSignature(false);
    }, 4500);

    // Also open the signature whiteboard modal so the user can immediately sign
    setIsTemplate1SigModalOpen(true);
  };

  // Require Customer signature before Template 2 (Personal Goods) PDF download/print/generation
  const requirePersonalSignature = () => {
    setErrorMessage(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
    setHighlightPersonalSignature(true);

    const sigSection = document.getElementById('personal-signature-section');
    if (sigSection) {
      sigSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightPersonalSignature(false);
    }, 4500);

    // Automatically open the signature whiteboard modal so the user can immediately sign
    setIsTemplate2SigModalOpen(true);
  };

  const handleSignatureChange = async (sigData: string) => {
    let finalSig = sigData;
    if (sigData && sigData.startsWith('data:image')) {
      try {
        finalSig = await cropSignatureDataUrl(sigData);
      } catch {
        // Fallback to original
      }
    }
    setFormData((prev) => ({ ...prev, signatureBase64: finalSig }));
    if (finalSig && isValidDeclarationSignature(finalSig)) {
      setHighlightSignature(false);
      setErrorMessage((curr) => (curr === SIGNATURE_REQUIRED_ERROR_MESSAGE ? null : curr));
    }
  };

  // OTP State
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);
  const [otpCooldownSec, setOtpCooldownSec] = useState<number>(0);

  // History State
  const [historyList, setHistoryList] = useState<DeclarationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyPreset, setHistoryPreset] = useState<string>('all');
  const [selectedDeclaration, setSelectedDeclaration] = useState<DeclarationRecord | null>(null);

  // Auto-generate Consignment Number
  const handleGenerateConsignmentNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    setFormData((prev) => ({
      ...prev,
      consignmentNumber: `GT${timestamp}${randomHex}`,
    }));
  };

  // Live Auto-conversion of valueInr -> amountInWords
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const numVal = parseFloat(rawVal);
    if (isNaN(numVal) || numVal < 0) {
      setFormData((prev) => ({
        ...prev,
        valueInr: 0,
        amountInWords: '',
      }));
    } else {
      const words = convertNumberToIndianWords(numVal);
      setFormData((prev) => ({
        ...prev,
        valueInr: numVal,
        amountInWords: words,
      }));
    }
  };

  // Ensure declarationDate defaults dynamically to today's date on mount
  useEffect(() => {
    if (!formData.declarationDate) {
      setFormData((prev) => ({ ...prev, declarationDate: getTodayFormattedDate() }));
    }
  }, []);

  // OTP Cooldown Timer Effect
  useEffect(() => {
    if (otpCooldownSec <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldownSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldownSec]);

  // Send Consignor OTP Handler
  const handleSendOtp = async () => {
    const mobile = (formData.contactNumber || '').trim();
    if (!mobile || mobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit consignor contact mobile number first.');
      return;
    }

    try {
      setIsSendingOtp(true);
      setErrorMessage(null);
      setOtpSentMessage(null);
      setOtpDevHint(null);

      const res = await fetch('/api/organization/declarations/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification OTP.');
      }

      setOtpSentMessage(data.message || `OTP sent to +91 ${mobile}`);
      if (data.simulatedOtp) {
        setOtpDevHint(data.simulatedOtp);
      }
      setOtpCooldownSec(30);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify Consignor OTP Handler
  const handleVerifyOtp = async () => {
    const mobile = (formData.contactNumber || '').trim();
    const code = (formData.otpCodeInput || '').trim();

    if (!mobile) {
      setErrorMessage('Mobile number is required for OTP verification.');
      return;
    }
    if (!code || code.length < 4) {
      setErrorMessage('Please enter the 6-digit OTP code received on mobile.');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setErrorMessage(null);

      const res = await fetch('/api/organization/declarations/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP code.');
      }

      setFormData((prev) => ({
        ...prev,
        mobileVerified: true,
        verifiedMobileNumber: data.verifiedMobile,
        otpVerifiedAt: data.verifiedAt,
      }));

      setSuccessMessage('Consignor mobile number successfully verified via OTP!');
      setOtpDevHint(null);
      setOtpSentMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Form Submission / Save & Record
  const handleSaveDeclaration = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Strict Validations
    if (!formData.consignmentNumber.trim()) {
      setErrorMessage('Consignment Number is required.');
      return;
    }
    if (!formData.consigneeName.trim()) {
      setErrorMessage("Consignee's Name is required.");
      return;
    }
    if (!formData.receiverAddress.trim()) {
      setErrorMessage('Receiver Address is required.');
      return;
    }
    if (!formData.pinCode.trim()) {
      setErrorMessage('PIN Code is required.');
      return;
    }
    if (!formData.contactNumber.trim()) {
      setErrorMessage('Contact Number is required.');
      return;
    }
    if (!formData.consignorName.trim()) {
      setErrorMessage('Consignor Name is required.');
      return;
    }
    if (!formData.consignorAddress.trim()) {
      setErrorMessage('Consignor Address is required.');
      return;
    }
    if (formData.isGstRegistered && !formData.gstNumber?.trim()) {
      setErrorMessage('GST Number is mandatory when GST Registered is Yes.');
      return;
    }
    if (!formData.content.trim()) {
      setErrorMessage('Shipment Content description is required.');
      return;
    }
    if (!formData.reasonForTransportation.trim()) {
      setErrorMessage('Reason for Transportation is required.');
      return;
    }
    if (!formData.valueInr || formData.valueInr <= 0) {
      setErrorMessage('Please enter a valid Consignment Value in INR.');
      return;
    }
    if (!formData.signatureBase64 || !isValidDeclarationSignature(formData.signatureBase64)) {
      requireConsignorSignature();
      return;
    }
    if (!formData.selfAttested) {
      setErrorMessage('You must accept the mandatory self-attestation declaration before saving.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/organization/declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record declaration.');
      }

      setSuccessMessage(
        `Declaration ${data.declaration.declarationNumber} recorded successfully! Ready for print & download.`
      );

      // Refresh history list in background
      fetchHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error recording declaration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Personal Goods Declaration Note
  const handleSavePersonalDeclaration = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!personalFormData.consignorName.trim()) {
        throw new Error("Consignor's Name is required.");
      }
      if (!personalFormData.consignorAddressLine1.trim()) {
        throw new Error("Consignor's Address Line 1 is required.");
      }
      if (!personalFormData.consignorPincode.trim()) {
        throw new Error("Consignor's PIN Code is required.");
      }
      if (!personalFormData.consignorContact.trim()) {
        throw new Error("Consignor's Contact Number is required.");
      }
      if (!personalFormData.consigneeName.trim()) {
        throw new Error("Consignee's Name is required.");
      }
      if (!personalFormData.consigneeAddressLine1.trim()) {
        throw new Error("Consignee's Address Line 1 is required.");
      }
      if (!personalFormData.consigneePincode.trim()) {
        throw new Error("Consignee's PIN Code is required.");
      }
      if (!personalFormData.consigneeContact.trim()) {
        throw new Error("Consignee's Contact Number is required.");
      }
      if (!personalFormData.customerName.trim()) {
        throw new Error('Customer Name in declaration letter introduction is required.');
      }
      if (!personalFormData.residentialAddress.trim()) {
        throw new Error('Residential Address of Customer is required.');
      }
      if (!personalFormData.identificationNumber.trim()) {
        throw new Error('Identification Number (Aadhaar / PAN / Passport) is required.');
      }
      if (!personalFormData.destinationAddress.trim()) {
        throw new Error('Destination Address is required.');
      }
      if (!personalFormData.docketNumber.trim()) {
        throw new Error('Docket Number is required.');
      }
      if (!isValidPersonalDeclarationSignature(personalFormData.signatureBase64)) {
        requirePersonalSignature();
        return;
      }

      setIsSubmitting(true);
      const res = await fetch('/api/organization/declarations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record Personal Declaration Note.');
      }

      setSuccessMessage(
        `Personal Goods Declaration ${data.declaration.declarationNumber} recorded successfully! Ready for print & download.`
      );

      // Refresh history list in background
      fetchHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error recording personal declaration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch Declaration History
  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams();
      if (historySearch) params.set('search', historySearch);
      if (historyPreset) params.set('preset', historyPreset);

      const res = await fetch(`/api/organization/declarations?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.items) {
        setHistoryList(data.items);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historySearch, historyPreset]);

  // Load history when tab changes to history
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  return (
    <div className="space-y-4 w-full">
      {/* 1. Header Section */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 sm:px-6 sm:py-4.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 text-[#0F4C3A] border border-emerald-200">
              <FileCheck className="w-4 h-4 text-emerald-600" />
            </span>
            <span className="text-[11px] font-mono font-bold tracking-wider text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              SHIPPING TOOLS • OFFICIAL COMPLIANCE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            GOODS / SHIPMENT – DECLARATION NOTE
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Official goods and shipment declaration form.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#0F4C3A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Create Declaration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#0F4C3A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <History className="w-4 h-4" />
            Declaration History
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Required Information Incomplete</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Declaration Ready &amp; Saved</p>
              <p className="text-xs text-emerald-800 mt-0.5">{successMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: CREATE DECLARATION FORM & LIVE A4 PREVIEW */}
      {/* ============================================================== */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Template Selection Interface */}
          <DeclarationTemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
          />

          {/* TEMPLATE 1: GOODS DECLARATION NOTE (ORIGINAL MASTER COMPLIANCE) */}
          {selectedTemplate === 'goods' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Fields (7 Columns on XL) */}
              <div className="xl:col-span-7 space-y-6">
            {/* SECTION A: Consignment Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                    A
                  </span>
                  <h3 className="font-black text-[15.4px] text-slate-800 uppercase tracking-wide">
                    Consignment Details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateConsignmentNumber}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Auto-Gen Consignment No
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Consignment Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.consignmentNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, consignmentNumber: e.target.value }))
                    }
                    placeholder="e.g. GT2610138625"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
                  />
                </div>

                {/* Consignee Name with Rich Text Editor */}
                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Consignee&apos;s Name <span className="text-red-500">*</span>
                  </label>
                  <DeclarationRichTextEditor
                    value={formData.consigneeNameHtml || formData.consigneeName}
                    onChange={(html, text) =>
                      setFormData((prev) => ({
                        ...prev,
                        consigneeName: text,
                        consigneeNameHtml: html,
                      }))
                    }
                    placeholder="e.g. Ramesh Enterprises / Priya Sharma"
                    minHeight="min-h-[40px]"
                  />
                </div>

                {/* Receiver Address with Rich Text Editor */}
                <div className="sm:col-span-2">
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Receiver Address <span className="text-red-500">*</span>
                  </label>
                  <DeclarationRichTextEditor
                    value={formData.receiverAddressHtml || formData.receiverAddress}
                    onChange={(html, text) =>
                      setFormData((prev) => ({
                        ...prev,
                        receiverAddress: text,
                        receiverAddressHtml: html,
                      }))
                    }
                    placeholder="Complete delivery address with landmark, building, and street name"
                    multiline
                    rows={3}
                    minHeight="min-h-[72px]"
                  />
                </div>

                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pinCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, pinCode: e.target.value.replace(/\D/g, '') }))
                    }
                    placeholder="e.g. 560086"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">
                      +91
                    </span>
                    <input
                      type="text"
                      maxLength={10}
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contactNumber: e.target.value.replace(/\D/g, ''),
                          mobileVerified: false, // Reset verification if phone changes
                        }))
                      }
                      placeholder="98765 43210"
                      className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION B: Consignor Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                  B
                </span>
                <h3 className="font-black text-[15.4px] text-slate-800 uppercase tracking-wide">
                  Consignor Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Consignor Name with Rich Text Editor */}
                <div className="sm:col-span-2">
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Consignor Name <span className="text-red-500">*</span>
                  </label>
                  <DeclarationRichTextEditor
                    value={formData.consignorNameHtml || formData.consignorName}
                    onChange={(html, text) =>
                      setFormData((prev) => ({
                        ...prev,
                        consignorName: text,
                        consignorNameHtml: html,
                      }))
                    }
                    placeholder="Sender Company Name / Consignor Legal Name"
                    minHeight="min-h-[40px]"
                  />
                </div>

                {/* Consignor Address with Rich Text Editor */}
                <div className="sm:col-span-2">
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Consignor Address <span className="text-red-500">*</span>
                  </label>
                  <DeclarationRichTextEditor
                    value={formData.consignorAddressHtml || formData.consignorAddress}
                    onChange={(html, text) =>
                      setFormData((prev) => ({
                        ...prev,
                        consignorAddress: text,
                        consignorAddressHtml: html,
                      }))
                    }
                    placeholder="Warehouse / Office address of consignor"
                    multiline
                    rows={2}
                    minHeight="min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    GST Registered?
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="isGstRegistered"
                        checked={formData.isGstRegistered}
                        onChange={() => setFormData((prev) => ({ ...prev, isGstRegistered: true }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="isGstRegistered"
                        checked={!formData.isGstRegistered}
                        onChange={() =>
                          setFormData((prev) => ({ ...prev, isGstRegistered: false, gstNumber: '' }))
                        }
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {formData.isGstRegistered && (
                  <div>
                    <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      GST Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={formData.gstNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))
                      }
                      placeholder="e.g. 27ABCDE1234F1Z5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white uppercase"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECTION C & D: Shipment Information & Consignment Value */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                  C
                </span>
                <h3 className="font-black text-[15.4px] text-slate-800 uppercase tracking-wide">
                  Shipment &amp; Value Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Content with Rich Text Editor & Generalized Goods Dropdown */}
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                    <label className="text-[13.2px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer">
                      Content (Goods Description) <span className="text-red-500">*</span>
                    </label>
                    <GoodsCategoryDropdown
                      selectedCategory={formData.content}
                      onSelectCategory={(category) => {
                        setFormData((prev) => ({
                          ...prev,
                          content: category,
                          contentHtml: category,
                        }));
                      }}
                    />
                  </div>
                  <DeclarationRichTextEditor
                    value={formData.contentHtml || formData.content}
                    onChange={(html, text) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: text,
                        contentHtml: html,
                      }))
                    }
                    placeholder="e.g. Industrial Electronic Components & Sensors"
                    minHeight="min-h-[40px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider">
                      HSN Code
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Auto-Suggested by Goods Description
                    </span>
                  </div>
                  <HsnCodeAutoSuggest
                    value={formData.hsnCode || ''}
                    onChange={(hsnCode) => setFormData((prev) => ({ ...prev, hsnCode }))}
                    goodsDescription={formData.content || formData.contentHtml || ''}
                    placeholder="e.g. 85423100 or search by product"
                  />
                </div>

                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Commercial Nature?
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="isCommercial"
                        checked={formData.isCommercial}
                        onChange={() => setFormData((prev) => ({ ...prev, isCommercial: true }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Yes (Commercial)</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="isCommercial"
                        checked={!formData.isCommercial}
                        onChange={() => setFormData((prev) => ({ ...prev, isCommercial: false }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>No (Sample / Non-commercial)</span>
                    </label>
                  </div>
                </div>

                {/* Reason for Transportation with Header-Adjacent Dropdown & Manual Entry */}
                <div className="sm:col-span-2">
                  <ReasonForTransportationInput
                    value={formData.reasonForTransportation || formData.reasonForTransportationHtml || ''}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        reasonForTransportation: val,
                        reasonForTransportationHtml: val,
                      }))
                    }
                    placeholder="Enter reason manually here"
                  />
                </div>

                {/* Value Section */}
                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Consignment Value (INR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={formData.valueInr || ''}
                      onChange={handleValueChange}
                      placeholder="e.g. 25000"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Amount in Words (Auto Generated)
                  </label>
                  <input
                    type="text"
                    value={formData.amountInWords}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, amountInWords: e.target.value }))
                    }
                    placeholder="Rupees in words"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs italic text-slate-700 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION E & F: Invoice & Challan Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                  D
                </span>
                <h3 className="font-black text-[15.4px] text-slate-800 uppercase tracking-wide">
                  Invoice &amp; Challan Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Invoice */}
                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Invoice Available?
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="hasInvoice"
                        checked={formData.hasInvoice}
                        onChange={() => setFormData((prev) => ({ ...prev, hasInvoice: true }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="hasInvoice"
                        checked={!formData.hasInvoice}
                        onChange={() =>
                          setFormData((prev) => ({ ...prev, hasInvoice: false, invoiceNumber: '' }))
                        }
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {formData.hasInvoice && (
                  <div>
                    <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Invoice Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                      }
                      placeholder="e.g. INV-2026/8941"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                )}

                {/* Challan */}
                <div>
                  <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Delivery Challan?
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="hasChallan"
                        checked={formData.hasChallan}
                        onChange={() => setFormData((prev) => ({ ...prev, hasChallan: true }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="radio"
                        name="hasChallan"
                        checked={!formData.hasChallan}
                        onChange={() =>
                          setFormData((prev) => ({ ...prev, hasChallan: false, challanNumber: '' }))
                        }
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {formData.hasChallan && (
                  <div>
                    <label className="block text-[13.2px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Challan Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.challanNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, challanNumber: e.target.value }))
                      }
                      placeholder="e.g. DC-55102"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SECTION G: Consignor Digital Signature Drawing Pad */}
            <div id="consignor-signature-section" className="space-y-2">
              <DigitalSignaturePad
                value={formData.signatureBase64}
                onChange={handleSignatureChange}
                isHighlighted={highlightSignature}
                required={true}
                titleClassName="text-[13.2px] font-black uppercase tracking-wider text-white flex items-center"
              />
            </div>

            {/* SECTION H: Consignor Mobile OTP & Mandatory Self-Attestation */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-[15.4px] text-slate-800 uppercase tracking-wide">
                    Consignor Mobile Verification &amp; Self-Attestation
                  </h3>
                </div>
                {formData.mobileVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified (+91 {formData.verifiedMobileNumber})
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    OTP Verification Pending
                  </span>
                )}
              </div>

              {/* OTP Trigger Box */}
              {!formData.mobileVerified ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[13.2px] font-bold text-slate-800">
                        Consignor Mobile OTP Authentication
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Sends a 6-digit secure verification code to the consignor contact number.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || otpCooldownSec > 0 || !formData.contactNumber}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSendingOtp
                        ? 'Sending OTP...'
                        : otpCooldownSec > 0
                        ? `Resend in ${otpCooldownSec}s`
                        : 'Send OTP Code'}
                    </button>
                  </div>

                  {otpSentMessage && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                      {otpSentMessage}
                    </div>
                  )}

                  {otpDevHint && (
                    <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
                      <span className="font-medium">
                        Verification Code Generated:{' '}
                        <strong className="font-mono text-indigo-700 text-sm font-black">
                          {otpDevHint}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, otpCodeInput: otpDevHint }))
                        }
                        className="text-[11px] font-bold text-indigo-600 underline hover:text-indigo-800"
                      >
                        Auto-fill Code
                      </button>
                    </div>
                  )}

                  {/* OTP Input and Verify Button */}
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.otpCodeInput}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          otpCodeInput: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder="Enter 6-digit OTP"
                      className="w-44 px-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono font-black tracking-widest text-slate-900 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || formData.otpCodeInput.length < 4}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-[#0F4C3A]">
                        Consignor Authenticated &amp; Verified
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Mobile: +91 {formData.verifiedMobileNumber} • Tamper-evident log recorded.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        mobileVerified: false,
                        otpCodeInput: '',
                      }))
                    }
                    className="text-xs font-bold text-slate-500 hover:text-red-600 underline"
                  >
                    Change Number
                  </button>
                </div>
              )}

              {/* Mandatory Self-Attestation Checkbox with exact master text */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.selfAttested}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, selfAttested: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                  />
                  <div className="text-xs text-slate-700 leading-relaxed select-none">
                    <strong className="text-slate-900 block mb-0.5 text-[13.2px] font-bold">
                      Mandatory Consignor Self-Attestation Acceptance <span className="text-red-500">*</span>
                    </strong>
                    &ldquo;I hereby declare that all the information provided above is true and correct to the best of my knowledge, and I accept full responsibility for the contents and particulars of this shipment.&rdquo;
                  </div>
                </label>
              </div>

              {/* Date of Declaration with Indian Date Calendar Picker */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <label className="text-[13.2px] font-bold text-slate-700 uppercase tracking-wider">
                    Date of Declaration:
                  </label>
                </div>
                <div className="w-44">
                  <IndianDatePicker
                    value={formData.declarationDate || getTodayFormattedDate()}
                    onChange={(dateStr) =>
                      setFormData((prev) => ({ ...prev, declarationDate: dateStr }))
                    }
                    separator="/"
                    placeholder="DD/MM/YYYY"
                    align="right"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* SECTION I: Pre-submission Verification Summary card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-[13.2px] font-black uppercase tracking-wider text-white">
                    Pre-Submission Verification Summary
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Ready to Issue
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Consignment No</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {formData.consignmentNumber || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Declared Value</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {formData.valueInr ? `₹ ${formatIndianCurrency(formData.valueInr)}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Digital Signature</span>
                  <span
                    className={`font-bold ${
                      formData.signatureBase64 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {formData.signatureBase64 ? '✓ Drawn & Confirmed' : 'Pending Signature'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Mobile OTP</span>
                  <span
                    className={`font-bold ${
                      formData.mobileVerified ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {formData.mobileVerified ? '✓ OTP Verified' : 'Pending OTP'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormData(initialFormState)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Form
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isValidDeclarationSignature(formData.signatureBase64)) {
                        requireConsignorSignature();
                        return;
                      }
                      printDeclarationDocument(formData);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isValidDeclarationSignature(formData.signatureBase64)) {
                        requireConsignorSignature();
                        return;
                      }
                      downloadDeclarationPdf(formData);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDeclaration}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md hover:scale-102 active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmitting ? 'Recording...' : 'Save & Record Declaration'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live A4 Declaration Preview (5 Columns on XL) */}
          <div className="xl:col-span-5 sticky top-6">
            <DeclarationLivePreviewCard
              data={formData}
              onSave={handleSaveDeclaration}
              onSignatureClick={() => setIsTemplate1SigModalOpen(true)}
              onSignatureRequired={requireConsignorSignature}
              isSaving={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* TEMPLATE 2: PERSONAL GOODS DECLARATION NOTE (NEW TEMPLATE) */}
      {selectedTemplate === 'personal' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Editor (7 Columns on XL) */}
          <div className="xl:col-span-7">
            <PersonalDeclarationEditor
              formData={personalFormData}
              onChange={setPersonalFormData}
              onReset={() => setPersonalFormData(initialPersonalDeclarationState)}
              highlightSignature={highlightPersonalSignature}
            />
          </div>

          {/* Right Column: Live A4 Personal Declaration Preview (5 Columns on XL) */}
          <div className="xl:col-span-5 sticky top-6">
            <PersonalDeclarationLivePreviewCard
              data={personalFormData}
              onSave={handleSavePersonalDeclaration}
              onSignatureClick={() => setIsTemplate2SigModalOpen(true)}
              onSignatureRequired={requirePersonalSignature}
              isSaving={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  )}

      {/* ============================================================== */}
      {/* TAB 2: DECLARATION HISTORY & ARCHIVE */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                placeholder="Search Consignment No, Consignor, Consignee, Phone..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-900 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={historyPreset}
                onChange={(e) => setHistoryPreset(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white cursor-pointer"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>

              <button
                type="button"
                onClick={fetchHistory}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          {historyLoading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Loading past declaration records...
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-sm text-slate-700">No Declaration Notes Found</p>
              <p className="text-xs text-slate-400">
                Create a new declaration above to generate and archive official goods declaration notes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Declaration Ref &amp; Date</th>
                    <th className="py-3 px-4">Consignment No</th>
                    <th className="py-3 px-4">Consignor &amp; Consignee</th>
                    <th className="py-3 px-4">Content</th>
                    <th className="py-3 px-4">Value (INR)</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono font-bold text-slate-900 block">
                            {item.declarationNumber}
                          </span>
                          {item.templateType === 'PERSONAL_GOODS' ? (
                            <span className="text-[9px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                              Personal
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Goods Note
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">{item.declarationDate}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900">
                          {item.consignmentNumber || (item as any).docketNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">TO: {item.consigneeName}</div>
                        <div className="text-[11px] text-slate-500">FROM: {item.consignorName}</div>
                      </td>

                      <td className="py-3 px-4 max-w-[200px] truncate" title={item.content}>
                        <span className="text-slate-700">{item.content}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900">
                          ₹ {formatIndianCurrency(item.valueInr)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {item.templateType === 'PERSONAL_GOODS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                            Personal Use
                          </span>
                        ) : item.mobileVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            OTP Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500">
                            Self Attested
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedDeclaration(item)}
                          title="View Declaration Document"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.templateType === 'PERSONAL_GOODS') {
                              if (!isValidPersonalDeclarationSignature(item.signatureBase64)) {
                                alert(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
                                return;
                              }
                              printPersonalDeclarationDocument(item as any);
                            } else {
                              if (!isValidDeclarationSignature(item.signatureBase64)) {
                                alert(SIGNATURE_REQUIRED_ERROR_MESSAGE);
                                return;
                              }
                              printDeclarationDocument(item);
                            }
                          }}
                          title="Print Document"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.templateType === 'PERSONAL_GOODS') {
                              if (!isValidPersonalDeclarationSignature(item.signatureBase64)) {
                                alert(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
                                return;
                              }
                              downloadPersonalDeclarationPdf(item as any);
                            } else {
                              if (!isValidDeclarationSignature(item.signatureBase64)) {
                                alert(SIGNATURE_REQUIRED_ERROR_MESSAGE);
                                return;
                              }
                              downloadDeclarationPdf(item);
                            }
                          }}
                          title="Download PDF"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VIEW SINGLE DECLARATION NOTE */}
      {/* ============================================================== */}
      {selectedDeclaration && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col my-auto border border-slate-300">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  DECLARATION NOTE: {selectedDeclaration.declarationNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeclaration(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Clean Document Display */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/80 flex items-center justify-center">
              {selectedDeclaration.templateType === 'PERSONAL_GOODS' ? (
                /* PERSONAL GOODS DECLARATION NOTE LAYOUT */
                <div
                  className="shadow-2xl bg-white flex flex-col gap-6 max-h-full overflow-auto rounded-xs"
                  dangerouslySetInnerHTML={{
                    __html: generatePersonalDeclarationHtml(selectedDeclaration as any, { isInteractive: false }),
                  }}
                />
              ) : (
                /* TEMPLATE 1: GOODS DECLARATION NOTE LAYOUT */
                <div
                  id="goods-declaration-note-a4-document"
                  className="w-full max-w-2xl bg-white rounded-xs shadow-md p-8 font-serif text-slate-900 space-y-4"
                >
                {/* 1. Headers */}
                <div className="text-center pb-2">
                  <h1 className="font-serif font-black text-base uppercase tracking-wider text-slate-900">
                    GOODS DECLARATION NOTE
                  </h1>
                  <h2 className="font-serif font-black text-xs uppercase tracking-wide text-slate-900 mt-1">
                    TO WHOM SO EVER IT MAY CONCERN
                  </h2>
                </div>

                {/* 2. Details */}
                <div className="text-xs space-y-2 leading-relaxed">
                  <div>
                    <span className="font-bold">Consignment No: </span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedDeclaration.consignmentNumber}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold">Consignee&apos;s Name: </span>
                    <span
                      className="font-medium inline-block align-top"
                      dangerouslySetInnerHTML={{
                        __html:
                          selectedDeclaration.consigneeNameHtml ||
                          selectedDeclaration.consigneeName ||
                          '',
                      }}
                    />
                  </div>

                  <div>
                    <span className="font-bold">Receiver Address: </span>
                    <span
                      className="font-medium inline-block align-top whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html:
                          selectedDeclaration.receiverAddressHtml ||
                          selectedDeclaration.receiverAddress ||
                          '',
                      }}
                    />
                  </div>

                  <div className="flex gap-6">
                    <div>
                      <span className="font-bold">Pin Code: </span>
                      <span className="font-mono">{selectedDeclaration.pinCode}</span>
                    </div>
                    <div>
                      <span className="font-bold">Contact Number: </span>
                      <span className="font-mono">{selectedDeclaration.contactNumber}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-bold block text-slate-900">Consignor Details:</span>
                    <div>
                      <span className="font-bold">Name: </span>
                      <span
                        className="font-medium inline-block align-top"
                        dangerouslySetInnerHTML={{
                          __html:
                            selectedDeclaration.consignorNameHtml ||
                            selectedDeclaration.consignorName ||
                            '',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-6 mt-1">
                      <div>
                        <span className="font-bold">GST Registered: </span>
                        <span>{selectedDeclaration.isGstRegistered ? 'Yes' : 'No'}</span>
                      </div>
                      {selectedDeclaration.isGstRegistered && (
                        <div>
                          <span className="font-bold">If Yes, GST No: </span>
                          <span className="font-mono font-bold">{selectedDeclaration.gstNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold">Content: </span>
                    <span
                      className="font-medium inline-block align-top"
                      dangerouslySetInnerHTML={{
                        __html:
                          selectedDeclaration.contentHtml || selectedDeclaration.content || '',
                      }}
                    />
                  </div>

                  {selectedDeclaration.hsnCode && (
                    <div>
                      <span className="font-bold">
                        If Consignor or Consignee is GST Registered, mention HSN Code:{' '}
                      </span>
                      <span className="font-mono">{selectedDeclaration.hsnCode}</span>
                    </div>
                  )}

                  <div>
                    <span className="font-bold">Reason for Transportation: </span>
                    <span
                      className="font-medium inline-block align-top"
                      dangerouslySetInnerHTML={{
                        __html:
                          selectedDeclaration.reasonForTransportationHtml ||
                          selectedDeclaration.reasonForTransportation ||
                          '',
                      }}
                    />
                  </div>

                  <div>
                    <span className="font-bold">If this consignment is of commercial nature: </span>
                    <span>{selectedDeclaration.isCommercial ? 'Yes' : 'No'}</span>
                  </div>

                  <div className="pt-1">
                    <span className="font-bold">Value of Consignment :( (Irrespective of the commercial/Non-commercial nature of consignment)</span>
                    <div className="pl-4 pt-0.5">
                      <span className="font-mono font-bold text-slate-900">
                        Rs. {formatIndianCurrency(selectedDeclaration.valueInr)}
                      </span>{' '}
                      <span className="italic">(Rupees {selectedDeclaration.amountInWords})</span>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-1">
                    <div>
                      <span className="font-bold">Invoice: </span>
                      <span>
                        {selectedDeclaration.hasInvoice
                          ? `Yes (${selectedDeclaration.invoiceNumber})`
                          : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Challan: </span>
                      <span>
                        {selectedDeclaration.hasChallan
                          ? `Yes (${selectedDeclaration.challanNumber})`
                          : 'No'}
                      </span>
                    </div>
                  </div>

                  <p className="pt-3 font-bold text-[11px] text-slate-800 leading-normal">
                    {selectedDeclaration.attestationStatement}
                  </p>

                  <div className="pt-4 flex items-end justify-between">
                    <div>
                      <div>
                        <span className="font-bold">Date: </span>
                        <span>{selectedDeclaration.declarationDate}</span>
                      </div>
                      <div className="text-[11px] text-slate-700 mt-1">
                        <span className="font-bold">Address: </span>
                        <span
                          className="whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html:
                              selectedDeclaration.consignorAddressHtml ||
                              selectedDeclaration.consignorAddress ||
                              '',
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="w-40 h-14 border-b border-slate-900 flex items-center justify-center pb-1">
                        {selectedDeclaration.signatureBase64 && (
                          <img
                            src={selectedDeclaration.signatureBase64}
                            alt="Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block mt-1">
                        Signature of the Consignor
                      </span>
                    </div>
                  </div>

                  {/* 3. Bottom line: GEO TRANSIT */}
                  <div className="text-center pt-6 pb-1">
                    <span className="font-sans font-black text-xs tracking-widest text-slate-900 uppercase">
                      GEO TRANSIT
                    </span>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Ref: {selectedDeclaration.declarationNumber}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDeclaration.templateType === 'PERSONAL_GOODS') {
                      if (!isValidPersonalDeclarationSignature(selectedDeclaration.signatureBase64)) {
                        alert(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
                        return;
                      }
                      printPersonalDeclarationDocument(selectedDeclaration as any);
                    } else {
                      if (!isValidDeclarationSignature(selectedDeclaration.signatureBase64)) {
                        alert(SIGNATURE_REQUIRED_ERROR_MESSAGE);
                        return;
                      }
                      printDeclarationDocument(selectedDeclaration);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDeclaration.templateType === 'PERSONAL_GOODS') {
                      if (!isValidPersonalDeclarationSignature(selectedDeclaration.signatureBase64)) {
                        alert(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
                        return;
                      }
                      downloadPersonalDeclarationPdf(selectedDeclaration as any);
                    } else {
                      if (!isValidDeclarationSignature(selectedDeclaration.signatureBase64)) {
                        alert(SIGNATURE_REQUIRED_ERROR_MESSAGE);
                        return;
                      }
                      downloadDeclarationPdf(selectedDeclaration);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Template 1 Consignor Digital Signature Modal */}
      <DigitalSignatureModal
        isOpen={isTemplate1SigModalOpen}
        onClose={() => setIsTemplate1SigModalOpen(false)}
        initialSignature={formData.signatureBase64}
        title="Consignor Digital Signature Whiteboard"
        onSave={async (sig) => {
          let finalSig = sig;
          if (sig && sig.startsWith('data:image')) {
            try {
              finalSig = await cropSignatureDataUrl(sig);
            } catch {
              // Fallback
            }
          }
          setFormData((prev) => ({ ...prev, signatureBase64: finalSig }));
          if (finalSig && isValidDeclarationSignature(finalSig)) {
            setHighlightSignature(false);
            setErrorMessage((curr) => (curr === SIGNATURE_REQUIRED_ERROR_MESSAGE ? null : curr));
          }
          setIsTemplate1SigModalOpen(false);
        }}
      />

      {/* Template 2 Customer Digital Signature Modal */}
      <DigitalSignatureModal
        isOpen={isTemplate2SigModalOpen}
        onClose={() => setIsTemplate2SigModalOpen(false)}
        initialSignature={personalFormData.signatureBase64}
        title="CUSTOMER'S SIGNATURE"
        onSave={async (sig) => {
          let finalSig = sig;
          if (sig && sig.startsWith('data:image')) {
            try {
              finalSig = await cropSignatureDataUrl(sig);
            } catch {
              // Fallback
            }
          }
          setPersonalFormData((prev) => ({ ...prev, signatureBase64: finalSig }));
          if (finalSig && isValidPersonalDeclarationSignature(finalSig)) {
            setHighlightPersonalSignature(false);
            setErrorMessage((curr) =>
              curr === PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE ? null : curr
            );
          }
          setIsTemplate2SigModalOpen(false);

          // Automatically return user to the PDF preview section
          setTimeout(() => {
            const previewEl = document.getElementById('personal-declaration-preview-card');
            if (previewEl) {
              previewEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 150);
        }}
      />
    </div>
  );
}
