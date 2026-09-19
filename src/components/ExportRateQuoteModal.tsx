'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { exportRateQuoteToPDF } from '@/utils/exportUtils';
import { formatDateIndian } from '@/utils/dateUtils';
import { Loader2, FileText, Share2, Sparkles, Check, Copy, Edit3, Eye, FileSignature, Star } from 'lucide-react';
import ShareMenuModal from '@/components/ShareMenuModal';

interface ExportRateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRateResult: any;
  originPincode: string;
  destinationPincode: string;
  weight: string;
  userName: string;
  originInfo: any;
  destInfo: any;
  detectedRegion: string;
  serviceMode?: string;
  templates: any[];
  activeCards: any[];
}

export default function ExportRateQuoteModal({
  isOpen,
  onClose,
  selectedRateResult,
  originPincode,
  destinationPincode,
  weight,
  userName,
  originInfo,
  destInfo,
  detectedRegion,
  serviceMode = 'Surface',
  templates: initialTemplates,
  activeCards,
}: ExportRateQuoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Branding configuration
  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyGst, setCompanyGst] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [authorizedDesignation, setAuthorizedDesignation] = useState('Authorized Signatory');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Customer configuration
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Share modal states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  // Quotation particulars
  const [quoteNumber, setQuoteNumber] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [subject, setSubject] = useState('Quotation for Courier Service');
  const [intro, setIntro] = useState(
    'Thank you for showing interest in our services.\n\nBased on the shipment details provided, we are pleased to offer the following shipping quotation.'
  );
  const [terms, setTerms] = useState(
    '1. Weight charges are calculated based on the final chargeable weight.\n2. Standard delivery timelines apply as per shipping terms.\n3. Quotation is valid till the specified expiry date.'
  );

  // Pricing configuration
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [gstRate, setGstRate] = useState('0');

  // Preview / layout states
  const [showConfig, setShowConfig] = useState(true);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [savedQuotation, setSavedQuotation] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Parse shipment properties
  const numericWeight = parseFloat(weight) || 0;
  const isCargo = selectedRateResult?.method === 'Cargo';
  const isLtl = selectedRateResult?.method === 'LTL/PTL';
  const isPerKg = selectedRateResult?.method === 'PER_KG';
  
  const chargeableWeight = selectedRateResult?.breakdown?.pricingWeight || numericWeight;
  const volumetricWeight = selectedRateResult?.breakdown?.volumetricWeight || 0;

  // Pricing helper variables
  const rateCardBaseCost = selectedRateResult?.cost || 0;
  const cargoRate = selectedRateResult?.breakdown?.rate || null;
  const perKgRate = selectedRateResult?.breakdown?.rate || 0;
  const slabRange = selectedRateResult?.breakdown?.weightRange || selectedRateResult?.breakdown?.slabRange || 'N/A';
  const slabBaseRate = selectedRateResult?.breakdown?.baseRate || rateCardBaseCost;
  const extraSlabsCount = selectedRateResult?.breakdown?.extraSlabs || 0;
  const extraSlabRate = selectedRateResult?.breakdown?.extraRate || 0;
  const weightRange = selectedRateResult?.breakdown?.weightRange || 'N/A';

  // Subtotal, tax and total
  const subtotal = rateCardBaseCost + (parseFloat(additionalCharges) || 0);
  const gstAmount = subtotal * ((parseFloat(gstRate) || 0) / 100);
  const totalAmount = subtotal + gstAmount;

  // Initialize
  useEffect(() => {
    if (isOpen) {
      // Find default template or custom
      const defaultTmpl = templates.find((t: any) => t.isDefault) || templates[0];
      if (defaultTmpl) {
        setSelectedTemplateId(defaultTmpl.id);
        populateBranding(defaultTmpl);
      } else {
        setSelectedTemplateId('custom');
      }

      // Generate unique quote number
      const date = new Date();
      const dateStr = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
      const randStr = Math.floor(1000 + Math.random() * 9000);
      setQuoteNumber(`QT-${dateStr}-${randStr}`);
      
      // Reset status
      setSavedQuotation(null);
      setCopiedLink(false);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, selectedRateResult]);

  const populateBranding = (tmpl: any) => {
    setCompanyName(tmpl.companyName || '');
    setCompanyTagline(tmpl.signatureText || tmpl.companyTagline || 'Enterprise Cargo Services');
    setCompanyAddress(tmpl.address || '');
    setCompanyPhone(tmpl.phone || '');
    setCompanyEmail(tmpl.email || '');
    setCompanyWebsite(tmpl.website || '');
    setCompanyLogo(tmpl.logo || '');
    setCompanyGst(tmpl.gstNumber || '');
    setAuthorizedPerson(tmpl.authorizedPerson || '');
    setAuthorizedDesignation(tmpl.designation || 'Authorized Representative');
    if (tmpl.terms) setTerms(tmpl.terms);
    setValidityDays(String(tmpl.validityDays || 30));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTemplateId(val);
    if (val === 'custom') {
      setCompanyName('');
      setCompanyTagline('');
      setCompanyAddress('');
      setCompanyPhone('');
      setCompanyEmail('');
      setCompanyWebsite('');
      setCompanyLogo('');
      setCompanyGst('');
      setAuthorizedPerson('');
      setAuthorizedDesignation('Authorized Signatory');
    } else {
      const tmpl = templates.find((t) => t.id === val);
      if (tmpl) populateBranding(tmpl);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveQuotation = async () => {
    setSavingQuote(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const templateSnapshot = {
        companyName,
        companyTagline,
        address: companyAddress,
        phone: companyPhone,
        email: companyEmail,
        website: companyWebsite,
        logo: companyLogo || null,
        gstNumber: companyGst || null,
        authorizedPerson,
        designation: authorizedDesignation,
        terms,
        validityDays: parseInt(validityDays) || 30,
      };

      const rateCardSource = activeCards.find((c: any) => c.id === selectedRateResult?.id);

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerCompany,
          customerEmail,
          customerPhone,
          customerAddress,
          originPincode,
          destinationPincode,
          weight: numericWeight,
          serviceType: selectedRateResult?.serviceType || 'Domestic',
          rateCardName: selectedRateResult?.name || 'Standard Rate',
          pricingMode: selectedRateResult?.method || 'SLAB',
          chargeableWeight,
          baseRate: rateCardBaseCost,
          additionalCharges: parseFloat(additionalCharges) || 0,
          cargoRate,
          gstAmount,
          totalAmount,
          validityDays: parseInt(validityDays) || 30,
          rateSnapshot: {
            ...(rateCardSource || {}),
            tat: selectedRateResult?.tat,
            freightType: selectedRateResult?.freightType,
            destinationCountry: selectedRateResult?.destinationCountry,
            perKgRate: selectedRateResult?.perKgRate,
            baseFreight: selectedRateResult?.baseFreight,
            otherCharges: selectedRateResult?.otherCharges,
          },
          templateSnapshot,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save quotation.');

      setSavedQuotation(data.quotation);
      setSuccessMessage('Quotation saved successfully!');

      // Save custom template if requested
      if (selectedTemplateId === 'custom' && saveAsTemplate) {
        setSavingTemplate(true);
        try {
          await fetch('/api/quotations/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${companyName || 'My Business'} Default`,
              logo: companyLogo || null,
              companyName,
              address: companyAddress,
              phone: companyPhone,
              email: companyEmail,
              gstNumber: companyGst || null,
              website: companyWebsite || null,
              terms: terms || null,
              paymentTerms: null,
              validityDays: parseInt(validityDays) || 30,
              signatureText: companyTagline || null,
              authorizedPerson: authorizedPerson || null,
              isDefault: true,
            }),
          });
        } catch (err) {
          console.error('Failed to auto-save branding template:', err);
        } finally {
          setSavingTemplate(false);
        }
      }

      return data.quotation;
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving.');
      return null;
    } finally {
      setSavingQuote(false);
    }
  };

  const handleExportPDF = async () => {
    let currentQuote = savedQuotation;
    if (!currentQuote) {
      currentQuote = await handleSaveQuotation();
    }
    if (!currentQuote) return;

    const templateSnapshot = {
      companyName,
      companyTagline,
      address: companyAddress,
      phone: companyPhone,
      email: companyEmail,
      website: companyWebsite,
      logo: companyLogo,
      gstNumber: companyGst,
      authorizedPerson,
    };

    const payload = {
      quoteNumber: currentQuote.quotationNumber,
      createdAt: currentQuote.createdAt,
      validityDays: parseInt(validityDays) || 30,
      customerName,
      customerCompany,
      customerEmail,
      customerPhone,
      customerAddress,
      subject,
      intro,
      terms,
      courier: selectedRateResult?.courier || 'N/A',
      service: selectedRateResult?.service || 'N/A',
      serviceType: selectedRateResult?.serviceType || 'Domestic',
      originInfo,
      destInfo,
      detectedRegion,
      originPincode,
      destinationPincode,
      weight: numericWeight,
      volumetricWeight,
      chargeableWeight,
      pricingMode: selectedRateResult?.method,
      cargoMode: serviceMode,
      cargoRate,
      baseRate: rateCardBaseCost,
      perKgRate,
      slabRange,
      slabBaseRate,
      extraSlabsCount,
      extraSlabRate,
      weightRange,
      additionalCharges: parseFloat(additionalCharges) || 0,
      gstRate: parseFloat(gstRate) || 0,
      gstAmount,
      totalAmount,
    };

    const pdfResult = await exportRateQuoteToPDF(payload, templateSnapshot);
    if (pdfResult) {
      setPdfBlob(pdfResult.blob);
      setPdfFilename(pdfResult.filename);
      setShareUrl(`${window.location.origin}/share/quotations/${currentQuote.id}`);
      setShareModalOpen(true);
    }
  };

  const handleShare = async () => {
    await handleExportPDF();
  };

  const copyFallback = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="GENERATE CUSTOMER QUOTATION" 
        size="workspace"
        noPadding
        headerExtra={
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0F4C3A] border border-emerald-200/80">
            <Sparkles className="w-3 h-3 text-[#1E8262]" /> Document Studio
          </span>
        }
        footer={
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            {/* Left Action Group */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveQuotation}
                disabled={savingQuote}
                className="border border-[#1E8262] text-[#0F4C3A] hover:bg-emerald-50/70 py-2.5 px-5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {savingQuote ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#1E8262]" />
                    <span>Save Quotation</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 px-5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {copiedLink ? (
                  <>
                    <Copy className="w-4 h-4 text-emerald-600" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Action Group */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="border border-slate-200 hover:bg-slate-100 text-slate-650 py-2.5 px-6 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-7 rounded-xl text-xs font-bold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Export A4 PDF</span>
              </button>
            </div>
          </div>
        }
      >
        {/* FEEDBACK STATUS BAR */}
        {(errorMessage || successMessage) && (
          <div className="px-6 pt-3 shrink-0">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm">
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-250 text-[#0F4C3A] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
                <span>{successMessage}</span>
                <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700 font-bold ml-2">✕</button>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE BODY MAIN CONTAINER */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-slate-100/60">
          
          {/* LEFT CONFIGURATION COLUMN */}
          {showConfig && (
            <div className="w-full lg:w-[450px] xl:w-[490px] shrink-0 border-r border-slate-200 bg-white flex flex-col min-h-0">
              {/* Sidebar Header */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-[#1E8262]" />
                  Configuration Settings
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Scrollable Form</span>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* Template & Branding */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
                    <FileSignature className="w-4 h-4 text-[#1E8262]" />
                    Branding Profile Settings
                  </h4>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Profile</label>
                    <select
                      value={selectedTemplateId}
                      onChange={handleTemplateChange}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                      <option value="custom">+ Create Custom / One-Time Profile</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                        disabled={selectedTemplateId !== 'custom'}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tagline</label>
                      <input
                        type="text"
                        value={companyTagline}
                        onChange={(e) => setCompanyTagline(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                        disabled={selectedTemplateId !== 'custom'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                      <input
                        type="text"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                        disabled={selectedTemplateId !== 'custom'}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                      <input
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                        disabled={selectedTemplateId !== 'custom'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company Address</label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                      disabled={selectedTemplateId !== 'custom'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Website</label>
                      <input
                        type="text"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                        disabled={selectedTemplateId !== 'custom'}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">GSTIN / Tax ID</label>
                      <input
                        type="text"
                        value={companyGst}
                        onChange={(e) => setCompanyGst(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                        disabled={selectedTemplateId !== 'custom'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Authorized Person</label>
                      <input
                        type="text"
                        value={authorizedPerson}
                        onChange={(e) => setAuthorizedPerson(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                        disabled={selectedTemplateId !== 'custom'}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Designation</label>
                      <input
                        type="text"
                        value={authorizedDesignation}
                        onChange={(e) => setAuthorizedDesignation(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition disabled:bg-slate-100 disabled:text-slate-500 shadow-sm"
                        disabled={selectedTemplateId !== 'custom'}
                      />
                    </div>
                  </div>

                  {selectedTemplateId === 'custom' && (
                    <div className="pt-1.5 space-y-2 border-t border-slate-200/60 mt-2">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Company Logo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      />
                      {companyLogo && (
                        <img src={companyLogo} alt="Logo Preview" className="h-9 max-w-[120px] object-contain border rounded mt-1.5 p-1 bg-white shadow-sm" />
                      )}
                      <label className="relative inline-flex items-center cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={saveAsTemplate}
                          onChange={(e) => setSaveAsTemplate(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1E8262]"></div>
                        <span className="ml-2 text-[9px] font-bold text-slate-500 uppercase leading-none">Save profile as default template</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Customer Particulars */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
                    <Sparkles className="w-4 h-4 text-[#1E8262]" />
                    Customer & Cover Details
                  </h4>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Company / Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Acme Corporation"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={customerCompany}
                        onChange={(e) => setCustomerCompany(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Validity (Days)</label>
                      <input
                        type="number"
                        value={validityDays}
                        onChange={(e) => setValidityDays(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Billing / Dispatch Address</label>
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Introduction Message</label>
                    <textarea
                      value={intro}
                      onChange={(e) => setIntro(e.target.value)}
                      rows={3}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm resize-none"
                    />
                  </div>
                </div>

                {/* Pricing Adjustments */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
                    <Star className="w-4 h-4 text-[#1E8262]" />
                    Optional Fees & Taxes
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Other/Fuel Fees (₹)</label>
                      <input
                        type="number"
                        value={additionalCharges}
                        onChange={(e) => setAdditionalCharges(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition text-right shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">GST / Taxes (%)</label>
                      <select
                        value={gstRate}
                        onChange={(e) => setGstRate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition text-right shadow-sm"
                      >
                        <option value="0">0% (None)</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notes / Terms */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3 shadow-sm">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notes / Terms & Conditions</label>
                    <textarea
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      rows={4}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8262]/20 focus:border-[#1E8262] transition shadow-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT PREVIEW COLUMN */}
          <div className="flex-1 min-w-0 flex flex-col bg-slate-900 min-h-0 relative">
            {/* Preview Toolbar */}
            <div className="h-11 px-5 bg-slate-950 border-b border-slate-800/80 shrink-0 flex items-center justify-between text-white shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-1 px-3 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  {showConfig ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-400" /> Hide Sidebar
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" /> Show Sidebar
                    </>
                  )}
                </button>
                <div className="h-4 w-px bg-slate-800 hidden sm:block" />
                <span className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live A4 Document View
                </span>
              </div>

              {/* Controls: Zoom Scale */}
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400 text-[10px]">Zoom:</span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((z) => Math.max(0.65, parseFloat((z - 0.1).toFixed(2))))}
                    className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-slate-200 font-bold transition"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-emerald-400 font-mono text-[11px] font-bold w-10 text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((z) => Math.min(1.35, parseFloat((z + 0.1).toFixed(2))))}
                    className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-slate-200 font-bold transition"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.0)}
                    className="ml-1 text-[9px] uppercase font-bold text-slate-400 hover:text-slate-200 transition"
                  >
                    Fit
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Container with Scroll */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex justify-center items-start bg-slate-900/95 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]">
              <div 
                style={{ 
                  transform: `scale(${zoomScale})`, 
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className="w-[700px] min-h-[990px] bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] p-10 border border-slate-300/80 flex flex-col justify-between text-slate-800 text-[11px] leading-relaxed relative rounded-sm my-2 shrink-0 select-text"
              >
                {/* Top Accent brand line */}
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#0F4C3A]" />

                <div className="space-y-6">
                  {/* Header branding */}
                  <div className="flex justify-between items-start gap-4">
                    {/* Left branding */}
                    <div className="space-y-1">
                      {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="h-10 max-w-[140px] object-contain mb-2" />
                      ) : (
                        <div className="w-14 h-7 bg-slate-100 rounded text-slate-400 font-black text-[9px] flex items-center justify-center border border-slate-200 uppercase mb-1">LOGO</div>
                      )}
                      <h3 className="font-extrabold text-[#0F4C3A] text-base uppercase leading-none">{companyName || 'GEO TRANSIT'}</h3>
                      {companyTagline && <p className="italic text-[9px] text-slate-400">{companyTagline}</p>}
                      <p className="text-[8.5px] text-slate-500 leading-tight pt-1">
                        {companyAddress || 'Corporate Office Address'}<br />
                        Phone: {companyPhone || '+91-XXXXXXXXXX'} | Email: {companyEmail || 'info@company.com'}<br />
                        {companyWebsite && `Website: ${companyWebsite}`}
                      </p>
                    </div>

                    {/* Right title & particulars */}
                    <div className="text-right space-y-1">
                      <h2 className="font-black text-[#0F4C3A] text-[18px] tracking-wide mb-1">QUOTATION</h2>
                      <p className="text-[9.5px] text-slate-500 leading-relaxed">
                        <strong>Quotation No:</strong> <span className="text-slate-800 font-bold">{quoteNumber}</span><br />
                        <strong>Date:</strong> {formatDateIndian(new Date())}<br />
                        <strong>Valid Until:</strong> {formatDateIndian(new Date().getTime() + (parseInt(validityDays) || 30) * 24 * 60 * 60 * 1000)}<br />
                        {companyGst && <><strong>GSTIN:</strong> {companyGst}</>}
                      </p>
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* To details & Cover Message */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-[#0F4C3A] uppercase tracking-wider text-[9px] mb-1">TO:</h4>
                      <div className="space-y-0.5 text-[11px]">
                        <strong className="text-slate-900 block">{customerName || 'Customer / Company'}</strong>
                        {customerCompany && <span className="block text-slate-600">{customerCompany}</span>}
                        {customerPhone && <span className="block text-slate-500">Phone: {customerPhone}</span>}
                        {customerEmail && <span className="block text-slate-500">Email: {customerEmail}</span>}
                        {customerAddress && <span className="block text-slate-500 mt-1 whitespace-pre-wrap">{customerAddress}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-bold text-slate-850 border-b border-slate-100 pb-1 text-[11.5px]">{subject}</h4>
                    <p className="whitespace-pre-wrap text-slate-650 mt-1 text-[10.5px] leading-relaxed">{intro}</p>
                  </div>

                  {/* Shipment details box */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#0F4C3A] uppercase tracking-wider text-[9px]">Shipment Details</h4>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 grid grid-cols-2 gap-x-6 gap-y-2 text-[10px]">
                      <div><span className="text-slate-400 font-medium">Courier Company:</span> <strong className="text-slate-800">{selectedRateResult?.courier || 'N/A'}</strong></div>
                      {selectedRateResult?.serviceType === 'International' ? (
                        <>
                          <div><span className="text-slate-400 font-medium">Freight Type:</span> <strong className="text-slate-800">{selectedRateResult?.freightType || 'Air Freight'}</strong></div>
                          <div><span className="text-slate-400 font-medium">Destination Country:</span> <strong className="text-slate-800">{selectedRateResult?.destinationCountry || destinationPincode}</strong></div>
                          <div><span className="text-slate-400 font-medium">Chargeable Weight:</span> <strong className="text-slate-800">{chargeableWeight} KG</strong></div>
                          <div><span className="text-slate-400 font-medium">Per KG Rate:</span> <strong className="text-slate-800">₹{selectedRateResult?.perKgRate || 0} / KG</strong></div>
                          <div><span className="text-slate-400 font-medium">Base Freight:</span> <strong className="text-slate-800">₹{selectedRateResult?.baseFreight || 0}</strong></div>
                          <div><span className="text-slate-400 font-medium">Estimated Transit Time (TAT):</span> <strong className="text-emerald-800 font-extrabold">{selectedRateResult?.tat || 'N/A'}</strong></div>
                        </>
                      ) : (
                        <>
                          <div><span className="text-slate-400 font-medium">Origin Pincode:</span> <strong className="text-slate-800">{originPincode}</strong></div>
                          <div><span className="text-slate-400 font-medium">Service Name:</span> <strong className="text-slate-800">{selectedRateResult?.service || 'N/A'}</strong></div>
                          <div><span className="text-slate-400 font-medium">Destination Pincode:</span> <strong className="text-slate-800">{destinationPincode}</strong></div>
                          <div><span className="text-slate-400 font-medium">Service Type:</span> <strong className="text-slate-800">{selectedRateResult?.serviceType || 'Domestic'}</strong></div>
                          <div><span className="text-slate-400 font-medium">Actual Weight:</span> <strong className="text-slate-800">{numericWeight} KG</strong></div>
                          <div><span className="text-slate-400 font-medium">Origin City:</span> <strong className="text-slate-800">{originInfo?.city || 'N/A'}</strong></div>
                          <div><span className="text-slate-400 font-medium">Volumetric Weight:</span> <strong className="text-slate-800">{volumetricWeight} KG</strong></div>
                          <div><span className="text-slate-400 font-medium">Destination City:</span> <strong className="text-slate-800">{destInfo?.city || 'N/A'}</strong></div>
                          <div><span className="text-slate-400 font-medium">Chargeable Weight:</span> <strong className="text-slate-800">{chargeableWeight} KG</strong></div>
                          <div><span className="text-slate-400 font-medium">Destination Region:</span> <strong className="text-slate-800">{detectedRegion}</strong></div>
                          <div><span className="text-slate-400 font-medium">Pricing Model:</span> <strong className="text-slate-800">{selectedRateResult?.method}</strong></div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pricing / Details Box */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-[#0F4C3A] uppercase tracking-wider text-[9px]">Calculated Shipping Rate</h4>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex justify-between items-center">
                      <div className="space-y-1 text-[10.5px]">
                        {selectedRateResult?.serviceType === 'International' ? (
                          <>
                            <div>Freight Type: <strong className="text-slate-800">{selectedRateResult?.freightType}</strong></div>
                            <div>Base Freight: <strong className="text-slate-800">₹{selectedRateResult?.baseFreight} ({chargeableWeight} KG × ₹{selectedRateResult?.perKgRate}/KG)</strong></div>
                            {selectedRateResult?.otherCharges?.map((c: any) => (
                              <div key={c.name}>
                                {c.name}: <strong className="text-slate-800">₹{c.amount} {c.percentage ? `(${c.percentage}%)` : ''} {c.fixedRate ? `(₹${c.fixedRate})` : ''}</strong>
                              </div>
                            ))}
                          </>
                        ) : isCargo ? (
                          <>
                            <div>Cargo transport mode: <strong className="text-slate-800">{serviceMode} Mode</strong></div>
                            <div>Applicable cargo rate: <strong className="text-slate-800">₹{cargoRate || 0} / KG</strong></div>
                            <div>Chargeable weight: <strong className="text-slate-800">{chargeableWeight} KG</strong></div>
                          </>
                        ) : isLtl ? (
                          <>
                            <div>Destination Region: <strong className="text-slate-800">{detectedRegion}</strong></div>
                            <div>Matched weight slab range: <strong className="text-slate-800">{weightRange} KG</strong></div>
                            <div>Calculated base cost: <strong className="text-slate-800">₹{rateCardBaseCost}</strong></div>
                          </>
                        ) : isPerKg ? (
                          <>
                            <div>Chargeable Weight: <strong className="text-slate-800">{chargeableWeight} KG</strong></div>
                            <div>Per KG rate: <strong className="text-slate-800">₹{perKgRate} / KG</strong></div>
                            <div>Calculation formula: <strong className="text-slate-800">{chargeableWeight} KG x ₹{perKgRate}</strong></div>
                          </>
                        ) : (
                          <>
                            <div>Applicable weight range: <strong className="text-slate-800">{slabRange}</strong></div>
                            <div>Base rate for slab: <strong className="text-slate-800">₹{slabBaseRate}</strong></div>
                            {extraSlabsCount > 0 && (
                              <div>Additional slabs rate: <strong className="text-slate-800">{extraSlabsCount} slabs x ₹{extraSlabRate}</strong></div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="bg-[#0F4C3A] text-white p-3.5 rounded-xl text-right min-w-[210px] shadow-sm">
                        <span className="block text-[8.5px] text-emerald-200 font-bold uppercase tracking-wider">TOTAL SHIPPING CHARGE</span>
                        <strong className="text-base font-black tracking-wide">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Surcharges breakdown helper line if applied */}
                  {(parseFloat(additionalCharges) > 0 || parseFloat(gstRate) > 0) && (
                    <div className="text-[9.5px] text-slate-500 font-medium px-1 flex justify-between">
                      <span>Base Shipping: ₹{rateCardBaseCost.toFixed(2)}</span>
                      {parseFloat(additionalCharges) > 0 && <span>Surcharges: ₹{parseFloat(additionalCharges).toFixed(2)}</span>}
                      {parseFloat(gstRate) > 0 && <span>GST / Taxes: {gstRate}% (₹{gstAmount.toFixed(2)})</span>}
                    </div>
                  )}

                  {/* Terms and conditions */}
                  {terms && (
                    <div className="space-y-1 pt-2">
                      <h5 className="font-bold text-[#0F4C3A] text-[9.5px] uppercase tracking-wider">Terms & Conditions</h5>
                      <p className="text-[9.5px] text-slate-500 whitespace-pre-wrap leading-normal">{terms}</p>
                    </div>
                  )}
                </div>

                {/* Sign off and signature footer */}
                <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] mt-6">
                  <div>
                    <p className="text-slate-500 font-medium">Thank you for choosing our services.</p>
                    <p className="text-[8.5px] text-slate-400 italic mt-0.5">This document is a formal quotation based on calculation criteria.</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-slate-600 font-medium">Yours faithfully,</p>
                    <strong className="text-slate-800 font-bold block pt-2 text-[11px]">{authorizedPerson || 'Representative Name'}</strong>
                    <span className="text-slate-500 text-[9px] block leading-none">{authorizedDesignation}</span>
                    <span className="text-[#0F4C3A] text-[9.5px] font-bold block uppercase">{companyName || 'GEO TRANSIT'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {shareModalOpen && (
        <ShareMenuModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            onClose();
          }}
          pdfBlob={pdfBlob}
          pdfFilename={pdfFilename}
          shareUrl={shareUrl || undefined}
          customerName={customerName || 'Valued Customer'}
          courier={selectedRateResult?.courier || 'N/A'}
          service={selectedRateResult?.service || 'N/A'}
          origin={originInfo?.city || 'N/A'}
          destination={destInfo?.city || 'N/A'}
          weight={String(chargeableWeight)}
          amount={totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          companyName={companyName}
          authorizedPerson={authorizedPerson}
          quoteNumber={quoteNumber}
        />
      )}
    </>
  );
}
