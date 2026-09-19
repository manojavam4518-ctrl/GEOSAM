'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { exportToPDF } from '@/utils/exportUtils';
import { Loader2, FileText, Star, Briefcase } from 'lucide-react';
import ShareMenuModal from '@/components/ShareMenuModal';

interface ExportQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: any;
  userName: string;
}

export default function ExportQuoteModal({ isOpen, onClose, calculation, userName }: ExportQuoteModalProps) {
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Branding details
  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyGst, setCompanyGst] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [terms, setTerms] = useState('');
  const [footerText, setFooterText] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBillingAddress, setCustomerBillingAddress] = useState('');
  const [customerShippingAddress, setCustomerShippingAddress] = useState('');

  // Quotation / Document options
  const [documentType, setDocumentType] = useState<'QUOTATION' | 'REPORT'>('QUOTATION');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [validityDays, setValidityDays] = useState('30');

  // Share modal states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  // Load existing templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch('/api/quotations/templates');
        if (res.ok) {
          const json = await res.json();
          const tmpls = json.templates || [];
          setTemplates(tmpls);

          // Find default template or first template
          const defaultTmpl = tmpls.find((t: any) => t.isDefault) || tmpls[0];
          if (defaultTmpl) {
            setSelectedTemplateId(defaultTmpl.id);
            populateBranding(defaultTmpl);
          } else {
            setSelectedTemplateId('custom');
          }
        }
      } catch (err) {
        console.error('Failed to load branding templates:', err);
      } finally {
        setLoading(false);
      }
    }
    if (isOpen) {
      loadTemplates();
      // Auto-generate quote number
      const date = new Date();
      const dateStr = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
      const randStr = Math.floor(1000 + Math.random() * 9000);
      setQuoteNumber(`QT-${dateStr}-${randStr}`);
    }
  }, [isOpen]);

  const populateBranding = (tmpl: any) => {
    setCompanyName(tmpl.companyName || '');
    setCompanyTagline(tmpl.name === 'My Business Standard' ? 'Professional Logistics Solutions' : (tmpl.signatureText || ''));
    setCompanyAddress(tmpl.address || '');
    setCompanyPhone(tmpl.phone || '');
    setCompanyEmail(tmpl.email || '');
    setCompanyWebsite(tmpl.website || '');
    setCompanyLogo(tmpl.logo || '');
    setCompanyGst(tmpl.gstNumber || '');
    setAuthorizedPerson(tmpl.authorizedPerson || '');
    setTerms(tmpl.terms || '1. Weight charges based on final chargeable weight.\n2. Standard delivery timelines apply.');
    setValidityDays(String(tmpl.validityDays || 30));
    setFooterText(tmpl.footerText || 'Thank you for choosing us.');
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
      setTerms('1. Weight charges based on final chargeable weight.\n2. Standard delivery timelines apply.');
      setValidityDays('30');
      setFooterText('Thank you for choosing us.');
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalLogo = companyLogo;

    // Save custom branding template if requested
    if (selectedTemplateId === 'custom' && saveAsTemplate) {
      setSavingTemplate(true);
      try {
        const res = await fetch('/api/quotations/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${companyName || 'My Company'} Default`,
            logo: companyLogo || null,
            companyName,
            address: companyAddress,
            phone: companyPhone,
            email: companyEmail,
            gstNumber: companyGst || null,
            website: companyWebsite || null,
            footerText: footerText || null,
            terms: terms || null,
            paymentTerms: null,
            validityDays: parseInt(validityDays) || 30,
            signatureText: companyTagline || null,
            authorizedPerson: authorizedPerson || null,
            isDefault: true,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.template) {
            finalLogo = json.template.logo || companyLogo;
          }
        }
      } catch (err) {
        console.error('Failed to save branding template:', err);
      } finally {
        setSavingTemplate(false);
      }
    }

    const templateSnapshot = {
      companyName,
      companyTagline,
      address: companyAddress,
      phone: companyPhone,
      email: companyEmail,
      website: companyWebsite,
      logo: finalLogo,
      gstNumber: companyGst,
      authorizedPerson,
      terms,
      validityDays: parseInt(validityDays) || 30,
      footerText,
    };

    const customerSnapshot = {
      name: customerName || 'Valued Customer',
      company: customerCompany,
      email: customerEmail,
      phone: customerPhone,
      billingAddress: customerBillingAddress,
      shippingAddress: customerShippingAddress,
    };

    const quoteDetails = {
      documentType,
      quoteNumber,
      validityDays: parseInt(validityDays) || 30,
      currency: 'INR (₹)',
      createdAt: new Date().toISOString(),
    };

    let savedQuoteId = '';
    if (documentType === 'QUOTATION') {
      try {
        const res = await fetch('/api/quotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: customerName || 'Valued Customer',
            customerCompany: customerCompany || null,
            customerEmail: customerEmail || null,
            customerPhone: customerPhone || null,
            customerAddress: customerBillingAddress || null,
            originPincode: calculation.origin || 'N/A',
            destinationPincode: calculation.destination || 'N/A',
            weight: parseFloat(calculation.actualWeight) || 0,
            serviceType: 'Domestic',
            rateCardName: calculation.rateCardName || 'Weight Calculator',
            pricingMode: 'WEIGHT_CALCULATOR',
            chargeableWeight: parseFloat(calculation.chargeableWeight) || 0,
            baseRate: parseFloat(calculation.shippingCost) || 0,
            additionalCharges: 0,
            cargoRate: null,
            gstAmount: 0,
            totalAmount: parseFloat(calculation.shippingCost) || 0,
            validityDays: parseInt(validityDays) || 30,
            rateSnapshot: {},
            templateSnapshot,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          savedQuoteId = json.quotation.id;
          setShareUrl(`${window.location.origin}/share/quotations/${json.quotation.id}`);
        }
      } catch (err) {
        console.error('Failed to auto-save customer quotation to backend:', err);
      }
    }

    const pdfResult = await exportToPDF(calculation, userName, {
      template: templateSnapshot,
      customer: customerSnapshot,
      quoteDetails,
    });

    if (pdfResult) {
      setPdfBlob(pdfResult.blob);
      setPdfFilename(pdfResult.filename);
      setShareModalOpen(true);
    } else {
      onClose();
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Configure PDF Export" size="lg">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-[#1E8262] animate-spin" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Quotation / Calculation PDF" size="2xl">
      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Document Settings Header */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document Type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
            >
              <option value="QUOTATION">Customer Quotation</option>
              <option value="REPORT">Internal Calculation Report</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document Number</label>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Branding Profile</label>
            <select
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isDefault ? '(Default)' : ''}
                </option>
              ))}
              <option value="custom">+ Use Custom / One-Time Branding</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Validity (Days)</label>
            <input
              type="number"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Branding Details */}
          <div className="space-y-4 border-r border-slate-100 pr-0 lg:pr-6">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Briefcase className="w-4 h-4 text-[#1E8262]" />
              Sender Company Branding
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ABC Logistics"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                  disabled={selectedTemplateId !== 'custom'}
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tagline / Slogan</label>
                <input
                  type="text"
                  value={companyTagline}
                  onChange={(e) => setCompanyTagline(e.target.value)}
                  placeholder="e.g. Fast & Secure Delivery"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                  disabled={selectedTemplateId !== 'custom'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="info@yourcompany.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                  disabled={selectedTemplateId !== 'custom'}
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Phone</label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="+91 9999999999"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                  disabled={selectedTemplateId !== 'custom'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Website</label>
                <input
                  type="text"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="www.yourcompany.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                  disabled={selectedTemplateId !== 'custom'}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={companyGst}
                  onChange={(e) => setCompanyGst(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                  disabled={selectedTemplateId !== 'custom'}
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Address</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Full address, City, State, Pincode"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                disabled={selectedTemplateId !== 'custom'}
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Authorized Person</label>
              <input
                type="text"
                value={authorizedPerson}
                onChange={(e) => setAuthorizedPerson(e.target.value)}
                placeholder="Name / Title"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none"
                disabled={selectedTemplateId !== 'custom'}
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Company Logo</label>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                {selectedTemplateId === 'custom' ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium italic">Logo managed by chosen template</span>
                )}
                {companyLogo && (
                  <img src={companyLogo} alt="Logo" className="h-8 max-w-[80px] object-contain border rounded p-0.5 bg-white shrink-0" />
                )}
              </div>
            </div>

            {selectedTemplateId === 'custom' && (
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1E8262]"></div>
                <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase leading-none">Save profile as new default template</span>
              </label>
            )}
          </div>

          {/* Right Column: Customer Details */}
          <div className="space-y-5">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Star className="w-4 h-4 text-[#1E8262]" />
                Customer Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Company / Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Customer Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="client@email.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 8888888888"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Billing Address</label>
                  <textarea
                    value={customerBillingAddress}
                    onChange={(e) => setCustomerBillingAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Shipping Address</label>
                  <textarea
                    value={customerShippingAddress}
                    onChange={(e) => setCustomerShippingAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="border border-slate-200 hover:bg-slate-50 text-slate-650 py-2.5 px-6 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={savingTemplate}
            className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-2.5 px-8 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
          >
            {savingTemplate ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving branding...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate & Export PDF
              </>
            )}
          </button>
        </div>
      </form>
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
          courier={calculation.rateCardName || 'Weight Calculator'}
          service="Standard Shipping"
          origin={calculation.origin || 'N/A'}
          destination={calculation.destination || 'N/A'}
          weight={String(calculation.chargeableWeight)}
          amount={calculation.shippingCost !== null && calculation.shippingCost !== undefined ? String(calculation.shippingCost) : ''}
          companyName={companyName}
          authorizedPerson={authorizedPerson}
          quoteNumber={quoteNumber}
        />
      )}
    </Modal>
  );
}
