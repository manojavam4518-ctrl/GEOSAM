'use client';

import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Barcode,
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
  EyeOff,
  ArrowRight,
  Shield,
  Layers,
  Scale,
  MapPin,
  Clock,
  Sparkles,
  ChevronDown,
  Building2,
  Upload,
  Loader2,
  FileSpreadsheet,
  XCircle,
  Check,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import ShippingLabelCard from '@/components/ShippingLabelCard';
import BarcodeGeneratorControl from '@/components/BarcodeGeneratorControl';
import AddressPrintControl from '@/components/AddressPrintControl';
import LabelPreviewStage from '@/components/LabelPreviewStage';
import LabelPreviewZoomToolbar from '@/components/LabelPreviewZoomToolbar';
import {
  exportShippingLabelToExcel,
  exportShippingLabelToWord,
} from '@/utils/shippingLabelDocumentExport';
import { BarcodeFormat } from '@/utils/barcodeEnhance';
import {
  generateShippingLabelPDF,
  generateBulkShippingLabelsPDF,
  downloadShippingLabelPNG,
  printShippingLabel,
} from '@/utils/shippingLabelExport';
import {
  downloadBulkExcelTemplate,
  parseAndValidateBulkExcel,
  downloadBulkErrorReport,
  generateBulkBarcodeDataUrl,
  generateBulkQrDataUrl,
  BulkShipmentRow,
  BulkValidationSummary,
} from '@/utils/shippingLabelBulk';
import {
  ShippingLabelTemplateData,
  DEFAULT_MASTER_TEMPLATE,
  generateTrackingNumber,
  PRINT_SIZE_OPTIONS,
  PrintSizeOption,
  SYSTEM_COURIER_COMPANIES,
  CourierCompanyOption,
  DEFAULT_GEO_TRANSIT_LOGO,
  parsePackageCount,
  formatPackageSequence,
} from '@/lib/shippingLabel';
import { resolveCourierLogo } from '@/utils/courierLogos';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  CountryCode,
  parseMobileAndCountry,
} from '@/lib/countryCodes';

const PREDEFINED_MODES = ['SURFACE', 'AIR', 'EXPRESS', 'EXPRESS BEES'];
const CUSTOM_MODES_STORAGE_KEY = 'geo_shipping_label_custom_modes';

