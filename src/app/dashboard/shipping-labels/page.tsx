'use client';

import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Printer,
  Download,
  Share2,
  Plus,
  RefreshCw,
  Search,
  Calendar,
  Truck,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  FileText,
  Eye,
  ArrowRight,
  Shield,
  Layers,
  Scale,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import ShippingLabelCard from '@/components/ShippingLabelCard';
import {
  generateShippingLabelPDF,
  downloadShippingLabelPNG,
  printShippingLabel,
} from '@/utils/shippingLabelExport';
import {
  ShippingLabelTemplateData,
  DEFAULT_MASTER_TEMPLATE,
  generateTrackingNumber,
} from '@/lib/shippingLabel';

export default function ShippingLabelGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [templates, setTemplates] = useState<ShippingLabelTemplateData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ShippingLabelTemplateData | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Form Data State
  const [formData, setFormData] = useState<Record<string, any>>({
    recipient_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
    mobile: '',
    service: 'LITE',
    service_type: 'STD EXP-A',
    origin_code: 'BOM',
    destination_code: 'DEL',
    payment_status: 'PREPAID',
    amount_to_collect: 0,
    tracking_number: '',
    package_count: '001 / 001',
    route_location: 'NORTH HUB / R-04',
    weight: 1.0,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    mode: 'SURFACE',
  });

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');

  const [savingLabel, setSavingLabel] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentSavedLabel, setCurrentSavedLabel] = useState<any>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPreset, setHistoryPreset] = useState('all');
  const [historyCustomStart, setHistoryCustomStart] = useState('');
  const [historyCustomEnd, setHistoryCustomEnd] = useState('');

  // 1. Load active templates
  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/organization/shipping-labels/templates');
      const data = await res.json();
      if (res.ok && data.templates && data.templates.length > 0) {
        setTemplates(data.templates);
        // Default to isDefault or first template
        const def = data.templates.find((t: any) => t.isDefault) || data.templates[0];
        setSelectedTemplate(def);
      } else {
        setSelectedTemplate(DEFAULT_MASTER_TEMPLATE);
      }
    } catch {
      setSelectedTemplate(DEFAULT_MASTER_TEMPLATE);
    } finally {
      setLoadingTemplates(false);
    }
  }

  // 2. Load History
  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      if (historySearch) params.set('search', historySearch);
      params.set('preset', historyPreset);
      if (historyPreset === 'custom') {
        if (historyCustomStart) params.set('startDate', historyCustomStart);
        if (historyCustomEnd) params.set('endDate', historyCustomEnd);
      }

      const res = await fetch(`/api/organization/shipping-labels?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setHistoryList(data.labels || []);
      }
    } catch (err) {
      console.error('Failed to load label history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadTemplates();
    handleGenerateNewTracking();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, historyPreset, historySearch]);

  // Generate tracking number
  function handleGenerateNewTracking() {
    const num = generateTrackingNumber();
    setFormData((prev) => ({ ...prev, tracking_number: num }));
  }

  function handleInputChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Save / Persist Label
  async function handleSaveLabel() {
    setSavingLabel(true);
    setFeedback(null);
    try {
      const templateId = selectedTemplate?.id;
      const res = await fetch('/api/organization/shipping-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          ...formData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Label for ${data.label.trackingNumber} successfully generated and recorded in history!`,
        });
        setCurrentSavedLabel(data.label);
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to save shipping label.',
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving label.' });
    } finally {
      setSavingLabel(false);
    }
  }

  // Export PDF
  async function handleDownloadPDF() {
    if (!selectedTemplate) return;
    try {
      const doc = await generateShippingLabelPDF({
        template: selectedTemplate,
        data: formData,
        qrDataUrl,
        barcodeDataUrl,
      });
      doc.save(`shipping-label-${formData.tracking_number || 'consignment'}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF document.');
    }
  }

  // Export PNG
  async function handleDownloadPNG() {
    const success = await downloadShippingLabelPNG('user-label-live-preview', formData.tracking_number);
    if (!success) {
      alert('Failed to export PNG image.');
    }
  }

  // Print
  function handlePrint() {
    printShippingLabel('user-label-live-preview');
  }

  // Share
  async function handleShare() {
    const tracking = formData.tracking_number;
    const recipient = formData.recipient_name;
    const dest = `${formData.city}, ${formData.state} - ${formData.pincode}`;
    const shareText = `*GEO TRANSIT SHIPPING CONSIGNMENT*\n\nTracking Number: ${tracking}\nRecipient: ${recipient}\nDestination: ${dest}\nService: ${formData.service} (${formData.service_type})\nWeight: ${formData.weight} kg\nMode: ${formData.mode}\nStatus: ${formData.payment_status}\n\nTrack online at: https://geotransit.com/tracking`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `GEO TRANSIT Shipping Label - ${tracking}`,
          text: shareText,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard/whatsapp
      }
    }

    // Fallback: Copy to clipboard & offer WhatsApp
    try {
      await navigator.clipboard.writeText(shareText);
      const openWa = confirm(
        'Consignment details copied to clipboard!\n\nWould you like to open WhatsApp to send these details?'
      );
      if (openWa) {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } catch {
      alert('Details:\n' + shareText);
    }
  }

  // Clear / Reset for New Label
  function handleResetForm() {
    const newTracking = generateTrackingNumber();
    setFormData({
      recipient_name: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      pincode: '',
      mobile: '',
      service: 'LITE',
      service_type: 'STD EXP-A',
      origin_code: 'BOM',
      destination_code: 'DEL',
      payment_status: 'PREPAID',
      amount_to_collect: 0,
      tracking_number: newTracking,
      package_count: '001 / 001',
      route_location: 'NORTH HUB / R-04',
      weight: 1.0,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      mode: 'SURFACE',
    });
    setCurrentSavedLabel(null);
    setFeedback(null);
  }

  // Load past label into preview/form
  function handleLoadPastLabel(item: any) {
    if (item.labelData) {
      setFormData(item.labelData);
    } else {
      setFormData({
        recipient_name: item.recipientName || '',
        address_line_1: item.recipientAddress || '',
        city: item.recipientCity || '',
        state: item.recipientState || '',
        pincode: item.recipientPincode || '',
        mobile: item.recipientMobile || '',
        service: item.service || 'LITE',
        service_type: item.serviceType || 'STD EXP-A',
        origin_code: item.originCode || 'BOM',
        destination_code: item.destinationCode || 'DEL',
        payment_status: item.paymentStatus || 'PREPAID',
        amount_to_collect: item.amountToCollect || 0,
        tracking_number: item.trackingNumber,
        package_count: item.packageCount || '001 / 001',
        route_location: item.routeLocation || 'NORTH HUB',
        weight: item.weight || 1.0,
        mode: item.mode || 'SURFACE',
      });
    }

    if (item.templateSnapshot) {
      setSelectedTemplate(item.templateSnapshot);
    }
    setActiveTab('create');
    setFeedback({
      type: 'success',
      message: `Loaded historical label #${item.trackingNumber} generated on ${new Date(
        item.createdAt
      ).toLocaleDateString('en-GB')}.`,
    });
  }

  async function handleDeleteHistorical(id: string) {
    if (!confirm('Are you sure you want to delete this historical shipping label?')) return;
    try {
      const res = await fetch(`/api/organization/shipping-labels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadHistory();
      } else {
        alert('Failed to delete label.');
      }
    } catch {
      alert('Network error deleting label.');
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#E8F5E9] text-[#0F4C3A] text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-200">
              LOGISTICS MODULE
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              • Organization Thermal Dispatch Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <QrCode className="w-7 h-7 text-[#1E8262]" />
            SHIPPING LABEL GENERATOR
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Generate industrial shipping labels with real-time 2D QR codes, CODE128 barcodes, recipient details, and true 4×6 / A6 thermal print specs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white text-[#0F4C3A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create New Label
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-[#0F4C3A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Label History
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: CREATE LABEL */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: FORM DATA ENTRY (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Template Selector */}
            {templates.length > 1 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    ACTIVE MASTER TEMPLATE
                  </span>
                  <span className="text-xs font-black text-slate-800">{selectedTemplate?.name}</span>
                </div>
                <select
                  value={selectedTemplate?.id}
                  onChange={(e) => {
                    const tmpl = templates.find((t) => t.id === e.target.value);
                    if (tmpl) setSelectedTemplate(tmpl);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.sizePreset})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recipient Details Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#0F4C3A]">
                  <MapPin className="w-4 h-4 text-[#1E8262]" />
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    Recipient Information (SHIP TO)
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Required For Delivery
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Recipient / Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.recipient_name}
                    onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g. Ramesh Enterprises / Priya Sharma"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={formData.address_line_1}
                      onChange={(e) => handleInputChange('address_line_1', e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262]"
                      placeholder="Shop No. 12, Industrial Area Phase 2"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Address Line 2 (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.address_line_2}
                      onChange={(e) => handleInputChange('address_line_2', e.target.value)}
                      className="w-full text-xs font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262]"
                      placeholder="Near Landmark / Gate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262]"
                      placeholder="Mumbai"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262]"
                      placeholder="Maharashtra"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262]"
                      placeholder="400001"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262]"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>

            {/* Shipment, Consignment & Barcode Details */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#0F4C3A]">
                  <Truck className="w-4 h-4 text-[#1E8262]" />
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    Consignment & Barcode Details
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Tracking / Consignment Number *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateNewTracking}
                      className="text-[10px] text-[#1E8262] font-black uppercase tracking-wider hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Generate New Consignment No
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.tracking_number}
                    onChange={(e) => handleInputChange('tracking_number', e.target.value.toUpperCase())}
                    className="w-full text-sm font-mono font-black tracking-wider px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] bg-slate-50/50"
                    placeholder="e.g. GT2609001421"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    This value is automatically encoded into both the 2D QR Code and machine-readable CODE128 Barcode.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Service
                    </label>
                    <select
                      value={formData.service}
                      onChange={(e) => handleInputChange('service', e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="LITE">LITE</option>
                      <option value="CARGO">CARGO</option>
                      <option value="EXPRESS">EXPRESS</option>
                      <option value="STANDARD">STANDARD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Service Type
                    </label>
                    <select
                      value={formData.service_type}
                      onChange={(e) => handleInputChange('service_type', e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="STD EXP-A">STD EXP-A</option>
                      <option value="PRIORITY">PRIORITY</option>
                      <option value="ECONOMY">ECONOMY</option>
                      <option value="SAME DAY">SAME DAY</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Origin Code (Airport/Station)
                    </label>
                    <input
                      type="text"
                      value={formData.origin_code}
                      onChange={(e) => handleInputChange('origin_code', e.target.value.toUpperCase())}
                      className="w-full text-xs font-bold font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl uppercase"
                      placeholder="BOM"
                      maxLength={5}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Destination Code (Airport/Station)
                    </label>
                    <input
                      type="text"
                      value={formData.destination_code}
                      onChange={(e) => handleInputChange('destination_code', e.target.value.toUpperCase())}
                      className="w-full text-xs font-bold font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl uppercase"
                      placeholder="DEL"
                      maxLength={5}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Routing Specifications */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#0F4C3A]">
                  <Scale className="w-4 h-4 text-[#1E8262]" />
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    Weight, Routing & Payment Status
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => handleInputChange('payment_status', e.target.value)}
                      className="w-full text-xs font-black px-3 py-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="PREPAID">PREPAID</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                      <option value="TO PAY">TO PAY</option>
                      <option value="PARTIAL">PARTIAL</option>
                    </select>
                  </div>

                  {formData.payment_status === 'COD' && (
                    <div>
                      <label className="block text-[11px] font-bold text-red-700 uppercase mb-1">
                        Amount to Collect (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount_to_collect}
                        onChange={(e) => handleInputChange('amount_to_collect', e.target.value)}
                        className="w-full text-xs font-black text-red-700 px-3.5 py-2.5 border border-red-300 rounded-xl bg-red-50/50"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 rounded-xl"
                      placeholder="1.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Package Count
                    </label>
                    <input
                      type="text"
                      value={formData.package_count}
                      onChange={(e) => handleInputChange('package_count', e.target.value)}
                      className="w-full text-xs font-bold font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl"
                      placeholder="001 / 001"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Mode
                    </label>
                    <select
                      value={formData.mode}
                      onChange={(e) => handleInputChange('mode', e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="SURFACE">SURFACE</option>
                      <option value="AIR">AIR</option>
                      <option value="EXPRESS">EXPRESS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Route / Hub Location
                    </label>
                    <input
                      type="text"
                      value={formData.route_location}
                      onChange={(e) => handleInputChange('route_location', e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl uppercase"
                      placeholder="NORTH HUB / R-04"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Dispatch Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Protected Architecture Notice */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-800 block">Protected Super Admin Template & Branding</span>
                Master label layout, barcode positioning, company logo, and dimension constraints are secured by GEO TRANSIT Super Admin. Office staff enter shipment data with guaranteed brand integrity.
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE LABEL PREVIEW & ACTIONS RIBBON (5 COLS) */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                  THERMAL PREVIEW
                </span>
                <h3 className="font-black text-sm text-white">Live Shipping Label Preview</h3>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-1 rounded">
                4×6 Inch (101.6 × 152.4 mm)
              </span>
            </div>

            {/* Label Card Container */}
            <div className="bg-slate-200/80 p-5 rounded-2xl border border-slate-300 flex justify-center shadow-inner overflow-hidden">
              {selectedTemplate && (
                <ShippingLabelCard
                  template={selectedTemplate}
                  data={formData}
                  id="user-label-live-preview"
                  onQrGenerated={(url) => setQrDataUrl(url)}
                  onBarcodeGenerated={(url) => setBarcodeDataUrl(url)}
                />
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <button
                type="button"
                onClick={handleSaveLabel}
                disabled={savingLabel}
                className="w-full bg-[#0F4C3A] hover:bg-[#155d47] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {savingLabel ? 'Saving Record...' : 'Save & Record Label'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  Download PNG
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  Print Label
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                >
                  <Share2 className="w-4 h-4 text-[#1E8262]" />
                  Share Label
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full text-slate-500 hover:text-slate-800 text-[11px] font-bold text-center pt-1 block cursor-pointer"
              >
                + Clear / Start Fresh Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LABEL HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by Tracking Number, Recipient, City, Mobile..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#1E8262]"
              />
            </div>

            {/* Date Preset Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {['all', 'today', 'this_week', 'this_month'].map((p) => (
                <button
                  key={p}
                  onClick={() => setHistoryPreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                    historyPreset === p
                      ? 'bg-white text-[#0F4C3A] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loadingHistory ? (
            <div className="p-12 text-center text-slate-500 text-xs font-bold">
              Loading generated label history...
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-bold">
              No shipping labels generated yet. Switch to &quot;Create New Label&quot; to produce your first consignment label.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-3">Tracking / Consignment</th>
                    <th className="py-3 px-3">Recipient</th>
                    <th className="py-3 px-3">Destination</th>
                    <th className="py-3 px-3">Service</th>
                    <th className="py-3 px-3">Weight</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3">Created</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-black text-slate-900">
                        {item.trackingNumber}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {item.recipientName || 'N/A'}
                        {item.recipientMobile && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {item.recipientMobile}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-700">
                          {item.recipientCity || 'N/A'}
                        </span>
                        {item.recipientPincode && (
                          <span className="text-[10px] text-slate-400 block">
                            PIN: {item.recipientPincode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          {item.service || 'LITE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        {item.weight ? `${Number(item.weight).toFixed(2)} kg` : 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-black text-[10px] px-2 py-0.5 rounded ${
                            item.paymentStatus === 'COD'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {item.paymentStatus || 'PREPAID'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleLoadPastLabel(item)}
                            className="p-1.5 text-[#0F4C3A] hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                            title="Open in Live Preview & Print"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteHistorical(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
