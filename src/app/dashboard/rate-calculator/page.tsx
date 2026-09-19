'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateIndian, formatDateTimeIndian } from '@/utils/dateUtils';
import { COUNTRIES_LIST } from '@/types/internationalRate';
import {
  Calculator,
  MapPin,
  Scale,
  Navigation,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Tags,
  FileText,
  User,
  Plus,
  Trash2,
  History,
  Share2,
  Camera,
  Download,
} from 'lucide-react';
import Modal from '@/components/Modal';
import ExportRateQuoteModal from '@/components/ExportRateQuoteModal';
import CalculationStepProgress from '@/components/CalculationStepProgress';

export default function RateCalculatorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showStepProgress, setShowStepProgress] = useState(false);
  const [error, setError] = useState('');
  
  // Custom user and history states
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  
  // Input fields
  const [originPincode, setOriginPincode] = useState('');
  const [destinationPincode, setDestinationPincode] = useState('');
  const [weight, setWeight] = useState('');
  const [serviceMode, setServiceMode] = useState<'Air' | 'Surface'>('Surface');

  // Autodetect pincode states
  const [originInfo, setOriginInfo] = useState<any | null>(null);
  const [originLoading, setOriginLoading] = useState(false);
  const [originError, setOriginError] = useState('');

  const [destInfo, setDestInfo] = useState<any | null>(null);
  const [destLoading, setDestLoading] = useState(false);
  const [destError, setDestError] = useState('');

  const [routeSummary, setRouteSummary] = useState('');
  const [routeClass, setRouteClass] = useState('');

  // Trigger origin lookup when pincode has 6 digits
  useEffect(() => {
    const code = originPincode.trim();
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      lookupOrigin(code);
    } else {
      setOriginInfo(null);
      setOriginError('');
    }
  }, [originPincode]);

  // Trigger destination lookup when pincode has 6 digits
  useEffect(() => {
    const code = destinationPincode.trim();
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      lookupDest(code);
    } else {
      setDestInfo(null);
      setDestError('');
    }
  }, [destinationPincode]);

  async function lookupOrigin(code: string) {
    setOriginLoading(true);
    setOriginError('');
    try {
      const res = await fetch(`/api/pincode/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pincode not found');
      setOriginInfo(data.info);
      if (!data.info.isServiceable) {
        setOriginError('✕ Origin location is currently unserviceable.');
      }
    } catch (e: any) {
      setOriginInfo(null);
      setOriginError(e.message || '✕ Invalid or unavailable pincode.');
    } finally {
      setOriginLoading(false);
    }
  }

  async function lookupDest(code: string) {
    setDestLoading(true);
    setDestError('');
    try {
      const res = await fetch(`/api/pincode/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pincode not found');
      setDestInfo(data.info);
      if (!data.info.isServiceable) {
        setDestError('✕ Destination location is currently unserviceable.');
      }
    } catch (e: any) {
      setDestInfo(null);
      setDestError(e.message || '✕ Invalid or unavailable pincode.');
    } finally {
      setDestLoading(false);
    }
  }


  // Hierarchical Filter States
  const [serviceType, setServiceType] = useState<'Domestic' | 'International'>('Domestic');
  const [intlFreightType, setIntlFreightType] = useState<'Sea Freight' | 'Air Freight'>('Air Freight');
  const [intlDestinationCountry, setIntlDestinationCountry] = useState('United States (USA)');
  const [selectedCourierCompanyId, setSelectedCourierCompanyId] = useState('ALL');
  const [selectedRateCardId, setSelectedRateCardId] = useState('ALL');

  // Comparison outputs
  const [results, setResults] = useState<any[]>([]);
  const [detectedRegion, setDetectedRegion] = useState('');
  const [calculated, setCalculated] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Rate cards & templates
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCards, setActiveCards] = useState<any[]>([]);
  const [selectedSystemCardIds, setSelectedSystemCardIds] = useState<string[]>([]);
  const [customCards, setCustomCards] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [hasCargoCard, setHasCargoCard] = useState(false);

  const availableIntlCountries = React.useMemo(() => {
    const targetCards = activeCards.filter((card) => {
      if (card.serviceType !== 'International') return false;
      if (selectedCourierCompanyId !== 'ALL' && card.courierCompanyId !== selectedCourierCompanyId) return false;
      return true;
    });

    const countriesSet = new Set<string>();
    targetCards.forEach((card) => {
      const rates: any[] = Array.isArray((card as any).internationalRates) ? (card as any).internationalRates : [];
      rates.forEach((r) => {
        if (r.freightType === intlFreightType && r.active !== false && r.country) {
          countriesSet.add(r.country);
        }
      });
    });

    return Array.from(countriesSet);
  }, [activeCards, selectedCourierCompanyId, intlFreightType]);

  useEffect(() => {
    if (availableIntlCountries.length > 0 && !availableIntlCountries.includes(intlDestinationCountry)) {
      setIntlDestinationCountry(availableIntlCountries[0]);
    }
  }, [availableIntlCountries, intlDestinationCountry]);

  // Quotation Dialog States
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRateResult, setSelectedRateResult] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [gstRate, setGstRate] = useState('18');
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState('');

  async function loadData() {
    try {
      const [res, meRes, templatesRes, compRes] = await Promise.all([
        fetch('/api/rate-cards'),
        fetch('/api/auth/me'),
        fetch('/api/quotations/templates'),
        fetch('/api/courier-companies')
      ]);

      if (meRes.ok) {
        const mJson = await meRes.json();
        setUser(mJson.user);
      }

      if (res.ok) {
        const json = await res.json();
        setCustomCards(json.customCards || []);
        setActiveCards([...(json.customCards || []), ...(json.systemCards || [])]);
      }

      if (compRes.ok) {
        const cJson = await compRes.json();
        setCompanies(cJson.companies || []);
      }

      if (templatesRes.ok) {
        const tJson = await templatesRes.json();
        setTemplates(tJson.templates || []);
        const defaultTmpl = (tJson.templates || []).find((t: any) => t.isDefault);
        if (defaultTmpl) {
          setSelectedTemplateId(defaultTmpl.id);
        } else if ((tJson.templates || []).length > 0) {
          setSelectedTemplateId(tJson.templates[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading comparison data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Sync selected system card IDs
  useEffect(() => {
    const stored = localStorage.getItem('selectedSystemRateCards');
    if (stored) {
      setSelectedSystemCardIds(JSON.parse(stored));
    }
  }, []);

  // Load history from localStorage when user is loaded
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`rate_calc_history_${user.id}`);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    }
  }, [user]);

  // Save history item locally
  const saveToHistoryLocal = (userId: string, newItem: any) => {
    setHistory(prevHistory => {
      const updated = [newItem, ...prevHistory].slice(0, 20);
      localStorage.setItem(`rate_calc_history_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Delete individual item
  const handleDeleteItem = (index: number) => {
    if (!user) return;
    setHistory(prevHistory => {
      const updated = prevHistory.filter((_, idx) => idx !== index);
      localStorage.setItem(`rate_calc_history_${user.id}`, JSON.stringify(updated));
      return updated;
    });
    setConfirmDeleteOpen(false);
    setDeleteIndex(null);
  };

  // Clear all history
  const handleClearHistory = () => {
    if (!user) return;
    setHistory([]);
    localStorage.removeItem(`rate_calc_history_${user.id}`);
    setConfirmClearOpen(false);
  };

  // Load old history item
  const handleLoadHistoryItem = (item: any) => {
    setOriginPincode(item.originPincode || '');
    setDestinationPincode(item.destinationPincode || '');
    setWeight(item.weight ? item.weight.toString() : '');
    setServiceMode(item.serviceMode === 'Air' ? 'Air' : 'Surface');
    setServiceType(item.serviceType || 'Domestic');
    setOriginInfo(item.originInfo || null);
    setDestInfo(item.destInfo || null);
    setDetectedRegion(item.detectedRegion || '');
    setRouteSummary(item.originInfo ? `${item.originInfo.city} → ${item.destInfo.city}` : '');
    setRouteClass(item.detectedRegion || '');
    setResults(item.results || []);
    setCalculated(true);
  };

  // Generate screenshot image Blob
  async function generateScreenshotBlob(): Promise<Blob | null> {
    const html2canvas = (await import('html2canvas-pro')).default;
    const element = document.getElementById('share-image-target');
    if (!element) return null;

    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: 2, // High resolution
      backgroundColor: '#ffffff',
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }

  // Download screenshot locally
  async function handleDownloadScreenshot() {
    try {
      const blob = await generateScreenshotBlob();
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `geotransit-rates-${originPincode}-to-${destinationPincode}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Screenshot download failed:', err);
      alert('Failed to generate screenshot.');
    }
  }

  // Share screenshot using Web Share API or download fallback
  async function handleShareScreenshot() {
    try {
      const blob = await generateScreenshotBlob();
      if (!blob) return;

      const file = new File([blob], `geotransit-rates-${originPincode}-to-${destinationPincode}.png`, { type: 'image/png' });

      // Check if native Web Share is supported for files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `GEO TRANSIT Rates Comparison`,
          text: `Rates Comparison from ${originPincode} to ${destinationPincode} (${weight} KG)`,
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `geotransit-rates-${originPincode}-to-${destinationPincode}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        alert('Web Share API is not supported in this browser. The screenshot has been downloaded instead.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Sharing failed:', err);
        // Fallback: download
        handleDownloadScreenshot();
      }
    }
  }

  // Determine if any selected rate card is Cargo (requires Service Mode selector)
  useEffect(() => {
    const selectedCustomIds = customCards.filter(c => c.active && c.useForComparison).map(c => c.id);
    const selectedCargoCount = activeCards.filter(card => {
      const isSelected = card.ownerType === 'USER' 
        ? selectedCustomIds.includes(card.id)
        : (card.active && selectedSystemCardIds.includes(card.id));
      return isSelected && card.rateCardType === 'Cargo';
    }).length;
    setHasCargoCard(selectedCargoCount > 0);
  }, [activeCards, customCards, selectedSystemCardIds]);

  // Compute available active rate cards list for specific selectors dropdown
  const availableActiveCards = activeCards.filter(c => {
    // Standard matches
    const matchesService = c.serviceType === serviceType;
    const matchesCompany = selectedCourierCompanyId === 'ALL' || c.courierCompanyId === selectedCourierCompanyId;
    return matchesService && matchesCompany;
  });

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResults([]);
    setCalculated(false);

    let parsedWeight = 0;

    if (serviceType === 'Domestic') {
      if (!originPincode || !destinationPincode || !weight) {
        setError('Please fill in all comparison fields.');
        return;
      }
      parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        setError('Weight must be a positive number.');
        return;
      }
    } else {
      // INTERNATIONAL VALIDATION
      if (!selectedCourierCompanyId) {
        setError('Please select a courier company.');
        return;
      }
      if (!intlFreightType) {
        setError('Please select a freight type.');
        return;
      }
      if (!intlDestinationCountry) {
        setError('Please select a destination country.');
        return;
      }
      if (!weight) {
        setError('Please enter shipment weight.');
        return;
      }
      parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        setError('Weight must be greater than 0 KG.');
        return;
      }
    }

    setCalculating(true);
    setShowStepProgress(true);

    let queryCardIds: string[] = [];

    if (serviceType === 'International') {
      // Find matching active International rate cards
      const intlCards = activeCards.filter((c) => {
        if (c.serviceType !== 'International') return false;
        if (!c.active) return false;
        if (selectedCourierCompanyId !== 'ALL' && c.courierCompanyId !== selectedCourierCompanyId) return false;
        if (selectedRateCardId !== 'ALL' && c.id !== selectedRateCardId) return false;
        return true;
      });

      if (intlCards.length === 0) {
        const courierName =
          selectedCourierCompanyId !== 'ALL'
            ? companies.find((comp) => comp.id === selectedCourierCompanyId)?.name || ''
            : '';
        setError(
          `No ${intlFreightType} rate is configured for ${intlDestinationCountry}${
            courierName ? ` under ${courierName}` : ''
          }.`
        );
        setCalculating(false);
        setShowStepProgress(false);
        return;
      }

      queryCardIds = intlCards.map((c) => c.id);
    } else {
      // Domestic selection IDs
      const selectedCustomIds = customCards
        .filter((c) => c.active && c.useForComparison && (c.serviceType === 'Domestic' || !c.serviceType))
        .map((c) => c.id);
      const selectedSystemIds = activeCards
        .filter(
          (c) =>
            c.ownerType === 'SYSTEM' &&
            c.active &&
            selectedSystemCardIds.includes(c.id) &&
            (c.serviceType === 'Domestic' || !c.serviceType)
        )
        .map((c) => c.id);
      queryCardIds = [...selectedCustomIds, ...selectedSystemIds];

      if (queryCardIds.length === 0) {
        setError(
          'No rate cards are selected for comparison. Please go to My Rate Cards page and check "Use for Comparison" on your cards.'
        );
        setCalculating(false);
        setShowStepProgress(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/calculator/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originPincode: serviceType === 'Domestic' ? originPincode : undefined,
          destinationPincode: serviceType === 'Domestic' ? destinationPincode : undefined,
          weight: parsedWeight,
          serviceMode: hasCargoCard ? serviceMode : undefined,
          selectedCardIds: queryCardIds,
          serviceType,
          freightType: intlFreightType,
          destinationCountry: intlDestinationCountry,
          courierCompanyId: selectedCourierCompanyId !== 'ALL' ? selectedCourierCompanyId : undefined,
          rateCardId: selectedRateCardId !== 'ALL' ? selectedRateCardId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to compare rates.');
      }

      setDetectedRegion(data.region || intlDestinationCountry);
      setRouteSummary(
        data.routeSummary || (serviceType === 'International' ? `${intlFreightType} → ${intlDestinationCountry}` : '')
      );
      setRouteClass(data.region || intlDestinationCountry);
      setResults(data.results || []);
      setCalculated(true);

      // Save successful calculation to history automatically
      if (user) {
        saveToHistoryLocal(user.id, {
          originPincode: serviceType === 'Domestic' ? originPincode : 'INDIA',
          originInfo: serviceType === 'Domestic' ? data.origin : { city: 'India', state: 'India', geoRegion: 'INTL', zone: 'INTL' },
          destinationPincode: serviceType === 'Domestic' ? destinationPincode : intlDestinationCountry,
          destInfo: serviceType === 'Domestic' ? data.destination : { city: intlDestinationCountry, state: intlDestinationCountry, geoRegion: 'INTL', zone: 'INTL' },
          weight: parsedWeight,
          serviceMode: serviceType === 'Domestic' ? (hasCargoCard ? serviceMode : 'Surface') : intlFreightType,
          serviceType,
          detectedRegion: serviceType === 'Domestic' ? data.region : intlDestinationCountry,
          routeSummary: serviceType === 'Domestic' ? data.routeSummary : `${intlFreightType} → ${intlDestinationCountry}`,
          results: data.results || [],
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while comparing rates.');
    } finally {
      setCalculating(false);
    }
  }

  // Open Quotation Generation Modal
  const openQuoteModal = (result: any) => {
    setSelectedRateResult(result);
    setCustomerName('');
    setCustomerCompany('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerAddress('');
    setAdditionalCharges('0');
    setGstRate('18');
    setQuoteSuccess('');
    setQuoteModalOpen(true);
  };

  // Submit Quotation Generation
  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !selectedTemplateId) {
      alert('Please fill in Customer Name and select a Template.');
      return;
    }

    setSavingQuote(true);
    try {
      const template = templates.find((t: any) => t.id === selectedTemplateId);
      const subtotal = (selectedRateResult.cost || 0) + (parseFloat(additionalCharges) || 0);
      const gst = subtotal * (parseFloat(gstRate) / 100);
      const grandTotal = subtotal + gst;

      const rateCardSource = activeCards.find((c: any) => c.id === selectedRateResult.id);

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
          weight,
          serviceType: selectedRateResult.serviceType,
          rateCardName: selectedRateResult.name,
          pricingMode: selectedRateResult.method,
          chargeableWeight: selectedRateResult.breakdown?.pricingWeight || weight,
          baseRate: selectedRateResult.cost,
          additionalCharges: parseFloat(additionalCharges) || 0.0,
          cargoRate: selectedRateResult.breakdown?.rate || null,
          gstAmount: gst,
          totalAmount: grandTotal,
          validityDays: template?.validityDays || 30,
          rateSnapshot: rateCardSource || {},
          templateSnapshot: template || {},
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQuoteSuccess(`Quotation ${data.quotation.quotationNumber} generated successfully!`);
      setTimeout(() => {
        setQuoteModalOpen(false);
        router.push('/dashboard/quotations');
      }, 1500);
    } catch (err: any) {
      alert('Failed to generate quotation: ' + err.message);
    } finally {
      setSavingQuote(false);
    }
  };

  // Separate eligible results vs. threshold disqualified ones
  const eligibleResults = results.filter(r => r.eligible !== false).sort((a: any, b: any) => a.cost - b.cost);
  const disqualifiedResults = results.filter(r => r.eligible === false);

  const minCost = eligibleResults.length > 0 ? Math.min(...eligibleResults.map((r: any) => r.cost)) : 0;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#107c5a] animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Loading comparison workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-[#0e382c]">Shipping Rate Comparison Calculator</h1>
        <p className="text-xs text-slate-500 mt-1 font-light">
          Compare real-time logistics rates across your selected active custom and system contracts.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-655 border border-red-250 p-4 rounded-xl text-xs font-semibold shadow-sm">
          {error}
        </div>
      )}

      {/* Grid: Inputs Form & Selected Cards summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 h-fit">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calculator className="w-4 h-4 text-[#107c5a]" />
              Calculation Inputs
            </h2>

            {/* Service Type Tab Toggle */}
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setServiceType('Domestic');
                  setSelectedRateCardId('ALL');
                  setCalculated(false);
                }}
                className={`w-full py-1.5 rounded-lg text-xs font-bold transition ${
                  serviceType === 'Domestic'
                    ? 'bg-white text-[#0e382c] shadow-sm'
                    : 'text-slate-455 hover:text-slate-655'
                }`}
              >
                Domestic
              </button>
              <button
                type="button"
                onClick={() => {
                  setServiceType('International');
                  setSelectedRateCardId('ALL');
                  setCalculated(false);
                }}
                className={`w-full py-1.5 rounded-lg text-xs font-bold transition ${
                  serviceType === 'International'
                    ? 'bg-white text-[#0e382c] shadow-sm'
                    : 'text-slate-455 hover:text-slate-655'
                }`}
              >
                International
              </button>
            </div>

            <form onSubmit={handleCompare} className="space-y-4 text-xs">
              {/* Courier Company Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Courier Company</label>
                <select
                  value={selectedCourierCompanyId}
                  onChange={(e) => {
                    setSelectedCourierCompanyId(e.target.value);
                    setSelectedRateCardId('ALL');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-600 focus:outline-none"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Rate Card / Service Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Rate Card / Service</label>
                <select
                  value={selectedRateCardId}
                  onChange={(e) => setSelectedRateCardId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-600 focus:outline-none"
                >
                  <option value="ALL">All Active Slabs</option>
                  {availableActiveCards.map(c => (
                    <option key={c.id} value={c.id}>{c.rateCardName} ({c.courier})</option>
                  ))}
                </select>
              </div>

              {serviceType === 'Domestic' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#1E8262]" />
                      Origin Pincode
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 560001"
                      value={originPincode}
                      onChange={(e) => setOriginPincode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-none focus:bg-white transition text-slate-700 font-mono text-sm tracking-wider"
                      required
                    />
                    {originLoading && <div className="text-[10px] text-slate-450 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin text-[#1E8262]"/>Checking pincode...</div>}
                    {originError && <div className="text-[10px] text-red-500 font-semibold mt-1">{originError}</div>}
                    {!originLoading && !originError && originInfo && (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                        ✓ {originInfo.city}, {originInfo.state}
                        <span className="block text-[9px] text-slate-400 font-light mt-0.5">Region: {originInfo.geoRegion} ({originInfo.zone})</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#1E8262]" />
                      Destination Pincode
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 110001"
                      value={destinationPincode}
                      onChange={(e) => setDestinationPincode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-none focus:bg-white transition text-slate-700 font-mono text-sm tracking-wider"
                      required
                    />
                    {destLoading && <div className="text-[10px] text-slate-450 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin text-[#1E8262]"/>Checking pincode...</div>}
                    {destError && <div className="text-[10px] text-red-500 font-semibold mt-1">{destError}</div>}
                    {!destLoading && !destError && destInfo && (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                        ✓ {destInfo.city}, {destInfo.state}
                        <span className="block text-[9px] text-slate-400 font-light mt-0.5">Region: {destInfo.geoRegion} ({destInfo.zone})</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      International Freight Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIntlFreightType('Air Freight')}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold border transition ${
                          intlFreightType === 'Air Freight'
                            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Air Freight
                      </button>
                      <button
                        type="button"
                        onClick={() => setIntlFreightType('Sea Freight')}
                        className={`py-2 px-3 rounded-lg text-xs font-extrabold border transition ${
                          intlFreightType === 'Sea Freight'
                            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Sea Freight
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Destination Country
                    </label>
                    <select
                      value={intlDestinationCountry}
                      onChange={(e) => setIntlDestinationCountry(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 focus:outline-none"
                      required
                    >
                      {availableIntlCountries.length > 0 ? (
                        availableIntlCountries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No countries configured for {intlFreightType}
                        </option>
                      )}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1 flex items-center gap-1">
                  <Scale className="w-3 h-3 text-[#1E8262]" />
                  Weight (KG)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 2.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:outline-none focus:bg-white transition text-slate-700"
                  required
                />
              </div>

              {hasCargoCard && (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <span className="block text-[9px] font-bold text-slate-455 uppercase mb-2">Service Transport Mode</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setServiceMode('Surface')}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition border ${
                        serviceMode === 'Surface'
                          ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Surface Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceMode('Air')}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition border ${
                        serviceMode === 'Air'
                          ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Air Mode
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  calculating ||
                  (serviceType === 'Domestic' &&
                    (originLoading || destLoading || !!originError || !!destError || !originInfo || !destInfo)) ||
                  (serviceType === 'International' && availableIntlCountries.length === 0)
                }
                className="w-full bg-[#1E8262] hover:bg-[#0F4C3A] disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md text-xs mt-4"
              >
                {calculating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Calculating Rates...
                  </>
                ) : (
                  <>
                    <Calculator className="w-3.5 h-3.5" />
                    Compare Shipping Rates
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Calculation History Card */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#1E8262]" />
                Calculation History ({history.length}/20)
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-light">
                No calculation history yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {history.map((item, idx) => {
                  const eligible = item.results?.filter((r: any) => r.eligible !== false) || [];
                  const cheapest = eligible.length > 0 ? eligible.reduce((min: any, current: any) => current.cost < min.cost ? current : min, eligible[0]) : null;
                  
                  const dateFormatted = formatDateIndian(item.createdAt);
                  const fullDateTime = formatDateTimeIndian(item.createdAt);
                  const timeFormatted = fullDateTime.includes(', ') ? fullDateTime.split(', ')[1] : '';

                  return (
                    <div
                      key={idx}
                      onClick={() => handleLoadHistoryItem(item)}
                      className="group relative p-3 border border-slate-100 hover:border-emerald-250 bg-slate-50/50 hover:bg-emerald-50/10 rounded-xl cursor-pointer transition flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 w-full min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-[11px] text-slate-700 truncate">
                            {cheapest ? `${cheapest.courier} • ${cheapest.service}` : 'No Match'}
                          </span>
                          <span className="font-mono text-emerald-800 font-extrabold text-[11px] shrink-0">
                            {cheapest ? `₹${cheapest.cost}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-600">
                            {item.originPincode} → {item.destinationPincode}
                          </span>
                          <span className="bg-slate-100 group-hover:bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-650 group-hover:text-emerald-800">
                            {item.weight} KG
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-light font-mono">
                          <span>{item.detectedRegion}</span>
                          <span>{dateFormatted} • {timeFormatted}</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteIndex(idx);
                          setConfirmDeleteOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition shrink-0 self-center"
                        title="Delete calculation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Rates Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Comparison Target</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-50 text-emerald-800 text-[10px] px-3 py-1 rounded-full font-bold border border-emerald-100">
                {customCards.filter(c => c.active && c.useForComparison && c.serviceType === serviceType).length} Custom Cards
              </span>
              <span className="bg-teal-50 text-teal-800 text-[10px] px-3 py-1 rounded-full font-bold border border-teal-100">
                {activeCards.filter(c => c.ownerType === 'SYSTEM' && c.active && selectedSystemCardIds.includes(c.id) && c.serviceType === serviceType).length} System Templates
              </span>
            </div>
          </div>

          {/* Results Sheet */}
          {calculated ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Rates Comparison Result ({serviceType})</h3>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    Detected Region: <strong className="text-slate-700">{detectedRegion}</strong> | Cargo Mode:{' '}
                    <strong className="text-slate-700">{hasCargoCard ? serviceMode : 'N/A'}</strong>
                  </p>
                </div>
                <span className="bg-[#E8F5E9] text-[#0F4C3A] text-[10px] font-bold py-1 px-3 rounded-full">
                  {eligibleResults.length} Matches Found
                </span>
              </div>

              {/* Route Summary Box */}
              {originInfo && destInfo && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Origin */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs">
                      A
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">ORIGIN</span>
                      <strong className="block text-slate-800 text-xs font-bold leading-none mt-0.5">{originPincode}</strong>
                      <span className="block text-[10px] text-slate-500 font-light mt-1">
                        {originInfo.city}, {originInfo.state} ({originInfo.geoRegion} • {originInfo.zone})
                      </span>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="text-slate-400 hidden sm:block">
                    <ArrowRight className="w-5 h-5 animate-pulse text-[#1E8262]" />
                  </div>

                  {/* Destination */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center font-black text-xs">
                      B
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">DESTINATION</span>
                      <strong className="block text-slate-800 text-xs font-bold leading-none mt-0.5">{destinationPincode}</strong>
                      <span className="block text-[10px] text-slate-500 font-light mt-1">
                        {destInfo.city}, {destInfo.state} ({destInfo.geoRegion} • {destInfo.zone})
                      </span>
                    </div>
                  </div>

                  {/* Route Classification Badge */}
                  <div className="bg-[#0F4C3A] text-white py-1.5 px-3.5 rounded-xl text-center shadow-sm min-w-[140px]">
                    <span className="block text-[8px] text-slate-350 font-bold uppercase tracking-wider leading-none mb-1">Route Classification</span>
                    <strong className="text-[10px] font-black tracking-widest uppercase block">{routeClass}</strong>
                  </div>
                </div>
              )}

              {/* Share & Screenshot Toolbar */}
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadScreenshot}
                  className="bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-[#0F4C3A] py-1.5 px-3 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  Download Screenshot
                </button>
                <button
                  type="button"
                  onClick={handleShareScreenshot}
                  className="bg-emerald-50 border border-emerald-100 hover:bg-[#1E8262] text-[#0F4C3A] hover:text-white py-1.5 px-3 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#0F4C3A] group-hover:text-white" />
                  Share Result
                </button>
              </div>

              {eligibleResults.length === 0 && disqualifiedResults.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 p-8 text-center rounded-xl text-slate-500 font-medium text-xs">
                  None of the selected rate cards have pricing configured for region "{detectedRegion}".
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Eligible Rate Cards */}
                  {eligibleResults.map((item, index) => {
                    const isCheapest = item.cost === minCost;
                    const isExpanded = expandedCardId === item.id;

                    return (
                      <div
                        key={item.id}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className={`bg-white border rounded-2xl shadow-sm transition-all overflow-hidden hover-lift animate-slide-up ${
                          isCheapest
                            ? 'border-[#107c5a] ring-2 ring-emerald-100 shadow-md'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                          <div className="flex items-start gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                              isCheapest 
                                ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-xs' 
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {item.courier?.[0]?.toUpperCase() || 'C'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-900">{item.name}</span>
                                {isCheapest && (
                                  <span className="bg-[#107c5a] text-white text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                                    ★ BEST PRICE
                                  </span>
                                )}
                              </div>
                              <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                                Courier: <strong className="text-slate-700 font-bold">{item.courier}</strong> | Service: <span className="font-semibold">{item.service}</span> | Method: {item.method}
                                {item.tat && <> | <span className="font-bold text-[#0F4C3A]">TAT: {item.tat}</span></>}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right mr-2">
                              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Est. Price</span>
                              <span className="text-xl font-black text-[#0F4C3A] leading-none block mt-1">
                                ₹{item.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              {item.tat && (
                                <span className="block text-[10px] font-extrabold text-emerald-800 mt-0.5">
                                  EST. TAT: {item.tat}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => openQuoteModal(item)}
                              className="bg-emerald-50 hover:bg-[#1E8262] text-[#0F4C3A] hover:text-white py-1.5 px-3 rounded-lg text-[10px] font-bold border border-emerald-100 transition shadow-sm flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Generate Quotation
                            </button>

                            <button
                              onClick={() => setExpandedCardId(isExpanded ? null : item.id)}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-100 p-4 text-xs font-medium text-slate-600 space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                              <span className="font-bold uppercase text-[9px] text-slate-400">Calculation Method</span>
                              <span className="text-slate-800 font-bold">{item.method}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                              <span className="font-bold uppercase text-[9px] text-slate-400">Formula</span>
                              <span className="text-slate-800 font-mono font-bold">{item.formula}</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-inner mt-2">
                              <span className="block font-bold uppercase text-[9px] text-slate-400 mb-2">Math Breakdown Details</span>
                              {item.method === 'Cargo' ? (
                                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Rate per KG</span>
                                    <strong className="text-slate-700">₹{item.breakdown.rate}</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Chargeable Weight</span>
                                    <strong className="text-slate-700">{item.breakdown.pricingWeight} KG</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Total Cost</span>
                                    <strong className="text-[#1E8262]">₹{item.cost}</strong>
                                  </div>
                                </div>
                              ) : item.method.includes('Slab') ? (
                                <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Base Rate</span>
                                    <strong className="text-slate-700">₹{item.breakdown.baseRate}</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Extra 500g Slabs</span>
                                    <strong className="text-slate-700">{item.breakdown.extraSlabs || 0}</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Rate per Slab</span>
                                    <strong className="text-slate-700">₹{item.breakdown.extraRate || 0}</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Total Cost</span>
                                    <strong className="text-[#1E8262]">₹{item.cost}</strong>
                                  </div>
                                </div>
                              ) : item.method === 'LTL/PTL' ? (
                                <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Weight Range</span>
                                    <strong className="text-slate-700">{item.breakdown.weightRange}</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Per KG Rate</span>
                                    <strong className="text-slate-700">₹{item.breakdown.rate}/KG</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Chargeable Weight</span>
                                    <strong className="text-slate-700">{item.breakdown.pricingWeight} KG</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Total Cost</span>
                                    <strong className="text-[#1E8262]">₹{item.cost}</strong>
                                  </div>
                                </div>
                              ) : item.serviceType === 'International' ? (
                                <div className="space-y-3 text-[11px]">
                                  <div className="grid grid-cols-5 gap-2 text-center">
                                    <div className="bg-slate-50 p-2 rounded">
                                      <span className="block text-[9px] text-slate-400 uppercase font-light">Per KG Rate</span>
                                      <strong className="text-slate-700">₹{item.perKgRate}/KG</strong>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                      <span className="block text-[9px] text-slate-400 uppercase font-light">Weight</span>
                                      <strong className="text-slate-700">{weight} KG</strong>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                      <span className="block text-[9px] text-slate-400 uppercase font-light">Base Freight</span>
                                      <strong className="text-slate-700">₹{item.baseFreight}</strong>
                                    </div>
                                    <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                                      <span className="block text-[9px] text-emerald-800 uppercase font-bold">Estimated TAT</span>
                                      <strong className="text-emerald-900 font-extrabold">{item.tat || 'N/A'}</strong>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded">
                                      <span className="block text-[9px] text-slate-400 uppercase font-light">Total Charge</span>
                                      <strong className="text-[#1E8262]">₹{item.cost}</strong>
                                    </div>
                                  </div>
                                  {item.otherCharges && item.otherCharges.length > 0 && (
                                    <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border border-slate-200">
                                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Other Charges Breakdown</span>
                                      {item.otherCharges.map((c: any) => (
                                        <div key={c.name} className="flex justify-between items-center text-xs">
                                          <span className="font-semibold text-slate-700">
                                            {c.name}{' '}
                                            <span className="text-[10px] text-slate-400 font-normal">
                                              ({c.percentage ? `${c.percentage}%` : ''}{c.percentage && c.fixedRate ? ' + ' : ''}{c.fixedRate ? `₹${c.fixedRate}` : ''})
                                            </span>
                                          </span>
                                          <strong className="font-mono text-[#0F4C3A]">₹{c.amount}</strong>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Per KG Rate</span>
                                    <strong className="text-slate-700">₹{item.breakdown.rate}</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Chargeable Weight</span>
                                    <strong className="text-slate-700">{item.breakdown.pricingWeight} KG</strong>
                                  </div>
                                  <div className="bg-slate-50 p-2 rounded">
                                    <span className="block text-[9px] text-slate-400 uppercase font-light">Total Cost</span>
                                    <strong className="text-[#1E8262]">₹{item.cost}</strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Disqualified/Exceeded Threshold Rate Cards */}
                  {disqualifiedResults.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                        Unavailable Rate Cards (Limit / Rule Exceeded)
                      </h4>
                      {disqualifiedResults.map((item) => (
                        <div key={item.id} className="bg-red-50/30 border border-red-100 p-4 rounded-xl flex items-center justify-between gap-4 text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <div>
                              <span className="block font-bold text-slate-800">{item.name} ({item.courier})</span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">{item.errorMessage}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-red-650 bg-red-50 border border-red-150 py-0.5 px-2.5 rounded-full uppercase tracking-wider">
                            Ineligible
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Packaging entry point */}
                  <div className="bg-[#E8F5E9]/30 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between mt-6 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Need packaging for your shipment?</h4>
                      <p className="text-[10px] text-slate-500 font-light mt-0.5">Order heavy-duty boxes, stretch wraps, or packaging tapes directly.</p>
                    </div>
                    <button
                      onClick={() => router.push('/dashboard/packaging')}
                      className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white py-1.5 px-4 rounded-xl text-[10px] font-bold transition shadow-sm shrink-0"
                    >
                      Shop Packaging Materials
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-12 text-center rounded-2xl shadow-sm">
              <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">Compare Shipping Rates</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-normal font-light">
                Fill in the Origin Pincode, Destination Pincode and Weight, then click compare to find the most cost-effective contract.
              </p>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-2.5">Need packaging materials?</p>
                <button
                  onClick={() => router.push('/dashboard/packaging')}
                  className="bg-emerald-50 hover:bg-[#1E8262] text-[#0F4C3A] hover:text-white py-2 px-4 rounded-xl text-xs font-bold border border-emerald-100 transition shadow-sm"
                >
                  Visit Packaging Shop
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEW CUSTOMER QUOTATION PREVIEW & EXPORT MODAL */}
      {quoteModalOpen && selectedRateResult && (
        <ExportRateQuoteModal
          isOpen={quoteModalOpen}
          onClose={() => setQuoteModalOpen(false)}
          selectedRateResult={selectedRateResult}
          originPincode={originPincode}
          destinationPincode={destinationPincode}
          weight={weight}
          userName={user?.name || 'User'}
          originInfo={originInfo}
          destInfo={destInfo}
          detectedRegion={detectedRegion}
          serviceMode={serviceMode}
          templates={templates}
          activeCards={activeCards}
        />
      )}
      {/* CLEAR HISTORY CONFIRMATION MODAL */}
      <Modal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear History"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-slate-700 font-bold text-sm">Clear all calculation history?</p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmClearOpen(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-5 rounded-lg text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              className="bg-red-650 hover:bg-red-700 text-white py-2 px-5 rounded-lg text-xs font-bold transition shadow-md"
            >
              Clear History
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE INDIVIDUAL ITEM CONFIRMATION MODAL */}
      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setDeleteIndex(null);
        }}
        title="Delete Calculation"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <p className="text-slate-700 font-bold text-sm">Remove this calculation from history?</p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteOpen(false);
                setDeleteIndex(null);
              }}
              className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 px-5 rounded-lg text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteIndex !== null) {
                  handleDeleteItem(deleteIndex);
                }
              }}
              className="bg-red-650 hover:bg-red-700 text-white py-2 px-5 rounded-lg text-xs font-bold transition shadow-md"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* OFF-SCREEN SCREENSHOT TARGET */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div id="share-image-target" className="w-[600px] bg-white p-8 border border-slate-200 text-slate-800 space-y-6 font-sans">
          
          {/* Header Branding */}
          <div className="bg-[#0F4C3A] text-white p-6 rounded-xl flex justify-between items-center">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">GEO SAM</h2>
              <p className="text-[10px] text-emerald-100 uppercase tracking-widest mt-0.5">Enterprise Logistics Utility</p>
            </div>
            <div className="text-right">
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-200">Rate Quotation Summary</span>
              <span className="text-[9px] text-slate-350 block mt-0.5">Generated: {formatDateTimeIndian(new Date())}</span>
            </div>
          </div>

          {/* Route & Weight Info */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase">Origin</span>
              <strong className="block text-slate-800 text-xs mt-0.5">{originPincode}</strong>
              <span className="text-[10px] text-slate-550 block mt-0.5 font-medium">
                {originInfo?.city}, {originInfo?.state}
              </span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase">Destination</span>
              <strong className="block text-slate-800 text-xs mt-0.5">{destinationPincode}</strong>
              <span className="text-[10px] text-slate-550 block mt-0.5 font-medium">
                {destInfo?.city}, {destInfo?.state}
              </span>
            </div>
          </div>

          {/* Weight & Region */}
          <div className="grid grid-cols-3 gap-4 text-center border-b border-slate-150 pb-4">
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase">Actual Weight</span>
              <strong className="block text-sm text-slate-700 mt-0.5">{weight} KG</strong>
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase">Route Class</span>
              <strong className="block text-sm text-slate-700 mt-0.5">{detectedRegion || routeClass}</strong>
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase">Service Mode</span>
              <strong className="block text-sm text-slate-700 mt-0.5">{hasCargoCard ? serviceMode : 'Surface'}</strong>
            </div>
          </div>

          {/* Cost Comparison Results Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-650 uppercase tracking-wider">Applicable Courier Rates</h3>
            <table className="w-full text-left text-xs border border-slate-150 rounded-lg overflow-hidden">
              <thead className="bg-slate-50 text-slate-505 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2">Courier / Service</th>
                  <th className="px-4 py-2">Pricing Model</th>
                  <th className="px-4 py-2 text-right">Estimated Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eligibleResults.map((item: any, idx: number) => (
                  <tr key={idx} className={item.cost === minCost ? 'bg-emerald-50/20 font-bold' : ''}>
                    <td className="px-4 py-3">
                      <span className="block text-slate-800 font-bold">{item.name}</span>
                      <span className="block text-[10px] text-slate-400">{item.courier} • {item.service}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-505">{item.method}</td>
                    <td className="px-4 py-3 text-right text-slate-900 font-bold">
                      ₹{item.cost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {item.cost === minCost && (
                        <span className="block text-[8px] text-emerald-600 font-black uppercase tracking-wider mt-0.5">Best Option</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer info */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 font-light">
            Thank you for choosing GEO SAM. This rate summary is for comparison purposes only.
          </div>

        </div>
      </div>

      <CalculationStepProgress
        active={showStepProgress}
        onComplete={() => setShowStepProgress(false)}
        title="Comparing Courier Rates"
      />
    </div>
  );
}