export default function ShippingLabelGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'address-print' | 'create' | 'multiple-barcode' | 'bulk' | 'history'>('address-print');
  const [templates, setTemplates] = useState<ShippingLabelTemplateData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ShippingLabelTemplateData | null>(null);
  const [selectedPrintSize, setSelectedPrintSize] = useState<PrintSizeOption>(PRINT_SIZE_OPTIONS[0]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Multiple Barcode Label State
  const [multiBarcodeValue, setMultiBarcodeValue] = useState<string>(
    'GT2610311173, GT2610311173, GT2610311173, GT2610311173, GT2610311173, GT2610311173'
  );
  const [multiBarcodeType, setMultiBarcodeType] = useState<BarcodeFormat>('CODE128');
  const [multiBarcodeWidth, setMultiBarcodeWidth] = useState<number>(4.0);
  const [multiBarcodeHeight, setMultiBarcodeHeight] = useState<number>(2.0);

  // Bulk Excel Upload State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkValidation, setBulkValidation] = useState<BulkValidationSummary | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFilter, setBulkFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [bulkGeneratedLabels, setBulkGeneratedLabels] = useState<BulkShipmentRow[] | null>(null);
  const [bulkGeneratedDataUrls, setBulkGeneratedDataUrls] = useState<Record<string, { qr: string; barcode: string }>>({});
  const [bulkAllowValidOnly, setBulkAllowValidOnly] = useState(false);
  const [bulkActivePreviewIndex, setBulkActivePreviewIndex] = useState(0);

  // Historical Address Print Data
  const [historicalAddressData, setHistoricalAddressData] = useState<any>(null);

  // Universal Independent Zoom States
  const [createLabelZoom, setCreateLabelZoom] = useState<number>(1.0);
  const [bulkPreviewZoom, setBulkPreviewZoom] = useState<number>(1.0);
  const [historyPreviewZoom, setHistoryPreviewZoom] = useState<number>(1.0);
  const [historyPreviewModalItem, setHistoryPreviewModalItem] = useState<any>(null);

  // Adjust default zoom on print size change
  useEffect(() => {
    if (selectedPrintSize.id === 'a4') {
      setCreateLabelZoom(0.5);
    } else {
      setCreateLabelZoom(1.0);
    }
  }, [selectedPrintSize.id]);


  // Courier Company Brand Selection State
  const [courierOptions, setCourierOptions] = useState<CourierCompanyOption[]>(SYSTEM_COURIER_COMPANIES);
  const [selectedCourierOption, setSelectedCourierOption] = useState<string>('GEO TRANSIT');
  const [customCourierName, setCustomCourierName] = useState<string>('');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [effectiveCourierName, setEffectiveCourierName] = useState<string>('GEO TRANSIT');
  const [effectiveCourierLogo, setEffectiveCourierLogo] = useState<string | undefined>(DEFAULT_GEO_TRANSIT_LOGO);

  // Dynamically compute active template with the selected print size dimensions & courier branding
  const activeTemplate = React.useMemo(() => {
    if (!selectedTemplate) return null;
    return {
      ...selectedTemplate,
      sizePreset: selectedPrintSize.id,
      widthInches: selectedPrintSize.widthInches,
      heightInches: selectedPrintSize.heightInches,
      widthMm: selectedPrintSize.widthMm,
      heightMm: selectedPrintSize.heightMm,
      headerText: effectiveCourierName,
      logoUrl: effectiveCourierLogo !== undefined ? effectiveCourierLogo : selectedTemplate.logoUrl,
    };
  }, [selectedTemplate, selectedPrintSize, effectiveCourierName, effectiveCourierLogo]);

  // Form Data State
  const [formData, setFormData] = useState<Record<string, any>>({
    courier_company: 'GEO TRANSIT',
    recipient_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
    contact_person_name: '',
    include_contact_person_on_label: false,
    mobile: '',
    service: 'LITE',
    service_type: 'STD EXP-A',
    origin_code: 'BOM',
    destination_code: 'DEL',
    payment_status: 'PREPAID',
    amount_to_collect: 0,
    tracking_number: '',
    barcode_type: 'CODE128' as BarcodeFormat,
    barcode_width_in: 2.75,
    barcode_height_in: 0.65,
    package_count: 1,
    route_location: 'NORTH HUB / R-04',
    weight: 1.0,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    mode: 'SURFACE',
  });

  // Country selection & Pincode Lookup
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [mobileDigits, setMobileDigits] = useState<string>('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Service & Service Type dynamic options
  const [serviceOptions, setServiceOptions] = useState<string[]>([
    'LITE',
    'CARGO',
    'EXPRESS',
    'STANDARD',
  ]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [customServiceInput, setCustomServiceInput] = useState('');

  const [serviceTypeOptions, setServiceTypeOptions] = useState<string[]>([
    'STD EXP-A',
    'PRIORITY',
    'ECONOMY',
    'SAME DAY',
  ]);
  const [isAddingServiceType, setIsAddingServiceType] = useState(false);
  const [customServiceTypeInput, setCustomServiceTypeInput] = useState('');

  // Mode dynamic options & custom dropdown state
  const [modeOptions, setModeOptions] = useState<string[]>(PREDEFINED_MODES);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [customModeInput, setCustomModeInput] = useState('');
  const [modeToDelete, setModeToDelete] = useState<string | null>(null);

  // Load custom modes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_MODES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed
            .map((s: string) => String(s).trim().toUpperCase())
            .filter((s: string) => s && !PREDEFINED_MODES.includes(s));
          if (valid.length > 0) {
            setModeOptions([...PREDEFINED_MODES, ...valid]);
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Additional Details Section Visibility Toggle
  const [hideAdditionalDetails, setHideAdditionalDetails] = useState(false);

  const filteredCountries = React.useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsCountryDropdownOpen(false);
    setCountrySearch('');
    setMobileError('');

    let newDigits = mobileDigits;
    if (country.code === 'IN' && newDigits.length > 10) {
      newDigits = newDigits.slice(0, 10);
      setMobileDigits(newDigits);
    }
    const full = newDigits ? `${country.dialCode} ${newDigits}` : '';
    setFormData((prev) => ({ ...prev, mobile: full }));
  };

  const [mobileError, setMobileError] = useState<string>('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeSuccess, setPincodeSuccess] = useState(false);

  const lookupPincode = React.useCallback(async (code: string) => {
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setPincodeError('');
      setPincodeSuccess(false);
      return;
    }

    setPincodeLoading(true);
    setPincodeError('');
    setPincodeSuccess(false);

    try {
      let resolvedCity = '';
      let resolvedState = '';

      // 1. Try local server-side database lookup first
      try {
        const res = await fetch(`/api/pincode/${cleanCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.info && data.info.city && data.info.city !== 'Unknown City') {
            resolvedCity = data.info.city;
            resolvedState = data.info.state;
          }
        }
      } catch {
        // Fall back to external
      }

      // 2. Fall back to India Post postal API if local didn't resolve full city
      if (!resolvedCity || resolvedCity === 'Unknown City' || !resolvedState) {
        try {
          const postRes = await fetch(`https://api.postalpincode.in/pincode/${cleanCode}`);
          const postData = await postRes.json();
          if (Array.isArray(postData) && postData[0]?.Status === 'Success' && postData[0]?.PostOffice?.length > 0) {
            const po = postData[0].PostOffice[0];
            resolvedCity = po.District || po.Block || po.Circle || po.Name || '';
            resolvedState = po.State || '';
          }
        } catch {
          // Handled below
        }
      }

      if (resolvedCity && resolvedState) {
        if (resolvedCity.toLowerCase() === 'bangalore') {
          resolvedCity = 'Bengaluru';
        }
        setFormData((prev) => ({
          ...prev,
          city: resolvedCity,
          state: resolvedState,
        }));
        setPincodeSuccess(true);
        setPincodeError('');
      } else {
        setPincodeError('Pincode not found or invalid');
        setPincodeSuccess(false);
      }
    } catch {
      setPincodeError('Failed to lookup pincode');
      setPincodeSuccess(false);
    } finally {
      setPincodeLoading(false);
    }
  }, []);

  const handleMobileDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, '');
    let finalDigits = clean;
    if (selectedCountry.code === 'IN') {
      if (clean.length > 10) {
        setMobileError('Accepts only 10 digits');
        finalDigits = clean.slice(0, 10);
      } else {
        setMobileError('');
        finalDigits = clean;
      }
    } else {
      setMobileError('');
      const max = selectedCountry.maxLength || 15;
      finalDigits = clean.slice(0, max);
    }
    setMobileDigits(finalDigits);
    const full = finalDigits ? `${selectedCountry.dialCode} ${finalDigits}` : '';
    setFormData((prev) => ({ ...prev, mobile: full }));
  };

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
    loadCourierCompanies();
    handleGenerateNewTracking();
  }, []);

  async function loadCourierCompanies() {
    try {
      const res = await fetch('/api/couriers');
      if (res.ok) {
        const data = await res.json();
        if (data.couriers && data.couriers.length > 0) {
          setCourierOptions((prev) => {
            const names = new Set(prev.map((c) => c.name.toLowerCase()));
            const extra = data.couriers
              .filter((c: any) => !names.has(c.name.toLowerCase()))
              .map((c: any) => ({
                id: c.id,
                name: c.name,
                logoUrl: resolveCourierLogo(c.name) || undefined,
              }));
            return [...prev, ...extra];
          });
        }
      }
    } catch {
      // Fallback seamlessly to SYSTEM_COURIER_COMPANIES
    }
  }

  function handleCourierChange(val: string) {
    setSelectedCourierOption(val);
    if (val !== 'CUSTOM') {
      const match = courierOptions.find((c) => c.name === val);
      const logo = match?.logoUrl || resolveCourierLogo(val) || undefined;
      setEffectiveCourierName(val);
      setEffectiveCourierLogo(logo);
      handleInputChange('courier_company', val);
    } else {
      const name = customCourierName.trim() || 'Custom Courier';
      setEffectiveCourierName(name);
      setEffectiveCourierLogo(customLogoUrl || undefined);
      handleInputChange('courier_company', name);
    }
  }

  function handleCustomCourierNameChange(val: string) {
    setCustomCourierName(val);
    const effective = val.trim() || 'Custom Courier';
    setEffectiveCourierName(effective);
    handleInputChange('courier_company', effective);
  }

  function handleCustomLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomLogoUrl(base64);
      setEffectiveCourierLogo(base64);
    };
    reader.readAsDataURL(file);
  }

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

  // Service & Service Type manual add handlers
  function handleServiceChange(val: string) {
    if (val === '__ADD_SERVICE__') {
      setIsAddingService(true);
      setCustomServiceInput('');
    } else {
      setIsAddingService(false);
      handleInputChange('service', val);
    }
  }

  function handleSaveCustomService() {
    const trimmed = customServiceInput.trim().toUpperCase();
    if (trimmed) {
      if (!serviceOptions.includes(trimmed)) {
        setServiceOptions((prev) => [...prev, trimmed]);
      }
      handleInputChange('service', trimmed);
    }
    setIsAddingService(false);
    setCustomServiceInput('');
  }

  function handleServiceTypeChange(val: string) {
    if (val === '__ADD_SERVICE_TYPE__') {
      setIsAddingServiceType(true);
      setCustomServiceTypeInput('');
    } else {
      setIsAddingServiceType(false);
      handleInputChange('service_type', val);
    }
  }

  function handleSaveCustomServiceType() {
    const trimmed = customServiceTypeInput.trim().toUpperCase();
    if (trimmed) {
      if (!serviceTypeOptions.includes(trimmed)) {
        setServiceTypeOptions((prev) => [...prev, trimmed]);
      }
      handleInputChange('service_type', trimmed);
    }
    setIsAddingServiceType(false);
    setCustomServiceTypeInput('');
  }

  // Mode manual add & delete handlers
  function handleModeChange(val: string) {
    if (val === '__ADD_MODE__') {
      setIsAddingMode(true);
      setCustomModeInput('');
      setIsModeDropdownOpen(false);
    } else {
      setIsAddingMode(false);
      handleInputChange('mode', val);
      setIsModeDropdownOpen(false);
    }
  }

  function handleSaveCustomMode() {
    const trimmed = customModeInput.trim().toUpperCase();
    if (trimmed) {
      if (!modeOptions.includes(trimmed)) {
        const updated = [...modeOptions, trimmed];
        setModeOptions(updated);
        try {
          const customOnly = updated.filter((m) => !PREDEFINED_MODES.includes(m));
          localStorage.setItem(CUSTOM_MODES_STORAGE_KEY, JSON.stringify(customOnly));
        } catch {}
      }
      handleInputChange('mode', trimmed);
    }
    setIsAddingMode(false);
    setCustomModeInput('');
    setIsModeDropdownOpen(false);
  }

  function handleConfirmDeleteMode(modeNameToDelete: string) {
    const updated = modeOptions.filter((m) => m !== modeNameToDelete);
    setModeOptions(updated);
    try {
      const customOnly = updated.filter((m) => !PREDEFINED_MODES.includes(m));
      localStorage.setItem(CUSTOM_MODES_STORAGE_KEY, JSON.stringify(customOnly));
    } catch {}
    if (formData.mode === modeNameToDelete) {
      handleInputChange('mode', PREDEFINED_MODES[0]); // fallback to 'SURFACE'
    }
    setModeToDelete(null);
  }

  // Validate all mandatory fields with * for single label creation
  function validateSingleLabelForm(): boolean {
    if (!formData.tracking_number || !formData.tracking_number.trim()) {
      setFeedback({ type: 'error', message: 'Tracking / Consignment Number is required.' });
      return false;
    }
    if (!formData.recipient_name || !formData.recipient_name.trim()) {
      setFeedback({ type: 'error', message: 'Recipient / Company Name is required.' });
      return false;
    }
    if (selectedCountry.code === 'IN') {
      if (!mobileDigits || mobileDigits.length !== 10) {
        setFeedback({
          type: 'error',
          message: 'Indian mobile number must contain exactly 10 digits.',
        });
        return false;
      }
    } else {
      const min = selectedCountry.minLength || 7;
      if (!mobileDigits || mobileDigits.length < min) {
        setFeedback({
          type: 'error',
          message: `Mobile number for ${selectedCountry.name} must be at least ${min} digits.`,
        });
        return false;
      }
    }
    if (!formData.address_line_1 || !formData.address_line_1.trim()) {
      setFeedback({ type: 'error', message: 'Address Line 1 is required.' });
      return false;
    }
    if (!formData.city || !formData.city.trim()) {
      setFeedback({ type: 'error', message: 'City is required.' });
      return false;
    }
    if (!formData.state || !formData.state.trim()) {
      setFeedback({ type: 'error', message: 'State is required.' });
      return false;
    }
    if (!formData.pincode || !formData.pincode.trim()) {
      setFeedback({ type: 'error', message: 'Pincode is required.' });
      return false;
    }
    if (formData.pincode.trim().length !== 6) {
      setFeedback({ type: 'error', message: 'Pincode must contain exactly 6 digits.' });
      return false;
    }
    if (!formData.payment_status) {
      setFeedback({ type: 'error', message: 'Payment Mode is required.' });
      return false;
    }
    if (formData.payment_status === 'COD') {
      const amt = Number(formData.amount_to_collect);
      if (isNaN(amt) || amt <= 0) {
        setFeedback({ type: 'error', message: 'Amount to Collect is required for Cash on Delivery (COD).' });
        return false;
      }
    }
    if (formData.weight === undefined || formData.weight === '' || isNaN(Number(formData.weight)) || Number(formData.weight) <= 0) {
      setFeedback({ type: 'error', message: 'Valid Weight (kg) is required.' });
      return false;
    }
    if (selectedCourierOption === 'CUSTOM' && !customCourierName.trim()) {
      setFeedback({ type: 'error', message: 'Courier Company Name is required.' });
      return false;
    }
    return true;
  }

  // Save / Persist Label
  async function handleSaveLabel() {
    if (!validateSingleLabelForm()) return;

    setSavingLabel(true);
    setFeedback(null);
    try {
      const templateId = selectedTemplate?.id;
      const totalCount = parsePackageCount(formData.package_count);
      const res = await fetch('/api/organization/shipping-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          ...formData,
          hide_additional_details: hideAdditionalDetails,
          package_count: totalCount > 1 ? `${totalCount} Packages` : '01 / 01',
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
    if (!validateSingleLabelForm()) return;
    const templateToUse = activeTemplate || selectedTemplate;
    if (!templateToUse) return;
    try {
      const doc = await generateShippingLabelPDF({
        template: templateToUse,
        data: {
          ...formData,
          hide_additional_details: hideAdditionalDetails,
        },
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
    if (!validateSingleLabelForm()) return;
    const totalCount = parsePackageCount(formData.package_count);
    const elementIds = Array.from({ length: totalCount }).map((_, i) =>
      i === 0 ? 'user-label-live-preview' : `user-label-live-preview-${i}`
    );
    const success = await downloadShippingLabelPNG(elementIds, formData.tracking_number);
    if (!success) {
      alert('Failed to export PNG image.');
    }
  }

  // Export Excel
  async function handleDownloadExcel() {
    if (!validateSingleLabelForm()) return;
    const totalCount = parsePackageCount(formData.package_count);
    const toAddr = [formData.address_line_1, formData.address_line_2].filter(Boolean).join(', ');
    try {
      await exportShippingLabelToExcel({
        toName: formData.recipient_name || '',
        toContactPerson: formData.contact_person_name || '',
        toIncludeContactPerson: Boolean(formData.include_contact_person_on_label),
        toAddress: toAddr,
        toCity: formData.city || '',
        toState: formData.state || '',
        toPincode: formData.pincode || '',
        toMobile: formData.mobile || '',

        fromName: effectiveCourierName || formData.courier_company || 'GEO TRANSIT EXPRESS LOGISTICS',
        fromContactPerson: 'Dispatch Hub Operations',
        fromIncludeContactPerson: false,
        fromAddress: `${formData.origin_code || 'BOM'} Logistics Central Hub`,
        fromCity: 'Central Gateway',
        fromState: 'HUB',
        fromPincode: '400001',
        fromMobile: '+91 1800 200 436',

        trackingNumber: formData.tracking_number || '',
        courierCompany: effectiveCourierName || formData.courier_company,
        quantity: totalCount,
        barcodeDataUrl: barcodeDataUrl || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Excel shipping label downloaded successfully (${totalCount} ${totalCount > 1 ? 'copies' : 'copy'})!`,
      });
    } catch (err) {
      console.error('Failed to export Excel label:', err);
      setFeedback({
        type: 'error',
        message: 'Failed to generate Excel shipping label.',
      });
    }
  }

  // Export Word
  async function handleDownloadWord() {
    if (!validateSingleLabelForm()) return;
    const totalCount = parsePackageCount(formData.package_count);
    const toAddr = [formData.address_line_1, formData.address_line_2].filter(Boolean).join(', ');
    try {
      await exportShippingLabelToWord({
        toName: formData.recipient_name || '',
        toContactPerson: formData.contact_person_name || '',
        toIncludeContactPerson: Boolean(formData.include_contact_person_on_label),
        toAddress: toAddr,
        toCity: formData.city || '',
        toState: formData.state || '',
        toPincode: formData.pincode || '',
        toMobile: formData.mobile || '',

        fromName: effectiveCourierName || formData.courier_company || 'GEO TRANSIT EXPRESS LOGISTICS',
        fromContactPerson: 'Dispatch Hub Operations',
        fromIncludeContactPerson: false,
        fromAddress: `${formData.origin_code || 'BOM'} Logistics Central Hub`,
        fromCity: 'Central Gateway',
        fromState: 'HUB',
        fromPincode: '400001',
        fromMobile: '+91 1800 200 436',

        trackingNumber: formData.tracking_number || '',
        courierCompany: effectiveCourierName || formData.courier_company,
        quantity: totalCount,
        barcodeDataUrl: barcodeDataUrl || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Word shipping label (.docx) downloaded successfully (${totalCount} ${totalCount > 1 ? 'copies' : 'copy'})!`,
      });
    } catch (err) {
      console.error('Failed to export Word label:', err);
      setFeedback({
        type: 'error',
        message: 'Failed to generate Word shipping label.',
      });
    }
  }

  // Print
  function handlePrint() {
    if (!validateSingleLabelForm()) return;
    const totalCount = parsePackageCount(formData.package_count);
    const elementIds = Array.from({ length: totalCount }).map((_, i) =>
      i === 0 ? 'user-label-live-preview' : `user-label-live-preview-${i}`
    );
    printShippingLabel(
      elementIds,
      selectedPrintSize.widthInches,
      selectedPrintSize.heightInches
    );
  }

  // Bulk Excel Upload Handlers
  async function handleBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processBulkExcelFile(file);
    e.target.value = '';
  }

  async function processBulkExcelFile(file: File) {
    setBulkLoading(true);
    setBulkFile(file);
    setBulkValidation(null);
    setBulkGeneratedLabels(null);
    setBulkGeneratedDataUrls({});
    setBulkAllowValidOnly(false);
    setBulkActivePreviewIndex(0);

    try {
      const summary = await parseAndValidateBulkExcel(file, {
        validModes: modeOptions,
        validServices: serviceOptions,
        validServiceTypes: serviceTypeOptions,
      });
      setBulkValidation(summary);
      if (summary.hasErrors) {
        setFeedback({
          type: 'error',
          message: `Excel contains ${summary.invalidRecords} invalid row(s). Review validation details below.`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `Excel file validated successfully! All ${summary.validRecords} records are valid.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to read Excel file.',
      });
      setBulkFile(null);
    } finally {
      setBulkLoading(false);
    }
  }

  function handleDownloadExcelTemplate() {
    downloadBulkExcelTemplate();
  }

  function handleDownloadErrorReport() {
    if (!bulkValidation) return;
    downloadBulkErrorReport(bulkValidation.rows);
  }

  async function handleGenerateBulkLabels() {
    if (!bulkValidation) return;

    const rowsToGenerate = bulkAllowValidOnly
      ? bulkValidation.rows.filter((r) => r.isValid)
      : bulkValidation.hasErrors
      ? []
      : bulkValidation.rows.filter((r) => r.isValid);

    if (rowsToGenerate.length === 0) {
      setFeedback({
        type: 'error',
        message: 'No valid shipment records available to generate.',
      });
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: rowsToGenerate.length });
    const dataUrlsMap: Record<string, { qr: string; barcode: string }> = {};

    try {
      for (let i = 0; i < rowsToGenerate.length; i++) {
        const row = rowsToGenerate[i];
        setBulkProgress({ current: i + 1, total: rowsToGenerate.length });
        const barcodeDataUrl = await generateBulkBarcodeDataUrl(row.tracking_number);
        const qrDataUrl = await generateBulkQrDataUrl(row.tracking_number);
        dataUrlsMap[row.tracking_number] = {
          barcode: barcodeDataUrl,
          qr: qrDataUrl,
        };
        if (i % 4 === 0) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      setBulkGeneratedDataUrls(dataUrlsMap);

      const res = await fetch('/api/organization/shipping-labels/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate?.id,
          courierCompany: effectiveCourierName,
          sizePreset: selectedPrintSize.id,
          logoUrl: effectiveCourierLogo,
          labels: rowsToGenerate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBulkGeneratedLabels(rowsToGenerate);
        setFeedback({
          type: 'success',
          message: `${rowsToGenerate.length} shipment labels generated successfully.`,
        });
        loadHistory();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to save bulk labels in database.',
        });
      }
    } catch (err: any) {
      console.error('Error generating bulk labels:', err);
      setFeedback({
        type: 'error',
        message: 'Network or processing error during bulk label generation.',
      });
    } finally {
      setBulkGenerating(false);
    }
  }

  function handlePrintAllBulkLabels() {
    if (!bulkGeneratedLabels || bulkGeneratedLabels.length === 0) return;
    const allElementIds: string[] = [];
    bulkGeneratedLabels.forEach((row, rowIdx) => {
      const totalCount = parsePackageCount(row.package_count);
      for (let pIdx = 0; pIdx < totalCount; pIdx++) {
        allElementIds.push(`bulk-label-${rowIdx}-pkg-${pIdx}`);
      }
    });
    printShippingLabel(
      allElementIds,
      selectedPrintSize.widthInches,
      selectedPrintSize.heightInches
    );
  }

  async function handleDownloadBulkPDF() {
    if (!bulkGeneratedLabels || bulkGeneratedLabels.length === 0 || !activeTemplate) return;
    try {
      const items = bulkGeneratedLabels.map((row) => ({
        data: {
          ...row,
          courier_company: effectiveCourierName,
          hide_additional_details: hideAdditionalDetails,
        },
        qrDataUrl: bulkGeneratedDataUrls[row.tracking_number]?.qr,
        barcodeDataUrl: bulkGeneratedDataUrls[row.tracking_number]?.barcode,
      }));
      const doc = await generateBulkShippingLabelsPDF({
        template: activeTemplate,
        items,
      });
      doc.save(`bulk-shipping-labels-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Failed to generate bulk PDF:', err);
      alert('Failed to generate bulk PDF document.');
    }
  }

  function handleResetBulk() {
    setBulkFile(null);
    setBulkValidation(null);
    setBulkGeneratedLabels(null);
    setBulkGeneratedDataUrls({});
    setBulkAllowValidOnly(false);
    setBulkActivePreviewIndex(0);
    setBulkSearch('');
    setBulkFilter('all');
  }


  // Share
  async function handleShare() {
    const tracking = formData.tracking_number;
    const recipient = formData.recipient_name;
    const dest = `${formData.city}, ${formData.state} - ${formData.pincode}`;
    const shareText = hideAdditionalDetails
      ? `*GEO TRANSIT SHIPPING CONSIGNMENT*\n\nTracking Number: ${tracking}\nRecipient: ${recipient}\nDestination: ${dest}\nWeight: ${formData.weight} kg\nMode: ${formData.mode}\nStatus: ${formData.payment_status}\n\nTrack online at: https://geotransit.com/tracking`
      : `*GEO TRANSIT SHIPPING CONSIGNMENT*\n\nTracking Number: ${tracking}\nRecipient: ${recipient}\nDestination: ${dest}\nService: ${formData.service} (${formData.service_type})\nWeight: ${formData.weight} kg\nMode: ${formData.mode}\nStatus: ${formData.payment_status}\n\nTrack online at: https://geotransit.com/tracking`;

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
      contact_person_name: '',
      include_contact_person_on_label: false,
      mobile: '',
      service: 'LITE',
      service_type: 'STD EXP-A',
      origin_code: 'BOM',
      destination_code: 'DEL',
      payment_status: 'PREPAID',
      amount_to_collect: 0,
      tracking_number: newTracking,
      barcode_type: 'CODE128' as BarcodeFormat,
      barcode_width_in: 2.75,
      barcode_height_in: 0.65,
      package_count: 1,
      route_location: 'NORTH HUB / R-04',
      weight: 1.0,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      mode: 'SURFACE',
    });
    setSelectedCourierOption('GEO TRANSIT');
    setCustomCourierName('');
    setCustomLogoUrl('');
    setEffectiveCourierName('GEO TRANSIT');
    setEffectiveCourierLogo(DEFAULT_GEO_TRANSIT_LOGO);
    setSelectedCountry(DEFAULT_COUNTRY);
    setMobileDigits('');
    setHideAdditionalDetails(false);
    setIsAddingService(false);
    setCustomServiceInput('');
    setIsAddingServiceType(false);
    setCustomServiceTypeInput('');
    setIsAddingMode(false);
    setCustomModeInput('');
    setIsModeDropdownOpen(false);
    setModeToDelete(null);
    setCurrentSavedLabel(null);
    setFeedback(null);
  }

  // Load past label into preview/form
  function handleLoadPastLabel(item: any) {
    if (item.courier_company || item.courierCompany) {
      const cName = item.courier_company || item.courierCompany;
      const match = courierOptions.find((c) => c.name.toLowerCase() === cName.toLowerCase());
      if (match) {
        setSelectedCourierOption(match.name);
        setEffectiveCourierName(match.name);
        setEffectiveCourierLogo(match.logoUrl);
      } else {
        setSelectedCourierOption('CUSTOM');
        setCustomCourierName(cName);
        setEffectiveCourierName(cName);
        setEffectiveCourierLogo(undefined);
      }
    }
    if (item.labelData) {
      setFormData(item.labelData);
    } else {
      setFormData({
        recipient_name: item.recipientName || '',
        address_line_1: item.recipientAddress || '',
        city: item.recipientCity || '',
        state: item.recipientState || '',
        pincode: item.recipientPincode || '',
        contact_person_name: item.contact_person_name || item.labelData?.contact_person_name || '',
        include_contact_person_on_label: Boolean(item.include_contact_person_on_label || item.labelData?.include_contact_person_on_label),
        mobile: item.recipientMobile || '',
        service: item.service || 'LITE',
        service_type: item.serviceType || 'STD EXP-A',
        origin_code: item.originCode || 'BOM',
        destination_code: item.destinationCode || 'DEL',
        payment_status: item.paymentStatus || 'PREPAID',
        amount_to_collect: item.amountToCollect || 0,
        tracking_number: item.trackingNumber,
        package_count: parsePackageCount(item.packageCount || item.labelData?.package_count || 1),
        route_location: item.routeLocation || 'NORTH HUB',
        weight: item.weight || 1.0,
        mode: item.mode || 'SURFACE',
      });
    }

    if (item.templateSnapshot) {
      setSelectedTemplate(item.templateSnapshot);
    }
    const pastMobile = item.labelData?.mobile || item.recipientMobile || '';
    const parsed = parseMobileAndCountry(pastMobile);
    setSelectedCountry(parsed.country);
    setMobileDigits(parsed.digits);
    if (item.labelData?.is_address_print || item.labelData?.label_type === 'ADDRESS_PRINT') {
      setHistoricalAddressData(item.labelData);
      setActiveTab('address-print');
    } else {
      setActiveTab('create');
    }
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
    <div className="space-y-6 w-full">
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

        {/* Tab Switcher & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {/* 1. Address Print */}
            <button
              onClick={() => setActiveTab('address-print')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'address-print'
                  ? 'bg-white text-[#0F4C3A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              Address Print
            </button>

            {/* 2. Create New Label */}
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white text-[#0F4C3A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create New Label
            </button>

            {/* 3. Multiple Barcode Label */}
            <button
              onClick={() => setActiveTab('multiple-barcode')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'multiple-barcode'
                  ? 'bg-white text-[#0F4C3A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Barcode className="w-3.5 h-3.5 text-emerald-700" />
              Multiple Barcode Label
            </button>

            {/* 4. Bulk Excel Upload */}
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bulk'
                  ? 'bg-white text-[#0F4C3A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-700" />
              Bulk Excel Upload
            </button>

            {/* 5. Download Excel Template */}
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="px-3.5 py-2 rounded-lg text-xs font-black text-slate-600 hover:text-[#0F4C3A] hover:bg-slate-200/60 transition-all cursor-pointer flex items-center gap-1.5"
              title="Download Sample Excel Template"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Download Excel Template
            </button>

            {/* 6. Label History */}
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-[#0F4C3A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Label History
            </button>
          </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
          {/* LEFT: FORM DATA ENTRY (7 COLS) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
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

            {/* Consignment & Tracking Number Details */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#0F4C3A]">
                  <Truck className="w-4 h-4 text-[#1E8262]" />
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    Consignment & Tracking Number
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateNewTracking}
                  className="text-[10px] text-[#1E8262] font-black uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
                  title="Generate a unique random consignment tracking number"
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate New Consignment No
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Tracking / Consignment Number *
                </label>
                <input
                  type="text"
                  value={formData.tracking_number}
                  onChange={(e) => handleInputChange('tracking_number', e.target.value.toUpperCase())}
                  className="w-full text-sm font-mono font-black tracking-wider px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] bg-slate-50/50"
                  placeholder="e.g. GT2609001421"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  This consignment number is encoded into the live scannable barcode and 2D QR code on the thermal shipping label.
                </p>
              </div>
            </div>

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

                {/* 2. Contact Person Name (Optional) + Mobile Number * Row (with generous gap shifting Mobile Number right) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 items-start">
                  {/* Contact Person Name (Left Side: Label and Checkbox positioned directly beside each other) */}
                  <div>
                    <div className="flex items-center gap-3 mb-1 min-h-[20px] flex-wrap">
                      <label className="text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap">
                        Contact Person Name (Optional)
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.include_contact_person_on_label)}
                          onChange={(e) => handleInputChange('include_contact_person_on_label', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-[#1E8262] focus:ring-[#1E8262] border-slate-300 accent-[#1E8262] cursor-pointer"
                        />
                        <span className="text-[10.5px] font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap">
                          Include on Thermal Label
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={formData.contact_person_name || ''}
                      onChange={(e) => handleInputChange('contact_person_name', e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] h-[40px] shadow-xs"
                      placeholder="e.g. Mr. Rajesh Kumar / Receiving Staff"
                    />
                  </div>

                  {/* Mobile Number (Shifted right with clear visual gap) */}
                  <div>
                    <div className="flex items-center justify-between mb-1 min-h-[20px]">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap">
                        Mobile Number *
                      </label>
                      {selectedCountry.code === 'IN' ? (
                        mobileError ? (
                          <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            Accepts only 10 digits
                          </span>
                        ) : mobileDigits.length === 10 ? (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            10 Digits Validated
                          </span>
                        ) : mobileDigits.length > 0 ? (
                          <span className="text-[10px] font-semibold text-amber-600">
                            {10 - mobileDigits.length} digits needed
                          </span>
                        ) : (
                          <span className="text-[10px] text-helper-blue font-medium">10 digits required</span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {selectedCountry.name} ({selectedCountry.dialCode})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Standalone Country Code Selector Button */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-colors focus:outline-none focus:border-[#1E8262] h-[40px] shadow-xs cursor-pointer min-w-[95px] justify-between"
                          title="Select Country Calling Code"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700 text-xs">{selectedCountry.code}</span>
                            <span className="font-mono font-black text-slate-900 text-xs">{selectedCountry.dialCode}</span>
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>

                        {/* Searchable Dropdown Popover */}
                        {isCountryDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => {
                                setIsCountryDropdownOpen(false);
                                setCountrySearch('');
                              }}
                            />
                            <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                              <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                                <div className="relative flex items-center">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={countrySearch}
                                    onChange={(e) => setCountrySearch(e.target.value)}
                                    placeholder="Search country or code..."
                                    autoFocus
                                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#1E8262]"
                                  />
                                </div>
                              </div>
                              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                                {filteredCountries.length > 0 ? (
                                  filteredCountries.map((c) => {
                                    const isSelected = c.code === selectedCountry.code;
                                    return (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => handleCountrySelect(c)}
                                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors ${
                                          isSelected
                                            ? 'bg-emerald-50 text-[#0F4C3A] font-bold'
                                            : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="font-bold text-slate-500 text-xs shrink-0 w-6">{c.code}</span>
                                          <span className="truncate">{c.name}</span>
                                        </div>
                                        <span className="font-mono text-xs font-black text-slate-600 shrink-0 ml-2">
                                          {c.dialCode}
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="p-4 text-center text-xs text-slate-400">
                                    No matching countries found
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Standalone Numeric Mobile Input */}
                      <input
                        type="tel"
                        value={mobileDigits}
                        onChange={handleMobileDigitsChange}
                        onKeyDown={(e) => {
                          if (
                            ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key) ||
                            (e.ctrlKey || e.metaKey)
                          ) {
                            if (mobileError && ['Backspace', 'Delete'].includes(e.key)) {
                              setMobileError('');
                            }
                            return;
                          }
                          if (!/^\d$/.test(e.key)) {
                            e.preventDefault();
                            return;
                          }
                          if (selectedCountry.code === 'IN' && mobileDigits.length >= 10) {
                            const input = e.currentTarget;
                            if (input.selectionStart !== null && input.selectionEnd !== null && input.selectionStart !== input.selectionEnd) {
                              setMobileError('');
                              return;
                            }
                            e.preventDefault();
                            setMobileError('Accepts only 10 digits');
                          } else {
                            setMobileError('');
                          }
                        }}
                        maxLength={selectedCountry.code === 'IN' ? 10 : (selectedCountry.maxLength || 15)}
                        className={`flex-1 w-full text-xs font-mono font-bold px-3.5 py-2.5 border rounded-xl focus:outline-none h-[40px] shadow-xs ${
                          mobileError
                            ? 'border-red-400 focus:border-red-500 text-red-900 bg-red-50/20'
                            : 'border-slate-200 focus:border-[#1E8262]'
                        }`}
                        placeholder={selectedCountry.placeholder || 'Enter mobile number'}
                      />
                    </div>

                    {/* Red Error Message directly below Mobile Number field */}
                    {selectedCountry.code === 'IN' && mobileError && (
                      <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Accepts only 10 digits
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Address Line 1 * (Full width row, Address Line 2 completely removed) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_1}
                    onChange={(e) => handleInputChange('address_line_1', e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Shop No. 12, Industrial Area Phase 2, Near Landmark / Gate"
                  />
                </div>

                {/* 4. Pincode | City | State (3-column grid with automatic Pincode lookup) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">
                        Pincode *
                      </label>
                      {pincodeLoading ? (
                        <span className="text-[10px] text-helper-blue flex items-center gap-1 font-medium">
                          <Loader2 className="w-3 h-3 animate-spin text-[#1E8262]" />
                          Looking up...
                        </span>
                      ) : pincodeSuccess ? (
                        <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Auto-filled
                        </span>
                      ) : pincodeError ? (
                        <span className="text-[10px] text-red-600 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          {pincodeError}
                        </span>
                      ) : null}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          handleInputChange('pincode', val);
                          if (val.length === 6) {
                            lookupPincode(val);
                          } else {
                            setPincodeError('');
                            setPincodeSuccess(false);
                          }
                        }}
                        maxLength={6}
                        className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none ${
                          pincodeError
                            ? 'border-red-300 focus:border-red-500 text-red-900 bg-red-50/10'
                            : pincodeSuccess
                            ? 'border-emerald-300 focus:border-[#1E8262]'
                            : 'border-slate-200 focus:border-[#1E8262]'
                        }`}
                        placeholder="e.g. 560086"
                      />
                      {pincodeLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
                        </div>
                      )}
                    </div>
                    {pincodeError && (
                      <p className="text-[10.5px] font-semibold text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {pincodeError}
                      </p>
                    )}
                  </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
                  {/* 1. Payment Mode */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 truncate min-h-[17px]">
                      Payment Mode *
                    </label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => handleInputChange('payment_status', e.target.value)}
                      className="w-full text-xs font-black px-3 py-2.5 border border-slate-200 rounded-xl bg-white h-[42px] focus:outline-none focus:border-[#1E8262]"
                    >
                      <option value="PREPAID">PREPAID</option>
                      <option value="COD">COD (Cash on Delivery)</option>
                      <option value="TO PAY">TO PAY</option>
                      <option value="FOD">FOD</option>
                    </select>
                  </div>

                  {/* 2. Weight (kg) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 truncate min-h-[17px]">
                      Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3.5 py-2.5 border border-slate-200 rounded-xl h-[42px] focus:outline-none focus:border-[#1E8262]"
                      placeholder="1.00"
                    />
                  </div>

                  {/* 3. Package Count */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 truncate min-h-[17px]">
                      Package Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.package_count}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          handleInputChange('package_count', '');
                          return;
                        }
                        const clean = val.replace(/\D/g, '');
                        if (!clean) return;
                        const num = parseInt(clean, 10);
                        if (num > 0) {
                          handleInputChange('package_count', num);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e) => {
                        const pasteData = e.clipboardData.getData('text');
                        if (!/^\d+$/.test(pasteData.trim()) || parseInt(pasteData.trim(), 10) <= 0) {
                          e.preventDefault();
                        }
                      }}
                      onBlur={() => {
                        if (!formData.package_count || Number(formData.package_count) < 1) {
                          handleInputChange('package_count', 1);
                        }
                      }}
                      className="w-full text-xs font-bold font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl h-[42px] focus:outline-none focus:border-[#1E8262]"
                      placeholder="1"
                    />
                  </div>

                  {/* 4. Mode */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1 min-h-[17px]">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase truncate">
                        Mode
                      </label>
                      {!isAddingMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingMode(true);
                            setCustomModeInput('');
                            setIsModeDropdownOpen(false);
                          }}
                          className="text-[10px] font-bold text-[#1E8262] hover:underline cursor-pointer whitespace-nowrap"
                        >
                          + Add Mode
                        </button>
                      )}
                    </div>

                    {/* Mode Custom Dropdown Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (isAddingMode) setIsAddingMode(false);
                          setIsModeDropdownOpen((prev) => !prev);
                        }}
                        className={`w-full text-xs font-semibold px-3 py-2.5 border rounded-xl bg-white h-[42px] flex items-center justify-between text-left cursor-pointer transition-colors ${
                          isModeDropdownOpen
                            ? 'border-[#1E8262] ring-1 ring-[#1E8262]'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="truncate font-semibold text-slate-800">
                          {formData.mode || 'Select Mode'}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform ${
                            isModeDropdownOpen ? 'rotate-180 text-[#1E8262]' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown Options Popover */}
                      {isModeDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsModeDropdownOpen(false)}
                          />
                          <div className="absolute left-0 top-full mt-1.5 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto">
                            {modeOptions.map((m) => {
                              const isPredefined = PREDEFINED_MODES.includes(m);
                              const isSelected = formData.mode === m;
                              return (
                                <div
                                  key={m}
                                  className={`w-full px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-50 text-[#0F4C3A] font-bold'
                                      : 'hover:bg-slate-50 text-slate-700 font-semibold'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleInputChange('mode', m);
                                      setIsModeDropdownOpen(false);
                                    }}
                                    className="flex-1 text-left truncate cursor-pointer py-0.5"
                                  >
                                    {m}
                                  </button>

                                  {!isPredefined && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setModeToDelete(m);
                                      }}
                                      title={`Delete ${m}`}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-2 cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}

                            <div className="border-t border-slate-100 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setIsModeDropdownOpen(false);
                                setIsAddingMode(true);
                                setCustomModeInput('');
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-bold text-[#1E8262] hover:bg-emerald-50/70 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>+ Add Mode Manually</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {isAddingMode && (
                      <div className="mt-2 flex items-center gap-1.5 animate-in fade-in duration-150">
                        <input
                          type="text"
                          autoFocus
                          value={customModeInput}
                          onChange={(e) => setCustomModeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveCustomMode();
                            } else if (e.key === 'Escape') {
                              setIsAddingMode(false);
                            }
                          }}
                          placeholder="Mode name..."
                          className="flex-1 text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#1E8262] bg-white shadow-2xs min-w-0"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomMode}
                          className="px-2.5 py-1.5 bg-[#0F4C3A] hover:bg-[#155d47] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingMode(false)}
                          className="px-1.5 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold rounded-lg cursor-pointer shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 5. Dispatch Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 truncate min-h-[17px]">
                      Dispatch Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl bg-white h-[42px] focus:outline-none focus:border-[#1E8262]"
                    />
                  </div>
                </div>

                {/* Conditional Amount to Collect for COD */}
                {formData.payment_status === 'COD' && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2 max-w-xs animate-in fade-in duration-150">
                    <div className="w-full">
                      <label className="block text-[11px] font-bold text-red-700 uppercase mb-1">
                        Amount to Collect (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount_to_collect}
                        onChange={(e) => handleInputChange('amount_to_collect', e.target.value)}
                        className="w-full text-xs font-black text-red-700 px-3.5 py-2.5 border border-red-300 rounded-xl bg-red-50/50 h-[42px] focus:outline-none focus:border-red-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#0F4C3A]">
                  <Truck className="w-4 h-4 text-[#1E8262]" />
                  <h3 className="font-black text-sm uppercase tracking-wider">
                    Additional Details
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {hideAdditionalDetails ? (
                    <>
                      <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Hidden From Label
                      </span>
                      <button
                        type="button"
                        onClick={() => setHideAdditionalDetails(false)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#1E8262] hover:text-[#0F4C3A] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Show Additional Details section and include on label"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHideAdditionalDetails(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Hide Additional Details section and exclude from label"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Hide</span>
                    </button>
                  )}
                </div>
              </div>

              {!hideAdditionalDetails && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Service */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">
                          Service
                        </label>
                        {!isAddingService && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingService(true);
                              setCustomServiceInput('');
                            }}
                            className="text-[10px] font-bold text-[#1E8262] hover:underline cursor-pointer"
                          >
                            + Add Service
                          </button>
                        )}
                      </div>
                      <select
                        value={isAddingService ? '__ADD_SERVICE__' : formData.service}
                        onChange={(e) => handleServiceChange(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#1E8262]"
                      >
                        {serviceOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="__ADD_SERVICE__" className="text-[#1E8262] font-bold">
                          + Add Service
                        </option>
                      </select>

                      {isAddingService && (
                        <div className="mt-2 flex items-center gap-1.5 animate-in fade-in duration-150">
                          <input
                            type="text"
                            autoFocus
                            value={customServiceInput}
                            onChange={(e) => setCustomServiceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveCustomService();
                              } else if (e.key === 'Escape') {
                                setIsAddingService(false);
                              }
                            }}
                            placeholder="Enter new service name..."
                            className="flex-1 text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#1E8262] bg-white shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={handleSaveCustomService}
                            className="px-3 py-1.5 bg-[#0F4C3A] hover:bg-[#155d47] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingService(false)}
                            className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Service Type */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">
                          Service Type
                        </label>
                        {!isAddingServiceType && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingServiceType(true);
                              setCustomServiceTypeInput('');
                            }}
                            className="text-[10px] font-bold text-[#1E8262] hover:underline cursor-pointer"
                          >
                            + Add Service Type
                          </button>
                        )}
                      </div>
                      <select
                        value={isAddingServiceType ? '__ADD_SERVICE_TYPE__' : formData.service_type}
                        onChange={(e) => handleServiceTypeChange(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#1E8262]"
                      >
                        {serviceTypeOptions.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                        <option value="__ADD_SERVICE_TYPE__" className="text-[#1E8262] font-bold">
                          + Add Service Type
                        </option>
                      </select>

                      {isAddingServiceType && (
                        <div className="mt-2 flex items-center gap-1.5 animate-in fade-in duration-150">
                          <input
                            type="text"
                            autoFocus
                            value={customServiceTypeInput}
                            onChange={(e) => setCustomServiceTypeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveCustomServiceType();
                              } else if (e.key === 'Escape') {
                                setIsAddingServiceType(false);
                              }
                            }}
                            placeholder="Enter new service type..."
                            className="flex-1 text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:border-[#1E8262] bg-white shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={handleSaveCustomServiceType}
                            className="px-3 py-1.5 bg-[#0F4C3A] hover:bg-[#155d47] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingServiceType(false)}
                            className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}
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
              )}
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
          <div className="lg:col-span-5 xl:col-span-5 sticky top-6 space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                    THERMAL PREVIEW
                  </span>
                  <h3 className="font-black text-sm text-white">Live Shipping Label Preview</h3>
                </div>

                <div className="flex items-end gap-3 flex-wrap sm:flex-nowrap shrink-0">
                  {/* Repositioned Courier Company Dropdown with 'Select Shipper' label */}
                  <div className="flex flex-col items-start gap-1">
                    <label className="text-xs font-semibold text-white tracking-tight">
                      Select Shipper
                    </label>
                    <div className="relative inline-flex items-center">
                      <select
                        value={selectedCourierOption}
                        onChange={(e) => handleCourierChange(e.target.value)}
                        aria-label="Select Shipper"
                        className="appearance-none bg-white text-slate-900 text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer shadow-xs min-w-[130px] sm:min-w-[155px] truncate"
                      >
                        <option value="" disabled className="text-slate-400">
                          Select Courier Company
                        </option>
                        {courierOptions.map((c) => (
                          <option key={c.id} value={c.name} className="text-slate-900 py-1 font-sans">
                            {c.name}
                          </option>
                        ))}
                        <option value="CUSTOM" className="text-emerald-700 font-bold font-sans">
                          Custom / Add Manually
                        </option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Print Size Dropdown with 'Select Print Size' label */}
                  <div className="flex flex-col items-start gap-1">
                    <label className="text-xs font-semibold text-white tracking-tight">
                      Select Print Size
                    </label>
                    <div className="relative inline-flex items-center shrink-0">
                      <select
                        value={selectedPrintSize.id}
                        onChange={(e) => {
                          const chosen = PRINT_SIZE_OPTIONS.find((opt) => opt.id === e.target.value);
                          if (chosen) setSelectedPrintSize(chosen);
                        }}
                        aria-label="Select Print Size"
                        className="appearance-none bg-white text-slate-900 font-bold text-xs pl-3 pr-8 py-2 rounded-xl border-2 border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs min-w-[85px]"
                      >
                        {PRINT_SIZE_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id} className="text-slate-900 py-1.5 font-bold">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Courier Name Input & Logo Upload (active when Custom is chosen) */}
              {selectedCourierOption === 'CUSTOM' && (
                <div className="pt-3 border-t border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                      Courier Company Name *
                    </label>
                    <input
                      type="text"
                      value={customCourierName}
                      onChange={(e) => handleCustomCourierNameChange(e.target.value)}
                      placeholder="Enter courier company name"
                      className="w-full text-xs font-bold px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-helper-blue uppercase mb-1">
                      Upload Custom Logo (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        Choose Logo Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {customLogoUrl && (
                        <div className="flex items-center gap-2">
                          <img
                            src={customLogoUrl}
                            alt="Custom Logo"
                            className="h-7 max-w-[70px] object-contain border border-slate-700 rounded p-0.5 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomLogoUrl('');
                              setEffectiveCourierLogo(undefined);
                            }}
                            className="text-[10px] text-red-400 hover:text-red-300 hover:underline font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Label Card Container with Universal Zoom Stage */}
            {(() => {
              const totalPackageCount = parsePackageCount(formData.package_count);
              return (
                <LabelPreviewStage
                  zoom={createLabelZoom}
                  onZoomChange={setCreateLabelZoom}
                  targetWidthPx={Math.round(selectedPrintSize.widthInches * 96)}
                  targetHeightPx={Math.round(selectedPrintSize.heightInches * 96)}
                  title="LIVE THERMAL LABEL PREVIEW"
                  badge={
                    <span className="text-[13px] font-mono font-bold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                      {selectedPrintSize.label}
                    </span>
                  }
                  headerExtra={
                    totalPackageCount > 1 ? (
                      <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider bg-slate-200 px-3 py-0.5 rounded-full">
                        {totalPackageCount} Packages
                      </span>
                    ) : undefined
                  }
                  maxHeight="max-h-[720px]"
                >
                  {activeTemplate && (
                    <div className="flex flex-col items-center gap-6 w-full">
                      {Array.from({ length: totalPackageCount }).map((_, index) => {
                        const pkgSeq = formatPackageSequence(index + 1, totalPackageCount);
                        const parsedTrackings = String(formData.tracking_number || '')
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const pkgTracking = parsedTrackings[index] || parsedTrackings[0] || formData.tracking_number;
                        const cardData = {
                          ...formData,
                          tracking_number: pkgTracking,
                          hide_additional_details: hideAdditionalDetails,
                          package_count: pkgSeq,
                        };
                        const cardId = index === 0 ? 'user-label-live-preview' : `user-label-live-preview-${index}`;
                        return (
                          <div key={index} className="flex flex-col items-center w-full">
                            {totalPackageCount > 1 && (
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 self-center bg-slate-300/80 px-2.5 py-0.5 rounded-full">
                                Package {pkgSeq}
                              </div>
                            )}
                            <ShippingLabelCard
                              template={activeTemplate}
                              data={cardData}
                              id={cardId}
                              scale={1}
                              onQrGenerated={index === 0 ? (url) => setQrDataUrl(url) : undefined}
                              onBarcodeGenerated={index === 0 ? (url) => setBarcodeDataUrl(url) : undefined}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </LabelPreviewStage>
              );
            })()}

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
                  onClick={handleDownloadExcel}
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-300"
                  title="Download shipping label in Microsoft Excel (.xlsx) format"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#1E8262]" />
                  Download Excel
                </button>

                <button
                  type="button"
                  onClick={handleDownloadWord}
                  className="inline-flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-200"
                  title="Download shipping label in Microsoft Word (.docx) format"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  Download Word
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

      {/* TAB 2: MULTIPLE BARCODE LABEL */}
      {activeTab === 'multiple-barcode' && (
        <div className="w-full space-y-6">
          <BarcodeGeneratorControl
            value={multiBarcodeValue}
            onChange={(val) => setMultiBarcodeValue(val)}
            onGenerateNew={() => setMultiBarcodeValue(generateTrackingNumber())}
            barcodeType={multiBarcodeType}
            onBarcodeTypeChange={(type) => setMultiBarcodeType(type)}
            widthInches={multiBarcodeWidth}
            onWidthInchesChange={(w) => setMultiBarcodeWidth(w)}
            heightInches={multiBarcodeHeight}
            onHeightInchesChange={(h) => setMultiBarcodeHeight(h)}
          />
        </div>
      )}

      {/* TAB 3: BULK EXCEL UPLOAD */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {/* Bulk Configuration Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 text-[#0F4C3A] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Bulk Thermal Engine
                </span>
                <span className="text-xs font-bold text-slate-500">• Multi-Consignment Batch Generator</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#1E8262]" />
                Bulk Excel Shipment Label Generator
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Upload your Excel (.xlsx / .xls) manifest to automatically validate, encode CODE128 barcodes, generate 2D QR codes, and print thermal labels.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Shipper Selector */}
              <div className="flex flex-col items-start gap-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">
                  Select Shipper
                </label>
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedCourierOption}
                    onChange={(e) => handleCourierChange(e.target.value)}
                    className="appearance-none bg-white text-slate-900 text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs min-w-[145px]"
                  >
                    {courierOptions.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom / Add Manually</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Print Size Selector */}
              <div className="flex flex-col items-start gap-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">
                  Select Print Size
                </label>
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedPrintSize.id}
                    onChange={(e) => {
                      const chosen = PRINT_SIZE_OPTIONS.find((opt) => opt.id === e.target.value);
                      if (chosen) setSelectedPrintSize(chosen);
                    }}
                    className="appearance-none bg-white text-slate-900 text-xs font-bold pl-3 pr-8 py-2 rounded-xl border-2 border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs min-w-[95px]"
                  >
                    {PRINT_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Download Excel Template Button */}
              <div className="flex flex-col items-start gap-1">
                <span className="text-[11px] font-bold text-transparent select-none hidden md:block">
                  Template
                </span>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#0F4C3A] border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  Download Excel Template
                </button>
              </div>
            </div>
          </div>

          {/* STEP 1: UPLOAD DROPZONE (Visible when no file is uploaded or reset) */}
          {!bulkValidation && !bulkGeneratedLabels && (
            <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors shadow-xs text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-[#1E8262]">
                {bulkLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>

              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  {bulkLoading ? 'Analyzing & Validating Excel Records...' : 'Upload Excel Manifest File'}
                </h3>
                <p className="text-xs text-slate-500">
                  Select or drag & drop an Excel file (<code className="text-emerald-700 font-mono font-bold">.xlsx</code> or <code className="text-emerald-700 font-mono font-bold">.xls</code>) containing multiple shipment rows.
                </p>
              </div>

              {!bulkLoading && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-[#0F4C3A] hover:bg-[#155d47] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all hover:shadow-md">
                    <FileSpreadsheet className="w-4 h-4" />
                    Browse Excel File
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleBulkFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    Download Sample Template
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 max-w-xl mx-auto text-left">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Required Excel Columns (marked with *):
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                  Tracking / Consignment Number *, Recipient / Company Name *, Mobile Number *, Address Line 1 *, City *, State *, Pincode *, Payment Mode *, Weight (KG) *
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: VALIDATION REPORT & PREVIEW TABLE (Visible after upload) */}
          {bulkValidation && !bulkGeneratedLabels && (
            <div className="space-y-6">
              {/* File Info & Action Header */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#1E8262] shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 truncate max-w-xs sm:max-w-md">
                      {bulkFile?.name}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB • ` : ''}
                      {bulkValidation.totalRecords} total shipment record(s) detected
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Different File
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleBulkFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleResetBulk}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Clear uploaded file"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Validation Summary Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Records
                    </span>
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {bulkValidation.totalRecords}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Valid Records
                    </span>
                    <span className="text-2xl font-black text-emerald-800 font-mono">
                      {bulkValidation.validRecords}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between ${
                  bulkValidation.invalidRecords > 0
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                      bulkValidation.invalidRecords > 0 ? 'text-red-800' : 'text-slate-500'
                    }`}>
                      Invalid Records
                    </span>
                    <span className={`text-2xl font-black font-mono ${
                      bulkValidation.invalidRecords > 0 ? 'text-red-700' : 'text-slate-600'
                    }`}>
                      {bulkValidation.invalidRecords}
                    </span>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    bulkValidation.invalidRecords > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {bulkValidation.invalidRecords > 0 ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Validation Error Report Box (Requirement 4 & 7) */}
              {bulkValidation.hasErrors && (
                <div className="bg-white rounded-2xl border border-red-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-red-50/80 border-b border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-red-900 uppercase tracking-wider">
                          Validation Report: {bulkValidation.invalidRecords} Invalid Row(s) Detected
                        </h4>
                        <p className="text-[11px] text-red-700 font-medium">
                          Labels cannot be generated silently with incorrect or missing mandatory fields.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleDownloadErrorReport}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Error Report
                      </button>

                      {bulkValidation.validRecords > 0 && (
                        <button
                          type="button"
                          onClick={() => setBulkAllowValidOnly((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shadow-xs ${
                            bulkAllowValidOnly
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {bulkAllowValidOnly
                            ? `Proceeding with ${bulkValidation.validRecords} Valid Rows`
                            : `Proceed with Valid Rows Only (${bulkValidation.validRecords})`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable list of specific row errors */}
                  <div className="p-4 space-y-2.5 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {bulkValidation.rows
                      .filter((r) => !r.isValid)
                      .map((r) => (
                        <div key={r.rowNumber} className="pt-2 first:pt-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[11px] text-red-900 bg-red-100 px-2 py-0.5 rounded">
                              Row {r.rowNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {r.tracking_number || '(No Tracking No)'}
                            </span>
                            {r.recipient_name && (
                              <span className="text-xs text-slate-500 truncate">
                                • {r.recipient_name}
                              </span>
                            )}
                          </div>
                          <div className="pl-3 space-y-0.5">
                            {r.errors.map((err, eIdx) => (
                              <p key={eIdx} className="text-xs text-red-700 font-medium flex items-center gap-1.5">
                                <span className="text-red-500 font-bold shrink-0">❌</span>
                                <span>{err}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Preview Table Header & Filters (Requirement 5) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Bulk Shipment Preview
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ({bulkValidation.rows.length} rows)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Search Filter */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={bulkSearch}
                        onChange={(e) => setBulkSearch(e.target.value)}
                        placeholder="Search rows..."
                        className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1E8262] w-40 sm:w-52"
                      />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setBulkFilter('all')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                          bulkFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        All ({bulkValidation.totalRecords})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkFilter('valid')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                          bulkFilter === 'valid' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700'
                        }`}
                      >
                        Valid ({bulkValidation.validRecords})
                      </button>
                      {bulkValidation.invalidRecords > 0 && (
                        <button
                          type="button"
                          onClick={() => setBulkFilter('invalid')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                            bulkFilter === 'invalid' ? 'bg-red-600 text-white shadow-2xs' : 'text-red-700'
                          }`}
                        >
                          Invalid ({bulkValidation.invalidRecords})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bulk Preview Table */}
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Row #</th>
                        <th className="py-2.5 px-3">Tracking / Consignment</th>
                        <th className="py-2.5 px-3">Recipient / Company</th>
                        <th className="py-2.5 px-3">Mobile</th>
                        <th className="py-2.5 px-3">Weight</th>
                        <th className="py-2.5 px-3">Pkg Count</th>
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3">Dispatch Date</th>
                        <th className="py-2.5 px-3">Validation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {bulkValidation.rows
                        .filter((r) => {
                          if (bulkFilter === 'valid') return r.isValid;
                          if (bulkFilter === 'invalid') return !r.isValid;
                          return true;
                        })
                        .filter((r) => {
                          if (!bulkSearch.trim()) return true;
                          const q = bulkSearch.toLowerCase();
                          return (
                            r.tracking_number.toLowerCase().includes(q) ||
                            r.recipient_name.toLowerCase().includes(q) ||
                            r.mobile.toLowerCase().includes(q) ||
                            r.city.toLowerCase().includes(q)
                          );
                        })
                        .map((r) => (
                          <tr
                            key={r.rowNumber}
                            className={`transition-colors ${
                              !r.isValid ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                              {r.rowNumber}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                              {r.tracking_number || <span className="text-red-500 italic">Empty</span>}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {r.recipient_name || <span className="text-red-500 italic">Missing</span>}
                              {r.contact_person_name && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  Attn: {r.contact_person_name}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {r.mobile || <span className="text-red-500 italic">Missing</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {r.weight ? `${r.weight.toFixed(2)} KG` : <span className="text-red-500 italic">Missing</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                {r.package_count} {r.package_count > 1 ? 'Pkgs' : 'Pkg'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                {r.mode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                              {r.date}
                            </td>
                            <td className="py-2.5 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  Valid
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full cursor-help"
                                  title={r.errors.join('; ')}
                                >
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  {r.errors.length} error(s)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Generation Bar with Progress Indicator (Requirement 6) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                {bulkGenerating ? (
                  <div className="space-y-3 py-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
                        Generating Labels...
                      </span>
                      <span className="font-mono text-emerald-700">
                        {bulkProgress.current} / {bulkProgress.total}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                      <div
                        className="bg-[#1E8262] h-full transition-all duration-150 rounded-full"
                        style={{
                          width: `${Math.round(
                            (bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium text-center">
                      Encoding real machine-readable CODE128 barcodes and 2D QR codes for each consignment...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Ready to Generate Thermal Shipping Labels
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {bulkValidation.hasErrors && !bulkAllowValidOnly
                          ? 'Resolve invalid records or choose "Proceed with Valid Rows Only" to continue.'
                          : `Will generate ${
                              bulkAllowValidOnly ? bulkValidation.validRecords : bulkValidation.rows.length
                            } thermal labels with real CODE128 barcodes and 2D QR codes.`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetBulk}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerateBulkLabels}
                        disabled={
                          bulkValidation.totalRecords === 0 ||
                          (bulkValidation.hasErrors && !bulkAllowValidOnly)
                        }
                        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                          bulkValidation.hasErrors && !bulkAllowValidOnly
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#0F4C3A] hover:bg-[#155d47] text-white hover:shadow-md'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Generate Bulk Labels (
                        {bulkAllowValidOnly
                          ? bulkValidation.validRecords
                          : bulkValidation.validRecords}
                        )
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: GENERATED BULK LABELS PREVIEW & ACTIONS RIBBON */}
          {bulkGeneratedLabels && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">
                      {bulkGeneratedLabels.length} shipment labels generated successfully.
                    </h3>
                    <p className="text-xs text-emerald-800 font-medium">
                      All records are encoded with real CODE128 barcodes, 2D QR codes, and saved to database history.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePrintAllBulkLabels}
                    className="inline-flex items-center gap-1.5 bg-[#0F4C3A] hover:bg-[#155d47] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    Print All Bulk Labels
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadBulkPDF}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Download All (PDF)
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Eye className="w-4 h-4 text-slate-600" />
                    View in History
                  </button>

                  <button
                    type="button"
                    onClick={handleResetBulk}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Upload Another Excel
                  </button>
                </div>
              </div>

              {/* Live Interactive Label Viewer for the Batch */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Shipment Selector List (4 cols) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Generated Consignments
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {bulkGeneratedLabels.length} Labels
                    </span>
                  </div>

                  <div className="max-h-[580px] overflow-y-auto divide-y divide-slate-100">
                    {bulkGeneratedLabels.map((row, idx) => {
                      const isSelected = idx === bulkActivePreviewIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBulkActivePreviewIndex(idx)}
                          className={`w-full text-left p-3 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/80 border-l-4 border-[#0F4C3A]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-mono font-black text-slate-900 block truncate">
                              {row.tracking_number}
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 truncate block">
                              {row.recipient_name}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {row.city}, {row.state} • {row.weight} KG
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {row.package_count} {row.package_count > 1 ? 'Pkgs' : 'Pkg'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Live Thermal Preview of Selected Shipment (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                  {(() => {
                    const currentRow = bulkGeneratedLabels[bulkActivePreviewIndex];
                    if (!currentRow || !activeTemplate) return null;
                    const totalPkg = parsePackageCount(currentRow.package_count);

                    return (
                      <LabelPreviewStage
                        zoom={bulkPreviewZoom}
                        onZoomChange={setBulkPreviewZoom}
                        targetWidthPx={384}
                        darkHeader={true}
                        title="LIVE BATCH THERMAL PREVIEW"
                        badge={
                          <span className="text-[14px] font-mono font-bold text-emerald-400 bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700">
                            #{currentRow.tracking_number}
                          </span>
                        }
                        headerExtra={
                          <div className="flex items-center gap-1.5 ml-2">
                            <button
                              type="button"
                              onClick={() =>
                                setBulkActivePreviewIndex((prev) => Math.max(0, prev - 1))
                              }
                              disabled={bulkActivePreviewIndex === 0}
                              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
                              title="Previous Label"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>

                            <span className="text-xs font-mono font-bold text-slate-300">
                              {bulkActivePreviewIndex + 1} / {bulkGeneratedLabels.length}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setBulkActivePreviewIndex((prev) =>
                                  Math.min(bulkGeneratedLabels.length - 1, prev + 1)
                                )
                              }
                              disabled={bulkActivePreviewIndex === bulkGeneratedLabels.length - 1}
                              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
                              title="Next Label"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        }
                        maxHeight="max-h-[640px]"
                      >
                        <div className="flex flex-col items-center gap-6 w-full">
                          {Array.from({ length: totalPkg }).map((_, pIdx) => {
                            const pkgSeq = formatPackageSequence(pIdx + 1, totalPkg);
                            const cardData = {
                              ...currentRow,
                              courier_company: effectiveCourierName,
                              hide_additional_details: hideAdditionalDetails,
                              package_count: pkgSeq,
                            };

                            return (
                              <div key={pIdx} className="flex flex-col items-center w-full">
                                {totalPkg > 1 && (
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 self-center bg-slate-300/80 px-2.5 py-0.5 rounded-full">
                                    Package {pkgSeq}
                                  </div>
                                )}
                                <ShippingLabelCard
                                  template={activeTemplate}
                                  data={cardData}
                                  id={`live-preview-bulk-${bulkActivePreviewIndex}-pkg-${pIdx}`}
                                  scale={1}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </LabelPreviewStage>
                    );
                  })()}
                </div>
              </div>

                            {/* Hidden elements container for thermal bulk printing */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
                {activeTemplate &&
                  bulkGeneratedLabels.map((row, rIdx) => {
                    const totalPkg = parsePackageCount(row.package_count);
                    return Array.from({ length: totalPkg }).map((_, pIdx) => {
                      const pkgSeq = formatPackageSequence(pIdx + 1, totalPkg);
                      const cardData = {
                        ...row,
                        courier_company: effectiveCourierName,
                        hide_additional_details: hideAdditionalDetails,
                        package_count: pkgSeq,
                      };
                      return (
                        <ShippingLabelCard
                          key={`${rIdx}-${pIdx}`}
                          template={activeTemplate}
                          data={cardData}
                          id={`bulk-label-${rIdx}-pkg-${pIdx}`}
                        />
                      );
                    });
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LABEL HISTORY */}
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
                            type="button"
                            onClick={() => setHistoryPreviewModalItem(item)}
                            className="p-1.5 text-[#0F4C3A] hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                            title="Quick Preview with Zoom"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadPastLabel(item)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Open in Live Editor & Print"
                          >
                            <ExternalLink className="w-4 h-4" />
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

      {/* TAB 5: ADDRESS PRINT */}
      {activeTab === 'address-print' && (
        <AddressPrintControl
          template={activeTemplate || selectedTemplate || DEFAULT_MASTER_TEMPLATE}
          courierOptions={courierOptions}
          selectedCourierOption={selectedCourierOption}
          onCourierChange={handleCourierChange}
          selectedPrintSize={selectedPrintSize}
          onPrintSizeChange={(size) => setSelectedPrintSize(size)}
          onSaveSuccess={() => {
            loadHistory();
          }}
          setFeedback={setFeedback}
          initialData={historicalAddressData}
        />
      )}

      {/* Confirmation Modal for Custom Mode Deletion */}
      {modeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Delete Custom Mode</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to delete custom mode{' '}
                  <span className="font-bold text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                    "{modeToDelete}"
                  </span>
                  ?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModeToDelete(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteMode(modeToDelete)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Label Quick Preview Modal with Independent Zoom Controls */}
      {historyPreviewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-black text-sm text-white">
                  Historical Label Preview
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  #{historyPreviewModalItem.trackingNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = historyPreviewModalItem;
                    setHistoryPreviewModalItem(null);
                    handleLoadPastLabel(item);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Open in Live Editor"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPreviewModalItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body with LabelPreviewStage */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-100 flex flex-col items-center justify-center">
              <LabelPreviewStage
                zoom={historyPreviewZoom}
                onZoomChange={setHistoryPreviewZoom}
                targetWidthPx={384}
                title={`LABEL #${historyPreviewModalItem.trackingNumber}`}
                minHeight="min-h-[460px]"
                maxHeight="max-h-[650px]"
                className="w-full max-w-xl"
              >
                {(() => {
                  const cardData = historyPreviewModalItem.labelData || {
                    recipient_name: historyPreviewModalItem.recipientName || '',
                    address_line_1: historyPreviewModalItem.recipientAddress || '',
                    city: historyPreviewModalItem.recipientCity || '',
                    state: historyPreviewModalItem.recipientState || '',
                    pincode: historyPreviewModalItem.recipientPincode || '',
                    mobile: historyPreviewModalItem.recipientMobile || '',
                    service: historyPreviewModalItem.service || 'LITE',
                    service_type: historyPreviewModalItem.serviceType || 'STD EXP-A',
                    origin_code: historyPreviewModalItem.originCode || 'BOM',
                    destination_code: historyPreviewModalItem.destinationCode || 'DEL',
                    payment_status: historyPreviewModalItem.paymentStatus || 'PREPAID',
                    amount_to_collect: historyPreviewModalItem.amountToCollect || 0,
                    tracking_number: historyPreviewModalItem.trackingNumber,
                    package_count: '1 of 1',
                    weight: historyPreviewModalItem.weight || 1.0,
                    courier_company: historyPreviewModalItem.courierCompany || historyPreviewModalItem.courier_company || 'GEO TRANSIT EXPRESS LOGISTICS',
                  };
                  return (
                    <ShippingLabelCard
                      template={historyPreviewModalItem.templateSnapshot || activeTemplate || DEFAULT_MASTER_TEMPLATE}
                      data={cardData}
                      id={`history-preview-modal-${historyPreviewModalItem.id}`}
                      scale={1}
                    />
                  );
                })()}
              </LabelPreviewStage>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="text-slate-500 font-medium">
                Created: <span className="font-bold text-slate-700">{new Date(historyPreviewModalItem.createdAt).toLocaleString('en-GB')}</span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryPreviewModalItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
