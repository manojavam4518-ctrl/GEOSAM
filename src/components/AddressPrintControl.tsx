'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MapPin,
  Building2,
  Printer,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  Truck,
  RotateCcw,
  Loader2,
  Download,
  Plus,
  X,
  Upload,
  FileSpreadsheet,
  Eye,
  Check,
  AlertTriangle,
  Layers,
  FileText,
} from 'lucide-react';
import {
  exportShippingLabelToExcel,
  exportShippingLabelToWord,
} from '@/utils/shippingLabelDocumentExport';
import LabelPreviewStage from './LabelPreviewStage';
import LabelHoverMagnifier from './LabelHoverMagnifier';
import LabelPreviewZoomToolbar from './LabelPreviewZoomToolbar';
import FullScreenLabelPreviewModal from './FullScreenLabelPreviewModal';
import { useDragToPan } from '@/hooks/useDragToPan';
import AddressPrintLabelCard, {
  AddressPrintData,
  FieldFormatting,
  SectionFormatting,
  DEFAULT_TO_FORMATTING,
  DEFAULT_FROM_FORMATTING,
} from './AddressPrintLabelCard';
import {
  downloadAddressPrintExcelTemplate,
  parseAndValidateAddressPrintExcel,
  AddressPrintBatchSummary,
  AddressPrintBatchRow,
} from '@/utils/addressPrintExcel';
import {
  ShippingLabelTemplateData,
  PRINT_SIZE_OPTIONS,
  PrintSizeOption,
  CourierCompanyOption,
  DEFAULT_GEO_TRANSIT_LOGO,
} from '@/lib/shippingLabel';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  CountryCode,
  parseMobileAndCountry,
} from '@/lib/countryCodes';
import { printShippingLabel, downloadShippingLabelPNG } from '@/utils/shippingLabelExport';
import { resolveCourierLogo } from '@/utils/courierLogos';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

const CUSTOM_SHIPPERS_STORAGE_KEY = 'geo_address_print_custom_shippers';

const FONT_SIZE_OPTIONS = Array.from({ length: 70 - 8 + 1 }, (_, i) => `${8 + i}pt`);

function transformHtmlText(html: string, transform: (text: string) => string): string {
  if (typeof document === 'undefined' || !html) return html || '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      node.nodeValue = transform(node.nodeValue);
    } else {
      node.childNodes.forEach(walk);
    }
  };
  temp.childNodes.forEach(walk);
  return temp.innerHTML;
}

interface FieldFormattingBarProps {
  formatting: FieldFormatting;
  onChange: (newFmt: FieldFormatting) => void;
  minSize?: number;
  maxSize?: number;
}

function FieldFormattingBar({
  formatting,
  onChange,
  minSize = 7,
  maxSize = 36,
}: FieldFormattingBarProps) {
  const toggleBold = () => {
    onChange({ ...formatting, bold: !formatting.bold });
  };

  const toggleUnderline = () => {
    onChange({ ...formatting, underline: !formatting.underline });
  };

  const decreaseFontSize = () => {
    if (formatting.fontSize > minSize) {
      onChange({ ...formatting, fontSize: formatting.fontSize - 1 });
    }
  };

  const increaseFontSize = () => {
    if (formatting.fontSize < maxSize) {
      onChange({ ...formatting, fontSize: formatting.fontSize + 1 });
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-1.5 select-none">
      <button
        type="button"
        onClick={toggleBold}
        className={`w-6 h-6 flex items-center justify-center font-serif font-black text-xs rounded-md border transition-colors cursor-pointer ${
          formatting.bold
            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-xs'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
        }`}
        title="Bold (B)"
      >
        B
      </button>

      <button
        type="button"
        onClick={toggleUnderline}
        className={`w-6 h-6 flex items-center justify-center font-serif font-bold text-xs underline rounded-md border transition-colors cursor-pointer ${
          formatting.underline
            ? 'bg-[#0F4C3A] text-white border-[#0F4C3A] shadow-xs'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
        }`}
        title="Underline (U)"
      >
        U
      </button>

      <div className="flex items-center border border-slate-200 rounded-md bg-white shadow-2xs overflow-hidden h-6">
        <button
          type="button"
          onClick={decreaseFontSize}
          disabled={formatting.fontSize <= minSize}
          className="w-5 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed font-black text-xs cursor-pointer transition-colors"
          title="Decrease Font Size"
        >
          −
        </button>
        <span className="px-1.5 min-w-[34px] text-center font-mono font-bold text-[10.5px] text-slate-800 bg-slate-50/60 py-0.5 border-x border-slate-100">
          {formatting.fontSize}pt
        </span>
        <button
          type="button"
          onClick={increaseFontSize}
          disabled={formatting.fontSize >= maxSize}
          className="w-5 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed font-black text-xs cursor-pointer transition-colors"
          title="Increase Font Size"
        >
          +
        </button>
      </div>
    </div>
  );
}

export interface CustomShipper {
  id: string;
  name: string;
  logoUrl?: string; // base64 data URL
}

export interface AddressPrintControlProps {
  template: ShippingLabelTemplateData;
  courierOptions: CourierCompanyOption[];
  selectedCourierOption: string;
  onCourierChange: (name: string) => void;
  selectedPrintSize: PrintSizeOption;
  onPrintSizeChange: (size: PrintSizeOption) => void;
  onSaveSuccess?: (label: any) => void;
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
  initialData?: any;
}

export default function AddressPrintControl({
  template,
  courierOptions,
  selectedCourierOption,
  onCourierChange,
  selectedPrintSize,
  onPrintSizeChange,
  onSaveSuccess,
  setFeedback,
  initialData,
}: AddressPrintControlProps) {
  // 1. Custom Shippers state
  const [customShippers, setCustomShippers] = useState<CustomShipper[]>([]);
  const [isAddShipperModalOpen, setIsAddShipperModalOpen] = useState<boolean>(false);
  const [newShipperName, setNewShipperName] = useState<string>('');
  const [newShipperLogoUrl, setNewShipperLogoUrl] = useState<string>('');
  const [newShipperError, setNewShipperError] = useState<string>('');
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Address Print Excel Batch State
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const reuploadFileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [isParsingExcel, setIsParsingExcel] = useState<boolean>(false);
  const [batchSummary, setBatchSummary] = useState<AddressPrintBatchSummary | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [selectedBatchRowIndex, setSelectedBatchRowIndex] = useState<number>(0);
  const [batchFilter, setBatchFilter] = useState<'all' | 'valid' | 'errors'>('all');
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const [batchSaveProgress, setBatchSaveProgress] = useState<{ current: number; total: number } | null>(null);
  const [isExportingBatchPdf, setIsExportingBatchPdf] = useState<boolean>(false);

  // Active shipper state
  const [activeShipperName, setActiveShipperName] = useState<string>(
    initialData?.courier_company || selectedCourierOption || 'GEO TRANSIT'
  );
  const [activeShipperLogo, setActiveShipperLogo] = useState<string | undefined>(
    initialData?.courier_logo || undefined
  );

  // Load custom shippers on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_SHIPPERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomShippers(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load custom shippers from storage:', err);
    }
  }, []);

  // Independent Zoom States for Live Preview & Batch Preview
  const [previewZoom, setPreviewZoom] = useState<number>(selectedPrintSize.id === 'a4' ? 0.5 : 1.0);
  const [batchPreviewZoom, setBatchPreviewZoom] = useState<number>(selectedPrintSize.id === 'a4' ? 0.45 : 0.9);
  const [batchMagnifierActive, setBatchMagnifierActive] = useState<boolean>(true);
  const [isBatchFullScreenOpen, setIsBatchFullScreenOpen] = useState<boolean>(false);

  // Batch preview click-and-drag hand tool with mouse-wheel zoom
  const batchViewportRef = useRef<HTMLDivElement>(null);
  const { panProps: batchPanProps, cursorClass: batchCursorClass } = useDragToPan({
    externalRef: batchViewportRef,
    zoom: batchPreviewZoom,
    onZoomChange: setBatchPreviewZoom,
    minZoom: 0.3,
    maxZoom: 2.0,
    enableWheelZoom: true,
  });

  // Recalculate default preview zoom when print size changes
  useEffect(() => {
    if (selectedPrintSize.id === 'a4') {
      setPreviewZoom(0.5);
    } else {
      setPreviewZoom(1.0);
    }
  }, [selectedPrintSize.id]);

  // 2. Consignment / Tracking number: STRICTLY MANUAL, NO AUTO-GENERATION
  const [trackingNumber, setTrackingNumber] = useState<string>(
    initialData?.tracking_number || initialData?.trackingNumber || ''
  );
  const [liveBarcodeUrl, setLiveBarcodeUrl] = useState<string>('');

  // 3. Quantities for Section A and Section B (Multiple Print)
  const [toQuantity, setToQuantity] = useState<number>(1);
  const [fromQuantity, setFromQuantity] = useState<number>(1);

  // SECTION A: TO / CONSIGNEE State
  const [toName, setToName] = useState<string>(
    initialData?.recipient_name || initialData?.consignee_name || initialData?.to_name || ''
  );
  const [toContactPerson, setToContactPerson] = useState<string>(
    initialData?.contact_person_name || initialData?.consignee_contact_person || initialData?.to_contact_person || ''
  );
  const [toIncludeContactPerson, setToIncludeContactPerson] = useState<boolean>(
    Boolean(initialData?.include_contact_person_on_label || initialData?.consignee_include_contact_person || initialData?.to_include_contact_person)
  );
  const [toCountry, setToCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [toMobileDigits, setToMobileDigits] = useState<string>('');
  const [toMobileError, setToMobileError] = useState<string>('');
  const [isToCountryOpen, setIsToCountryOpen] = useState<boolean>(false);
  const [toCountrySearch, setToCountrySearch] = useState<string>('');
  const [toAddressLine1, setToAddressLine1] = useState<string>(
    initialData?.consignee_address_line_1 || initialData?.address_line_1 || initialData?.to_address_line_1 || initialData?.consignee_address || initialData?.to_address || ''
  );
  const [toAddressHtml, setToAddressHtml] = useState<string>(
    initialData?.consignee_address_html || initialData?.to_address_html || ''
  );
  const [toCity, setToCity] = useState<string>(
    initialData?.consignee_city || initialData?.to_city || initialData?.city || ''
  );
  const [toState, setToState] = useState<string>(
    initialData?.consignee_state || initialData?.to_state || initialData?.state || ''
  );
  const [toPincode, setToPincode] = useState<string>(
    initialData?.consignee_pincode || initialData?.to_pincode || initialData?.pincode || ''
  );
  const [toPincodeLoading, setToPincodeLoading] = useState<boolean>(false);
  const [toPincodeError, setToPincodeError] = useState<string>('');
  const [toPincodeSuccess, setToPincodeSuccess] = useState<boolean>(false);

  // SECTION B: FROM / CONSIGNOR State
  const [fromName, setFromName] = useState<string>(
    initialData?.sender_name || initialData?.consignor_name || initialData?.from_name || ''
  );
  const [fromContactPerson, setFromContactPerson] = useState<string>(
    initialData?.sender_contact_person || initialData?.consignor_contact_person || initialData?.from_contact_person || ''
  );
  const [fromIncludeContactPerson, setFromIncludeContactPerson] = useState<boolean>(
    Boolean(initialData?.sender_include_contact_person || initialData?.consignor_include_contact_person || initialData?.from_include_contact_person)
  );
  const [fromCountry, setFromCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [fromMobileDigits, setFromMobileDigits] = useState<string>('');
  const [fromMobileError, setFromMobileError] = useState<string>('');
  const [isFromCountryOpen, setIsFromCountryOpen] = useState<boolean>(false);
  const [fromCountrySearch, setFromCountrySearch] = useState<string>('');
  const [fromAddressLine1, setFromAddressLine1] = useState<string>(
    initialData?.consignor_address_line_1 || initialData?.from_address_line_1 || initialData?.sender_address || initialData?.consignor_address || initialData?.from_address || ''
  );
  const [fromAddressHtml, setFromAddressHtml] = useState<string>(
    initialData?.consignor_address_html || initialData?.from_address_html || ''
  );
  const [fromCity, setFromCity] = useState<string>(
    initialData?.consignor_city || initialData?.from_city || initialData?.sender_city || ''
  );
  const [fromState, setFromState] = useState<string>(
    initialData?.consignor_state || initialData?.from_state || initialData?.sender_state || ''
  );
  const [fromPincode, setFromPincode] = useState<string>(
    initialData?.consignor_pincode || initialData?.from_pincode || initialData?.sender_pincode || ''
  );
  const [fromPincodeLoading, setFromPincodeLoading] = useState<boolean>(false);
  const [fromPincodeError, setFromPincodeError] = useState<string>('');
  const [fromPincodeSuccess, setFromPincodeSuccess] = useState<boolean>(false);

  // Individual field formatting states for Section A (TO) and Section B (FROM)
  const [toFormatting, setToFormatting] = useState<SectionFormatting>(DEFAULT_TO_FORMATTING);
  const [fromFormatting, setFromFormatting] = useState<SectionFormatting>(DEFAULT_FROM_FORMATTING);

  const updateToFieldFormatting = (field: keyof SectionFormatting, fmt: FieldFormatting) => {
    setToFormatting((prev) => ({ ...prev, [field]: fmt }));
  };

  const updateFromFieldFormatting = (field: keyof SectionFormatting, fmt: FieldFormatting) => {
    setFromFormatting((prev) => ({ ...prev, [field]: fmt }));
  };

  // Synchronize initialData when loaded from history
  useEffect(() => {
    if (!initialData) return;
    setTrackingNumber(initialData.tracking_number || initialData.trackingNumber || '');

    // Section A
    setToName(initialData.recipient_name || initialData.consignee_name || initialData.to_name || '');
    setToContactPerson(initialData.contact_person_name || initialData.consignee_contact_person || initialData.to_contact_person || '');
    setToIncludeContactPerson(Boolean(initialData.include_contact_person_on_label || initialData.consignee_include_contact_person || initialData.to_include_contact_person));
    const addrA = initialData.consignee_address_line_1 || initialData.address_line_1 || initialData.to_address_line_1 || initialData.consignee_address || initialData.to_address || '';
    setToAddressLine1(addrA);
    const htmlA = initialData.consignee_address_html || initialData.to_address_html || addrA;
    setToAddressHtml(htmlA);
    const edA = document.getElementById('section-a-address-editor');
    if (edA) edA.innerHTML = htmlA;

    setToCity(initialData.consignee_city || initialData.to_city || initialData.city || '');
    setToState(initialData.consignee_state || initialData.to_state || initialData.state || '');
    setToPincode(initialData.consignee_pincode || initialData.to_pincode || initialData.pincode || '');

    const pastToMob = initialData.consignee_mobile || initialData.mobile || initialData.to_mobile || '';
    const parsedTo = parseMobileAndCountry(pastToMob);
    setToCountry(parsedTo.country);
    setToMobileDigits(parsedTo.digits);

    // Section B
    setFromName(initialData.sender_name || initialData.consignor_name || initialData.from_name || '');
    setFromContactPerson(initialData.sender_contact_person || initialData.consignor_contact_person || initialData.from_contact_person || '');
    setFromIncludeContactPerson(Boolean(initialData.sender_include_contact_person || initialData.consignor_include_contact_person || initialData.from_include_contact_person));
    const addrB = initialData.consignor_address_line_1 || initialData.from_address_line_1 || initialData.sender_address || initialData.consignor_address || initialData.from_address || '';
    setFromAddressLine1(addrB);
    const htmlB = initialData.consignor_address_html || initialData.from_address_html || addrB;
    setFromAddressHtml(htmlB);
    const edB = document.getElementById('section-b-address-editor');
    if (edB) edB.innerHTML = htmlB;

    setFromCity(initialData.consignor_city || initialData.from_city || initialData.sender_city || '');
    setFromState(initialData.consignor_state || initialData.from_state || initialData.sender_state || '');
    setFromPincode(initialData.consignor_pincode || initialData.from_pincode || initialData.sender_pincode || '');

    const pastFromMob = initialData.consignor_mobile || initialData.sender_mobile || initialData.from_mobile || '';
    const parsedFrom = parseMobileAndCountry(pastFromMob);
    setFromCountry(parsedFrom.country);
    setFromMobileDigits(parsedFrom.digits);

    if (initialData.courier_company) {
      setActiveShipperName(initialData.courier_company);
    }
    if (initialData.courier_logo) {
      setActiveShipperLogo(initialData.courier_logo);
    }
  }, [initialData]);

  // Initial populate of contenteditable editors on mount
  useEffect(() => {
    const edA = document.getElementById('section-a-address-editor');
    if (edA && !edA.innerHTML && toAddressHtml) {
      edA.innerHTML = toAddressHtml;
    } else if (edA && !edA.innerHTML && toAddressLine1) {
      edA.innerText = toAddressLine1;
    }
    const edB = document.getElementById('section-b-address-editor');
    if (edB && !edB.innerHTML && fromAddressHtml) {
      edB.innerHTML = fromAddressHtml;
    } else if (edB && !edB.innerHTML && fromAddressLine1) {
      edB.innerText = fromAddressLine1;
    }
  }, [toAddressHtml, fromAddressHtml, toAddressLine1, fromAddressLine1]);

  // Standard Font Colors for Quick Color Palette
  const STANDARD_FONT_COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'Red', hex: '#DC2626' },
    { name: 'Blue', hex: '#2563EB' },
    { name: 'Green', hex: '#16A34A' },
    { name: 'Orange', hex: '#EA580C' },
    { name: 'Purple', hex: '#9333EA' },
    { name: 'Yellow', hex: '#EAB308' },
    { name: 'Gray', hex: '#4B5563' },
  ];

  // Font Color palette state for Section A and Section B independently
  const [showColorPaletteA, setShowColorPaletteA] = useState(false);
  const [showColorPaletteB, setShowColorPaletteB] = useState(false);
  const [activeColorA, setActiveColorA] = useState('#2563EB');
  const [activeColorB, setActiveColorB] = useState('#2563EB');
  const colorPaletteRefA = useRef<HTMLDivElement>(null);
  const colorPaletteRefB = useRef<HTMLDivElement>(null);

  // Size menu state for Section A and Section B
  const [showSizeMenuA, setShowSizeMenuA] = useState<boolean>(false);
  const sizeMenuRefA = useRef<HTMLDivElement>(null);
  const [selectedSizeA, setSelectedSizeA] = useState<string>('');

  const [showSizeMenuB, setShowSizeMenuB] = useState<boolean>(false);
  const sizeMenuRefB = useRef<HTMLDivElement>(null);
  const [selectedSizeB, setSelectedSizeB] = useState<string>('');

  // Highlight menu state for Section A and Section B
  const [showHighlightMenuA, setShowHighlightMenuA] = useState<boolean>(false);
  const highlightMenuRefA = useRef<HTMLDivElement>(null);

  const [showHighlightMenuB, setShowHighlightMenuB] = useState<boolean>(false);
  const highlightMenuRefB = useRef<HTMLDivElement>(null);

  // Text Case menu state for Section A and Section B
  const [showCaseMenuA, setShowCaseMenuA] = useState<boolean>(false);
  const caseMenuRefA = useRef<HTMLDivElement>(null);
  const [caseModeA, setCaseModeA] = useState<'normal' | 'uppercase' | 'lowercase'>('normal');

  const [showCaseMenuB, setShowCaseMenuB] = useState<boolean>(false);
  const caseMenuRefB = useRef<HTMLDivElement>(null);
  const [caseModeB, setCaseModeB] = useState<'normal' | 'uppercase' | 'lowercase'>('normal');

  // Baseline raw text storage to preserve original casing when switching to Normal Case
  const toOriginalTextRef = useRef({
    name: initialData?.recipient_name || initialData?.consignee_name || initialData?.to_name || '',
    contactPerson: initialData?.contact_person_name || initialData?.consignee_contact_person || initialData?.to_contact_person || '',
    addressHtml: initialData?.consignee_address_html || initialData?.to_address_html || '',
    addressLine1: initialData?.consignee_address_line_1 || initialData?.address_line_1 || initialData?.to_address_line_1 || initialData?.consignee_address || initialData?.to_address || '',
    city: initialData?.consignee_city || initialData?.to_city || initialData?.city || '',
    state: initialData?.consignee_state || initialData?.to_state || initialData?.state || '',
  });

  const fromOriginalTextRef = useRef({
    name: initialData?.sender_name || initialData?.consignor_name || initialData?.from_name || '',
    contactPerson: initialData?.sender_contact_person || initialData?.consignor_contact_person || initialData?.from_contact_person || '',
    addressHtml: initialData?.consignor_address_html || initialData?.from_address_html || '',
    addressLine1: initialData?.consignor_address_line_1 || initialData?.from_address_line_1 || initialData?.sender_address || initialData?.consignor_address || initialData?.from_address || '',
    city: initialData?.consignor_city || initialData?.from_city || initialData?.sender_city || '',
    state: initialData?.consignor_state || initialData?.from_state || initialData?.sender_state || '',
  });

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const targetNode = e.target as Node;
      if (colorPaletteRefA.current && !colorPaletteRefA.current.contains(targetNode)) {
        setShowColorPaletteA(false);
      }
      if (colorPaletteRefB.current && !colorPaletteRefB.current.contains(targetNode)) {
        setShowColorPaletteB(false);
      }
      if (sizeMenuRefA.current && !sizeMenuRefA.current.contains(targetNode)) {
        setShowSizeMenuA(false);
      }
      if (sizeMenuRefB.current && !sizeMenuRefB.current.contains(targetNode)) {
        setShowSizeMenuB(false);
      }
      if (highlightMenuRefA.current && !highlightMenuRefA.current.contains(targetNode)) {
        setShowHighlightMenuA(false);
      }
      if (highlightMenuRefB.current && !highlightMenuRefB.current.contains(targetNode)) {
        setShowHighlightMenuB(false);
      }
      if (caseMenuRefA.current && !caseMenuRefA.current.contains(targetNode)) {
        setShowCaseMenuA(false);
      }
      if (caseMenuRefB.current && !caseMenuRefB.current.contains(targetNode)) {
        setShowCaseMenuB(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Selection Preservation and Word-Style Formatting Controls
  // Independent selection storage for Section A and Section B
  const savedSelectionsRef = useRef<Record<string, Range | null>>({});

  const saveSelection = (editorId: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const editor = document.getElementById(editorId);
      if (editor && editor.contains(range.commonAncestorContainer)) {
        savedSelectionsRef.current[editorId] = range.cloneRange();
      }
    }
  };

  const syncEditorContent = (editorId: string) => {
    const editor = document.getElementById(editorId);
    if (!editor) return;
    if (editorId === 'section-a-address-editor') {
      if (caseModeA === 'normal') {
        toOriginalTextRef.current.addressHtml = editor.innerHTML;
        toOriginalTextRef.current.addressLine1 = editor.innerText.trim();
      }
      setToAddressHtml(editor.innerHTML);
      setToAddressLine1(editor.innerText.trim());
      if (errors.toAddress) setErrors((prev) => ({ ...prev, toAddress: '' }));
    } else if (editorId === 'section-b-address-editor') {
      if (caseModeB === 'normal') {
        fromOriginalTextRef.current.addressHtml = editor.innerHTML;
        fromOriginalTextRef.current.addressLine1 = editor.innerText.trim();
      }
      setFromAddressHtml(editor.innerHTML);
      setFromAddressLine1(editor.innerText.trim());
      if (errors.fromAddress) setErrors((prev) => ({ ...prev, fromAddress: '' }));
    }
  };

  // Highlight Options with Bold, Vibrant Background Colors and Contrasting Text Colors
  const HIGHLIGHT_OPTIONS = [
    { id: 'yellow', label: 'Yellow', bgColor: '#FACC15', textColor: '#000000' },
    { id: 'green', label: 'Green', bgColor: '#16A34A', textColor: '#FFFFFF' },
    { id: 'parrot_green', label: 'Parrot Green', bgColor: '#84CC16', textColor: '#000000' },
    { id: 'cyan', label: 'Cyan', bgColor: '#06B6D4', textColor: '#FFFFFF' },
    { id: 'pink', label: 'Pink', bgColor: '#EC4899', textColor: '#FFFFFF' },
    { id: 'orange', label: 'Orange', bgColor: '#EA580C', textColor: '#FFFFFF' },
    { id: 'red', label: 'Red', bgColor: '#DC2626', textColor: '#FFFFFF' },
    { id: 'blue', label: 'Blue', bgColor: '#2563EB', textColor: '#FFFFFF' },
  ];

  const applyHighlight = (editorId: string, highlightId: string) => {
    const editor = document.getElementById(editorId);
    if (!editor) return;

    const sel = window.getSelection();
    let targetRange: Range | null = null;

    if (sel && sel.rangeCount > 0) {
      const curRange = sel.getRangeAt(0);
      if (editor.contains(curRange.commonAncestorContainer) && !curRange.collapsed) {
        targetRange = curRange;
      }
    }

    if (!targetRange && savedSelectionsRef.current[editorId]) {
      const saved = savedSelectionsRef.current[editorId];
      if (saved && !saved.collapsed && editor.contains(saved.commonAncestorContainer)) {
        targetRange = saved;
      }
    }

    // STRICT REQUIREMENT: If no text is explicitly selected within this editor, exit immediately.
    if (!targetRange || targetRange.collapsed) {
      return;
    }

    editor.focus();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(targetRange);
    }

    if (highlightId === 'clear' || highlightId === 'transparent' || highlightId === '') {
      try {
        document.execCommand('backColor', false, 'inherit');
      } catch {}
      try {
        document.execCommand('backColor', false, 'transparent');
      } catch {}
      try {
        document.execCommand('foreColor', false, '#000000');
      } catch {}

      // Clean up inline styles on elements in targetRange
      const container = targetRange.commonAncestorContainer;
      let node: Node | null = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as HTMLElement);
      while (node && node !== editor) {
        if (node instanceof HTMLElement) {
          if (node.style.backgroundColor) node.style.backgroundColor = '';
          if (node.style.color && (node.style.color === 'rgb(255, 255, 255)' || node.style.color === 'white')) {
            node.style.color = '';
          }
        }
        node = node.parentElement;
      }
      if (container instanceof HTMLElement) {
        container.querySelectorAll('[style*="background-color"], mark').forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.backgroundColor = '';
            if (el.style.color === 'rgb(255, 255, 255)' || el.style.color === 'white') {
              el.style.color = '';
            }
          }
        });
      }
    } else {
      const found = HIGHLIGHT_OPTIONS.find((h) => h.id === highlightId || h.bgColor.toLowerCase() === highlightId.toLowerCase());
      const bgColor = found ? found.bgColor : highlightId;
      const textColor = found ? found.textColor : '#000000';

      let applied = false;
      try {
        applied = document.execCommand('backColor', false, bgColor);
      } catch {}
      if (!applied) {
        try {
          applied = document.execCommand('hiliteColor', false, bgColor);
        } catch {}
      }
      try {
        document.execCommand('foreColor', false, textColor);
      } catch {}
    }

    syncEditorContent(editorId);
    if (sel && sel.rangeCount > 0) {
      savedSelectionsRef.current[editorId] = sel.getRangeAt(0).cloneRange();
    }
  };

  const applyCommand = (editorId: string, command: string, value: string | null = null) => {
    if (command === 'hiliteColor') {
      applyHighlight(editorId, value ?? 'clear');
      return;
    }

    const editor = document.getElementById(editorId);
    if (!editor) return;

    // Check if there is an active non-collapsed selection specifically in this editor
    const sel = window.getSelection();
    let targetRange: Range | null = null;

    if (sel && sel.rangeCount > 0) {
      const curRange = sel.getRangeAt(0);
      if (editor.contains(curRange.commonAncestorContainer) && !curRange.collapsed) {
        targetRange = curRange;
      }
    }

    if (!targetRange && savedSelectionsRef.current[editorId]) {
      const saved = savedSelectionsRef.current[editorId];
      if (saved && !saved.collapsed && editor.contains(saved.commonAncestorContainer)) {
        targetRange = saved;
      }
    }

    // STRICT REQUIREMENT: If no text is explicitly selected within this editor,
    // DO NOT format Address Line 1 or any other field! Exit immediately.
    if (!targetRange || targetRange.collapsed) {
      return;
    }

    // Restore focus and selection specifically within this editor
    editor.focus();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(targetRange);
    }

    document.execCommand(command, false, value ?? undefined);

    syncEditorContent(editorId);
    if (sel && sel.rangeCount > 0) {
      savedSelectionsRef.current[editorId] = sel.getRangeAt(0).cloneRange();
    }
  };

  const applyFontSize = (editorId: string, sizePt: string) => {
    const editor = document.getElementById(editorId);
    if (!editor) return;

    const sel = window.getSelection();
    let targetRange: Range | null = null;

    if (sel && sel.rangeCount > 0) {
      const curRange = sel.getRangeAt(0);
      if (editor.contains(curRange.commonAncestorContainer) && !curRange.collapsed) {
        targetRange = curRange;
      }
    }

    if (!targetRange && savedSelectionsRef.current[editorId]) {
      const saved = savedSelectionsRef.current[editorId];
      if (saved && !saved.collapsed && editor.contains(saved.commonAncestorContainer)) {
        targetRange = saved;
      }
    }

    if (!targetRange || targetRange.collapsed) {
      return;
    }

    editor.focus();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(targetRange);
    }

    document.execCommand('fontSize', false, '7');
    const fontEls = editor.querySelectorAll('font[size="7"]');
    fontEls.forEach((el) => {
      const span = document.createElement('span');
      span.style.fontSize = sizePt;
      span.innerHTML = el.innerHTML;
      el.parentNode?.replaceChild(span, el);
    });

    syncEditorContent(editorId);
    if (sel && sel.rangeCount > 0) {
      savedSelectionsRef.current[editorId] = sel.getRangeAt(0).cloneRange();
    }
  };

  const applyTextCase = (section: 'A' | 'B', mode: 'normal' | 'upper' | 'lower') => {
    const editorId = section === 'A' ? 'section-a-address-editor' : 'section-b-address-editor';
    const editor = document.getElementById(editorId);

    let transformedSelection = false;
    const sel = window.getSelection();
    let targetRange: Range | null = null;
    if (sel && sel.rangeCount > 0 && editor) {
      const curRange = sel.getRangeAt(0);
      if (editor.contains(curRange.commonAncestorContainer) && !curRange.collapsed) {
        targetRange = curRange;
      }
    }
    if (!targetRange && editor && savedSelectionsRef.current[editorId]) {
      const saved = savedSelectionsRef.current[editorId];
      if (saved && !saved.collapsed && editor.contains(saved.commonAncestorContainer)) {
        targetRange = saved;
      }
    }

    if (targetRange && !targetRange.collapsed && editor) {
      editor.focus();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(targetRange);
      }
      const rawText = targetRange.toString();
      let replacement = rawText;
      if (mode === 'upper') replacement = rawText.toUpperCase();
      else if (mode === 'lower') replacement = rawText.toLowerCase();
      document.execCommand('insertText', false, replacement);
      syncEditorContent(editorId);
      transformedSelection = true;
    }

    if (section === 'A') {
      const targetCase = mode === 'upper' ? 'uppercase' : mode === 'lower' ? 'lowercase' : 'normal';
      setCaseModeA(targetCase);
      if (mode === 'upper') {
        setToName(toOriginalTextRef.current.name.toUpperCase());
        setToContactPerson(toOriginalTextRef.current.contactPerson.toUpperCase());
        setToCity(toOriginalTextRef.current.city.toUpperCase());
        setToState(toOriginalTextRef.current.state.toUpperCase());
        if (editor && !transformedSelection) {
          const newHtml = transformHtmlText(toOriginalTextRef.current.addressHtml || editor.innerHTML, (t) => t.toUpperCase());
          editor.innerHTML = newHtml;
          setToAddressHtml(newHtml);
          setToAddressLine1(editor.innerText.trim());
        }
      } else if (mode === 'lower') {
        setToName(toOriginalTextRef.current.name.toLowerCase());
        setToContactPerson(toOriginalTextRef.current.contactPerson.toLowerCase());
        setToCity(toOriginalTextRef.current.city.toLowerCase());
        setToState(toOriginalTextRef.current.state.toLowerCase());
        if (editor && !transformedSelection) {
          const newHtml = transformHtmlText(toOriginalTextRef.current.addressHtml || editor.innerHTML, (t) => t.toLowerCase());
          editor.innerHTML = newHtml;
          setToAddressHtml(newHtml);
          setToAddressLine1(editor.innerText.trim());
        }
      } else {
        // Normal Case: restore text as originally entered
        setToName(toOriginalTextRef.current.name);
        setToContactPerson(toOriginalTextRef.current.contactPerson);
        setToCity(toOriginalTextRef.current.city);
        setToState(toOriginalTextRef.current.state);
        if (editor && !transformedSelection) {
          editor.innerHTML = toOriginalTextRef.current.addressHtml;
          setToAddressHtml(toOriginalTextRef.current.addressHtml);
          setToAddressLine1(toOriginalTextRef.current.addressLine1);
        }
      }
    } else {
      const targetCase = mode === 'upper' ? 'uppercase' : mode === 'lower' ? 'lowercase' : 'normal';
      setCaseModeB(targetCase);
      if (mode === 'upper') {
        setFromName(fromOriginalTextRef.current.name.toUpperCase());
        setFromContactPerson(fromOriginalTextRef.current.contactPerson.toUpperCase());
        setFromCity(fromOriginalTextRef.current.city.toUpperCase());
        setFromState(fromOriginalTextRef.current.state.toUpperCase());
        if (editor && !transformedSelection) {
          const newHtml = transformHtmlText(fromOriginalTextRef.current.addressHtml || editor.innerHTML, (t) => t.toUpperCase());
          editor.innerHTML = newHtml;
          setFromAddressHtml(newHtml);
          setFromAddressLine1(editor.innerText.trim());
        }
      } else if (mode === 'lower') {
        setFromName(fromOriginalTextRef.current.name.toLowerCase());
        setFromContactPerson(fromOriginalTextRef.current.contactPerson.toLowerCase());
        setFromCity(fromOriginalTextRef.current.city.toLowerCase());
        setFromState(fromOriginalTextRef.current.state.toLowerCase());
        if (editor && !transformedSelection) {
          const newHtml = transformHtmlText(fromOriginalTextRef.current.addressHtml || editor.innerHTML, (t) => t.toLowerCase());
          editor.innerHTML = newHtml;
          setFromAddressHtml(newHtml);
          setFromAddressLine1(editor.innerText.trim());
        }
      } else {
        // Normal Case: restore text as originally entered
        setFromName(fromOriginalTextRef.current.name);
        setFromContactPerson(fromOriginalTextRef.current.contactPerson);
        setFromCity(fromOriginalTextRef.current.city);
        setFromState(fromOriginalTextRef.current.state);
        if (editor && !transformedSelection) {
          editor.innerHTML = fromOriginalTextRef.current.addressHtml;
          setFromAddressHtml(fromOriginalTextRef.current.addressHtml);
          setFromAddressLine1(fromOriginalTextRef.current.addressLine1);
        }
      }
    }
  };

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  // Filtered countries for search
  const filteredToCountries = useMemo(() => {
    if (!toCountrySearch.trim()) return COUNTRIES;
    const q = toCountrySearch.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [toCountrySearch]);

  const filteredFromCountries = useMemo(() => {
    if (!fromCountrySearch.trim()) return COUNTRIES;
    const q = fromCountrySearch.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [fromCountrySearch]);

  // Combined phone strings
  const toMobileFull = toMobileDigits.trim()
    ? `${toCountry.dialCode} ${toMobileDigits.trim()}`
    : '';
  const fromMobileFull = fromMobileDigits.trim()
    ? `${fromCountry.dialCode} ${fromMobileDigits.trim()}`
    : '';

  // Pincode Lookup Callbacks matching Create Label
  const lookupToPincode = React.useCallback(async (code: string) => {
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setToPincodeError('');
      setToPincodeSuccess(false);
      return;
    }

    setToPincodeLoading(true);
    setToPincodeError('');
    setToPincodeSuccess(false);

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
        setToCity(resolvedCity);
        setToState(resolvedState);
        setToPincodeSuccess(true);
        setToPincodeError('');
        setErrors((prev) => ({ ...prev, toCity: '', toState: '', toPincode: '' }));
      } else {
        setToPincodeError('Pincode not found or invalid');
        setToPincodeSuccess(false);
      }
    } catch {
      setToPincodeError('Failed to lookup pincode');
      setToPincodeSuccess(false);
    } finally {
      setToPincodeLoading(false);
    }
  }, []);

  const lookupFromPincode = React.useCallback(async (code: string) => {
    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setFromPincodeError('');
      setFromPincodeSuccess(false);
      return;
    }

    setFromPincodeLoading(true);
    setFromPincodeError('');
    setFromPincodeSuccess(false);

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
        setFromCity(resolvedCity);
        setFromState(resolvedState);
        setFromPincodeSuccess(true);
        setFromPincodeError('');
        setErrors((prev) => ({ ...prev, fromCity: '', fromState: '', fromPincode: '' }));
      } else {
        setFromPincodeError('Pincode not found or invalid');
        setFromPincodeSuccess(false);
      }
    } catch {
      setFromPincodeError('Failed to lookup pincode');
      setFromPincodeSuccess(false);
    } finally {
      setFromPincodeLoading(false);
    }
  }, []);

  // Keyboard handler matching Create Label
  const handleMobileKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    country: CountryCode,
    digits: string,
    error: string,
    setError: (msg: string) => void
  ) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key) ||
      (e.ctrlKey || e.metaKey)
    ) {
      if (error && ['Backspace', 'Delete'].includes(e.key)) {
        setError('');
      }
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    if (country.code === 'IN' && digits.length >= 10) {
      const input = e.currentTarget;
      if (input.selectionStart !== null && input.selectionEnd !== null && input.selectionStart !== input.selectionEnd) {
        setError('');
        return;
      }
      e.preventDefault();
      setError('Accepts only 10 digits');
    } else {
      setError('');
    }
  };

  const handleToMobileDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, '');
    let finalDigits = clean;
    if (toCountry.code === 'IN') {
      if (clean.length > 10) {
        setToMobileError('Accepts only 10 digits');
        finalDigits = clean.slice(0, 10);
      } else {
        setToMobileError('');
        finalDigits = clean;
      }
    } else {
      setToMobileError('');
      const max = toCountry.maxLength || 15;
      finalDigits = clean.slice(0, max);
    }
    setToMobileDigits(finalDigits);
    if (errors.toMobile) setErrors((prev) => ({ ...prev, toMobile: '' }));
  };

  const handleFromMobileDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = raw.replace(/\D/g, '');
    let finalDigits = clean;
    if (fromCountry.code === 'IN') {
      if (clean.length > 10) {
        setFromMobileError('Accepts only 10 digits');
        finalDigits = clean.slice(0, 10);
      } else {
        setFromMobileError('');
        finalDigits = clean;
      }
    } else {
      setFromMobileError('');
      const max = fromCountry.maxLength || 15;
      finalDigits = clean.slice(0, max);
    }
    setFromMobileDigits(finalDigits);
    if (errors.fromMobile) setErrors((prev) => ({ ...prev, fromMobile: '' }));
  };

  // Handler for Shipper selection
  const handleShipperSelect = (val: string) => {
    if (val === '__ADD_NEW_SHIPPER__') {
      setNewShipperName('');
      setNewShipperLogoUrl('');
      setNewShipperError('');
      setIsAddShipperModalOpen(true);
      return;
    }

    const custom = customShippers.find((cs) => cs.id === val || cs.name === val);
    if (custom) {
      setActiveShipperName(custom.name);
      setActiveShipperLogo(custom.logoUrl);
      onCourierChange(custom.name);
      return;
    }

    setActiveShipperName(val);
    const standardLogo = val === 'GEO TRANSIT' ? DEFAULT_GEO_TRANSIT_LOGO : (resolveCourierLogo(val) || undefined);
    setActiveShipperLogo(standardLogo);
    onCourierChange(val);
  };

  // Handler for saving a new manual shipper
  const handleSaveNewShipper = () => {
    const trimmed = newShipperName.trim();
    if (!trimmed) {
      setNewShipperError('Shipper Name is required.');
      return;
    }

    const newShipper: CustomShipper = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      logoUrl: newShipperLogoUrl || undefined,
    };

    const updated = [...customShippers, newShipper];
    setCustomShippers(updated);
    try {
      localStorage.setItem(CUSTOM_SHIPPERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist custom shipper to storage:', e);
    }

    setActiveShipperName(newShipper.name);
    setActiveShipperLogo(newShipper.logoUrl);
    onCourierChange(newShipper.name);
    setIsAddShipperModalOpen(false);
    setNewShipperName('');
    setNewShipperLogoUrl('');
    setNewShipperError('');
    setFeedback({
      type: 'success',
      message: `Shipper "${newShipper.name}" created and selected successfully!`,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setNewShipperError('Supported formats: PNG, JPG, JPEG, and WebP only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNewShipperError('Logo image size must be less than 5MB.');
      return;
    }

    setNewShipperError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewShipperLogoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Dynamic preview data object
  const previewData: AddressPrintData = {
    to_name: toName,
    to_contact_person: toContactPerson,
    to_include_contact_person: toIncludeContactPerson,
    to_mobile: toMobileFull,
    to_address: [toAddressLine1, toCity, toState].filter(Boolean).join(', '),
    to_address_line_1: toAddressLine1,
    to_address_html: toAddressHtml,
    to_city: toCity,
    to_state: toState,
    to_pincode: toPincode,
    to_text_case: caseModeA,
    to_formatting: toFormatting,
    from_name: fromName,
    from_contact_person: fromContactPerson,
    from_include_contact_person: fromIncludeContactPerson,
    from_mobile: fromMobileFull,
    from_address: [fromAddressLine1, fromCity, fromState].filter(Boolean).join(', '),
    from_address_line_1: fromAddressLine1,
    from_address_html: fromAddressHtml,
    from_city: fromCity,
    from_state: fromState,
    from_pincode: fromPincode,
    from_text_case: caseModeB,
    from_formatting: fromFormatting,
    tracking_number: trackingNumber,
    courier_company: activeShipperName,
    courier_logo: activeShipperLogo,
    package_count: toQuantity > 1 ? `01 / ${String(toQuantity).padStart(2, '0')}` : '01 / 01',
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Consignment / Tracking Number is now optional for printing & saving

    const toQtyNum = Number(toQuantity);
    const fromQtyNum = Number(fromQuantity);

    if (isNaN(toQtyNum) || toQtyNum < 1 || !Number.isInteger(toQtyNum)) {
      newErrors.toQuantity = 'Multiple Print must be a positive whole number (min 1).';
    } else if (toQtyNum > 100) {
      newErrors.toQuantity = 'Maximum 100 label copies allowed per batch.';
    }

    if (isNaN(fromQtyNum) || fromQtyNum < 1 || !Number.isInteger(fromQtyNum)) {
      newErrors.fromQuantity = 'Multiple Print must be a positive whole number (min 1).';
    } else if (fromQtyNum > 100) {
      newErrors.fromQuantity = 'Maximum 100 label copies allowed per batch.';
    }

    if (!newErrors.toQuantity && !newErrors.fromQuantity && toQtyNum !== fromQtyNum) {
      newErrors.quantityMismatch = `Quantity Mismatch: Section A (${toQtyNum}) and Section B (${fromQtyNum}) must be equal. Please make both Multiple Print values equal before printing.`;
    }

    // Section A Validation
    if (!toName.trim()) {
      newErrors.toName = 'Recipient / Company Name is required.';
    }

    if (!toMobileDigits.trim()) {
      newErrors.toMobile = 'Mobile Number is required.';
    } else if (toCountry.code === 'IN' && !/^\d{10}$/.test(toMobileDigits.trim())) {
      newErrors.toMobile = 'Must be exactly 10 digits for India (+91).';
    } else if (toMobileDigits.trim().replace(/\D/g, '').length < 5) {
      newErrors.toMobile = 'Mobile number is too short.';
    }

    if (!toAddressLine1.trim()) {
      newErrors.toAddress = 'Address Line 1 is required.';
    }

    if (!toCity.trim()) {
      newErrors.toCity = 'City is required.';
    }

    if (!toState.trim()) {
      newErrors.toState = 'State is required.';
    }

    if (!toPincode.trim()) {
      newErrors.toPincode = 'Pincode is required.';
    } else if (toCountry.code === 'IN' && !/^\d{6}$/.test(toPincode.trim())) {
      newErrors.toPincode = 'Must be exactly 6 digits for India.';
    }

    // Section B Validation
    if (!fromName.trim()) {
      newErrors.fromName = 'Sender / Company Name is required.';
    }

    if (!fromMobileDigits.trim()) {
      newErrors.fromMobile = 'Mobile Number is required.';
    } else if (fromCountry.code === 'IN' && !/^\d{10}$/.test(fromMobileDigits.trim())) {
      newErrors.fromMobile = 'Must be exactly 10 digits for India (+91).';
    } else if (fromMobileDigits.trim().replace(/\D/g, '').length < 5) {
      newErrors.fromMobile = 'Mobile number is too short.';
    }

    if (!fromAddressLine1.trim()) {
      newErrors.fromAddress = 'Address Line 1 is required.';
    }

    if (!fromCity.trim()) {
      newErrors.fromCity = 'City is required.';
    }

    if (!fromState.trim()) {
      newErrors.fromState = 'State is required.';
    }

    if (!fromPincode.trim()) {
      newErrors.fromPincode = 'Pincode is required.';
    } else if (fromCountry.code === 'IN' && !/^\d{6}$/.test(fromPincode.trim())) {
      newErrors.fromPincode = 'Must be exactly 6 digits for India.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      setFeedback({
        type: 'error',
        message: `Validation Error: ${firstError}`,
      });
      return false;
    }

    return true;
  };

  const finalQuantity = Math.max(1, Math.min(100, Number(toQuantity) || 1));

  // Save Action
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        templateId: template?.id,
        tracking_number: trackingNumber.trim(),
        recipient_name: toName.trim(),
        contact_person_name: toContactPerson.trim(),
        include_contact_person_on_label: toIncludeContactPerson,
        mobile: toMobileFull,
        address_line_1: toAddressLine1.trim(),
        city: toCity.trim(),
        state: toState.trim(),
        pincode: toPincode.trim(),
        service: 'ADDRESS DISPATCH',
        service_type: 'CONSIGNEE / CONSIGNOR',
        origin_code: 'ORG',
        destination_code: 'DST',
        payment_status: 'PREPAID',
        weight: 1.0,
        mode: 'SURFACE',
        package_count: finalQuantity > 1 ? `${finalQuantity} Labels` : '01 / 01',
        courier_company: activeShipperName,
        courier_logo: activeShipperLogo,
        is_address_print: true,
        label_type: 'ADDRESS_PRINT',
        label_quantity: finalQuantity,
        consignee_name: toName.trim(),
        consignee_contact_person: toContactPerson.trim(),
        consignee_include_contact_person: toIncludeContactPerson,
        consignee_mobile: toMobileFull,
        consignee_address: [toAddressLine1.trim(), toCity.trim(), toState.trim()].filter(Boolean).join(', '),
        consignee_address_line_1: toAddressLine1.trim(),
        consignee_address_html: toAddressHtml,
        to_address_html: toAddressHtml,
        consignee_city: toCity.trim(),
        consignee_state: toState.trim(),
        consignee_pincode: toPincode.trim(),
        consignor_name: fromName.trim(),
        consignor_contact_person: fromContactPerson.trim(),
        consignor_include_contact_person: fromIncludeContactPerson,
        consignor_mobile: fromMobileFull,
        consignor_address: [fromAddressLine1.trim(), fromCity.trim(), fromState.trim()].filter(Boolean).join(', '),
        consignor_address_line_1: fromAddressLine1.trim(),
        consignor_address_html: fromAddressHtml,
        from_address_html: fromAddressHtml,
        consignor_city: fromCity.trim(),
        consignor_state: fromState.trim(),
        consignor_pincode: fromPincode.trim(),
      };

      const res = await fetch('/api/organization/shipping-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        const recordedNo = data.label?.trackingNumber || trackingNumber.trim();
        setFeedback({
          type: 'success',
          message: recordedNo
            ? `Address Label #${recordedNo} (${finalQuantity} copies) successfully recorded in history!`
            : `Address Label (${finalQuantity} copies) successfully recorded in history!`,
        });
        if (onSaveSuccess) onSaveSuccess(data.label);
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to save address shipping label.',
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving address label.' });
    } finally {
      setSaving(false);
    }
  };

  // Print Label Action
  const handlePrint = () => {
    if (!validateForm()) return;
    const copyIds = Array.from(
      { length: finalQuantity },
      (_, idx) => `address-label-print-copy-${idx}`
    );
    printShippingLabel(
      copyIds,
      selectedPrintSize.widthInches,
      selectedPrintSize.heightInches
    );
  };

  // Download PDF Action
  const handleDownloadPDF = async () => {
    if (!validateForm()) return;
    const element = document.getElementById('address-label-live-preview');
    if (!element) {
      alert('Could not find label preview element.');
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('address-label-live-preview');
          if (el) {
            el.style.transform = 'none';
            el.style.position = 'static';
            el.style.boxShadow = 'none';
            el.style.border = 'none';
          }
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const isLandscape = selectedPrintSize.widthInches > selectedPrintSize.heightInches;
      const orientation = isLandscape ? 'landscape' : 'portrait';

      const doc = new jsPDF({
        orientation,
        unit: 'in',
        format: selectedPrintSize.id === 'a4' ? 'a4' : [selectedPrintSize.widthInches, selectedPrintSize.heightInches],
      });

      for (let i = 0; i < finalQuantity; i++) {
        if (i > 0) {
          doc.addPage(
            selectedPrintSize.id === 'a4' ? 'a4' : [selectedPrintSize.widthInches, selectedPrintSize.heightInches],
            orientation
          );
        }
        doc.addImage(
          imgData,
          'PNG',
          0,
          0,
          selectedPrintSize.widthInches,
          selectedPrintSize.heightInches
        );
      }

      const suffix = finalQuantity > 1 ? `-qty-${finalQuantity}` : '';
      doc.save(`address-label-${trackingNumber ? trackingNumber.trim() : 'shipment'}${suffix}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF document.');
    }
  };

  // Download PNG Action
  const handleDownloadPNG = () => {
    if (!validateForm()) return;
    const copyIds = Array.from(
      { length: finalQuantity },
      (_, idx) => `address-label-print-copy-${idx}`
    );
    downloadShippingLabelPNG(copyIds, trackingNumber);
  };

  // Download Excel Action
  const handleDownloadExcel = async () => {
    if (!validateForm()) return;
    try {
      await exportShippingLabelToExcel({
        toName: toName.trim(),
        toContactPerson: toContactPerson.trim(),
        toIncludeContactPerson: toIncludeContactPerson,
        toAddress: toAddressLine1.trim(),
        toAddressHtml: toAddressHtml,
        toCity: toCity.trim(),
        toState: toState.trim(),
        toPincode: toPincode.trim(),
        toMobile: toMobileFull,

        fromName: fromName.trim(),
        fromContactPerson: fromContactPerson.trim(),
        fromIncludeContactPerson: fromIncludeContactPerson,
        fromAddress: fromAddressLine1.trim(),
        fromAddressHtml: fromAddressHtml,
        fromCity: fromCity.trim(),
        fromState: fromState.trim(),
        fromPincode: fromPincode.trim(),
        fromMobile: fromMobileFull,

        trackingNumber: trackingNumber.trim(),
        courierCompany: activeShipperName,
        quantity: finalQuantity,
        barcodeDataUrl: liveBarcodeUrl || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Excel shipping label downloaded successfully (${finalQuantity} ${finalQuantity > 1 ? 'copies' : 'copy'})!`,
      });
    } catch (err) {
      console.error('Failed to export Excel label:', err);
      setFeedback({
        type: 'error',
        message: 'Failed to generate Excel shipping label.',
      });
    }
  };

  // Download Word Action
  const handleDownloadWord = async () => {
    if (!validateForm()) return;
    try {
      await exportShippingLabelToWord({
        toName: toName.trim(),
        toContactPerson: toContactPerson.trim(),
        toIncludeContactPerson: toIncludeContactPerson,
        toAddress: toAddressLine1.trim(),
        toAddressHtml: toAddressHtml,
        toCity: toCity.trim(),
        toState: toState.trim(),
        toPincode: toPincode.trim(),
        toMobile: toMobileFull,

        fromName: fromName.trim(),
        fromContactPerson: fromContactPerson.trim(),
        fromIncludeContactPerson: fromIncludeContactPerson,
        fromAddress: fromAddressLine1.trim(),
        fromAddressHtml: fromAddressHtml,
        fromCity: fromCity.trim(),
        fromState: fromState.trim(),
        fromPincode: fromPincode.trim(),
        fromMobile: fromMobileFull,

        trackingNumber: trackingNumber.trim(),
        courierCompany: activeShipperName,
        quantity: finalQuantity,
        barcodeDataUrl: liveBarcodeUrl || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Word shipping label (.docx) downloaded successfully (${finalQuantity} ${finalQuantity > 1 ? 'copies' : 'copy'})!`,
      });
    } catch (err) {
      console.error('Failed to export Word label:', err);
      setFeedback({
        type: 'error',
        message: 'Failed to generate Word shipping label.',
      });
    }
  };

  // Reset Form
  const handleReset = () => {
    setToName('');
    setToContactPerson('');
    setToIncludeContactPerson(false);
    setToMobileDigits('');
    setToMobileError('');
    setToAddressLine1('');
    setToAddressHtml('');
    const edA = document.getElementById('section-a-address-editor');
    if (edA) edA.innerHTML = '';
    setToCity('');
    setToState('');
    setToPincode('');
    setToPincodeError('');
    setToPincodeSuccess(false);

    setFromName('');
    setFromContactPerson('');
    setFromIncludeContactPerson(false);
    setFromMobileDigits('');
    setFromMobileError('');
    setFromAddressLine1('');
    setFromAddressHtml('');
    const edB = document.getElementById('section-b-address-editor');
    if (edB) edB.innerHTML = '';
    setFromCity('');
    setFromState('');
    setFromPincode('');
    setFromPincodeError('');
    setFromPincodeSuccess(false);

    setTrackingNumber('');
    setToQuantity(1);
    setFromQuantity(1);
    setCaseModeA('normal');
    setCaseModeB('normal');
    setSelectedSizeA('');
    setSelectedSizeB('');
    toOriginalTextRef.current = {
      name: '',
      contactPerson: '',
      addressHtml: '',
      addressLine1: '',
      city: '',
      state: '',
    };
    fromOriginalTextRef.current = {
      name: '',
      contactPerson: '',
      addressHtml: '',
      addressLine1: '',
      city: '',
      state: '',
    };
    setErrors({});
  };

  // ----------------------------------------------------
  // ADDRESS PRINT EXCEL BATCH ACTIONS
  // ----------------------------------------------------
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadAddressPrintExcelTemplate();
      setFeedback({
        type: 'success',
        message: 'Address Print Excel template downloaded successfully!',
      });
    } catch (err) {
      console.error('Failed to download Address Print Excel template:', err);
      setFeedback({
        type: 'error',
        message: 'Failed to download Address Print Excel template.',
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
      setFeedback({
        type: 'error',
        message: 'Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.',
      });
      if (e.target) e.target.value = '';
      return;
    }

    setIsParsingExcel(true);
    setFeedback(null);
    try {
      const summary = await parseAndValidateAddressPrintExcel(file);
      setBatchSummary(summary);
      setSelectedBatchRowIndex(0);
      setBatchFilter('all');
      setIsBatchModalOpen(true);

      if (summary.hasErrors) {
        if (summary.missingRequiredColumns.length > 0) {
          setFeedback({
            type: 'error',
            message: `Excel Validation Error: Missing required column(s): ${summary.missingRequiredColumns.join(', ')}`,
          });
        } else {
          setFeedback({
            type: 'error',
            message: `Imported ${summary.totalRecords} records with ${summary.invalidRecords} error(s). Please review row-specific errors in the preview modal.`,
          });
        }
      } else {
        setFeedback({
          type: 'success',
          message: `Successfully validated ${summary.validRecords} address label records (${summary.totalLabelsCount} total labels) from Excel!`,
        });
      }
    } catch (err: any) {
      console.error('Failed to parse Excel file:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to read Excel file. Please ensure it follows the Address Print template format.',
      });
    } finally {
      setIsParsingExcel(false);
      if (e.target) e.target.value = '';
    }
  };

  const handlePrintBatchLabels = () => {
    if (!batchSummary || batchSummary.validRecords === 0) return;
    const validRows = batchSummary.rows.filter((r) => r.isValid);
    const elementIds: string[] = [];
    validRows.forEach((row) => {
      for (let c = 0; c < row.multiple_print; c++) {
        elementIds.push(`address-batch-label-${row.rowNumber}-copy-${c}`);
      }
    });

    if (elementIds.length === 0) {
      alert('No valid label elements found to print.');
      return;
    }

    printShippingLabel(
      elementIds,
      selectedPrintSize.widthInches,
      selectedPrintSize.heightInches
    );
  };

  const handleDownloadBatchPDF = async () => {
    if (!batchSummary || batchSummary.validRecords === 0) return;
    setIsExportingBatchPdf(true);

    try {
      const validRows = batchSummary.rows.filter((r) => r.isValid);
      const isLandscape = selectedPrintSize.widthInches > selectedPrintSize.heightInches;
      const orientation = isLandscape ? 'landscape' : 'portrait';
      const doc = new jsPDF({
        orientation,
        unit: 'in',
        format: selectedPrintSize.id === 'a4' ? 'a4' : [selectedPrintSize.widthInches, selectedPrintSize.heightInches],
      });

      let isFirstPage = true;

      for (const row of validRows) {
        for (let c = 0; c < row.multiple_print; c++) {
          const elId = `address-batch-label-${row.rowNumber}-copy-${c}`;
          const el = document.getElementById(elId);
          if (!el) continue;

          const canvas = await html2canvas(el, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#FFFFFF',
          });
          const imgData = canvas.toDataURL('image/png');

          if (!isFirstPage) {
            doc.addPage(
              selectedPrintSize.id === 'a4' ? 'a4' : [selectedPrintSize.widthInches, selectedPrintSize.heightInches],
              orientation
            );
          }
          isFirstPage = false;

          doc.addImage(
            imgData,
            'PNG',
            0,
            0,
            selectedPrintSize.widthInches,
            selectedPrintSize.heightInches
          );
        }
      }

      const baseName = batchSummary.fileName.replace(/\.[^/.]+$/, '');
      doc.save(`address-labels-${baseName}.pdf`);
      setFeedback({
        type: 'success',
        message: `Batch PDF (${batchSummary.totalLabelsCount} labels) downloaded successfully!`,
      });
    } catch (err) {
      console.error('Failed to generate batch PDF:', err);
      setFeedback({
        type: 'error',
        message: 'Failed to generate Batch PDF document.',
      });
    } finally {
      setIsExportingBatchPdf(false);
    }
  };

  const handleSaveBatchToHistory = async () => {
    if (!batchSummary || batchSummary.validRecords === 0) return;
    setIsSavingBatch(true);
    const validRows = batchSummary.rows.filter((r) => r.isValid);
    setBatchSaveProgress({ current: 0, total: validRows.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const payload = {
          templateId: template?.id,
          tracking_number: row.tracking_number,
          recipient_name: row.to_name,
          contact_person_name: row.to_contact_person,
          include_contact_person_on_label: row.to_include_contact_person,
          mobile: row.to_mobile_full,
          address_line_1: row.to_address_line_1,
          city: row.to_city,
          state: row.to_state,
          pincode: row.to_pincode,
          service: 'ADDRESS DISPATCH',
          service_type: 'CONSIGNEE / CONSIGNOR',
          origin_code: 'ORG',
          destination_code: 'DST',
          payment_status: 'PREPAID',
          weight: 1.0,
          mode: 'SURFACE',
          package_count: row.multiple_print > 1 ? `${row.multiple_print} Labels` : '01 / 01',
          courier_company: row.courier_company || activeShipperName,
          courier_logo: activeShipperLogo,
          is_address_print: true,
          label_type: 'ADDRESS_PRINT',
          label_quantity: row.multiple_print,
          consignee_name: row.to_name,
          consignee_contact_person: row.to_contact_person,
          consignee_include_contact_person: row.to_include_contact_person,
          consignee_mobile: row.to_mobile_full,
          consignee_address: [row.to_address_line_1, row.to_city, row.to_state].filter(Boolean).join(', '),
          consignee_address_line_1: row.to_address_line_1,
          consignee_city: row.to_city,
          consignee_state: row.to_state,
          consignee_pincode: row.to_pincode,
          consignor_name: row.from_name,
          consignor_contact_person: row.from_contact_person,
          consignor_include_contact_person: row.from_include_contact_person,
          consignor_mobile: row.from_mobile_full,
          consignor_address: [row.from_address_line_1, row.from_city, row.from_state].filter(Boolean).join(', '),
          consignor_address_line_1: row.from_address_line_1,
          consignor_city: row.from_city,
          consignor_state: row.from_state,
          consignor_pincode: row.from_pincode,
        };

        const res = await fetch('/api/organization/shipping-labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      setBatchSaveProgress({ current: i + 1, total: validRows.length });
    }

    setIsSavingBatch(false);
    setBatchSaveProgress(null);

    if (onSaveSuccess) onSaveSuccess(null);

    if (failCount === 0) {
      setFeedback({
        type: 'success',
        message: `Successfully saved all ${successCount} valid address labels to history!`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: `Saved ${successCount} labels. ${failCount} failed to save.`,
      });
    }
  };

  const handleLoadRowIntoEditor = (row: AddressPrintBatchRow) => {
    setToName(row.to_name);
    setToContactPerson(row.to_contact_person);
    setToIncludeContactPerson(row.to_include_contact_person);
    const parsedTo = parseMobileAndCountry(row.to_mobile);
    setToCountry(parsedTo.country);
    setToMobileDigits(parsedTo.digits);
    setToAddressLine1(row.to_address_line_1);
    setToAddressHtml(row.to_address_line_1);
    const edA = document.getElementById('section-a-address-editor');
    if (edA) edA.innerHTML = row.to_address_line_1;
    setToCity(row.to_city);
    setToState(row.to_state);
    setToPincode(row.to_pincode);
    setToQuantity(row.multiple_print);

    setFromName(row.from_name);
    setFromContactPerson(row.from_contact_person);
    setFromIncludeContactPerson(row.from_include_contact_person);
    const parsedFrom = parseMobileAndCountry(row.from_mobile);
    setFromCountry(parsedFrom.country);
    setFromMobileDigits(parsedFrom.digits);
    setFromAddressLine1(row.from_address_line_1);
    setFromAddressHtml(row.from_address_line_1);
    const edB = document.getElementById('section-b-address-editor');
    if (edB) edB.innerHTML = row.from_address_line_1;
    setFromCity(row.from_city);
    setFromState(row.from_state);
    setFromPincode(row.from_pincode);
    setFromQuantity(row.multiple_print);

    setTrackingNumber(row.tracking_number);
    if (row.courier_company) {
      setActiveShipperName(row.courier_company);
      onCourierChange(row.courier_company);
    }

    setIsBatchModalOpen(false);
    setFeedback({
      type: 'success',
      message: `Loaded record #${row.rowNumber} (${row.to_name}) into Address Print editor.`,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: DEDICATED ADDRESS ENTRY INTERFACE (EXPANDED BY ~14% / 10%+) */}
      {/* ========================================================================= */}
      <div className="lg:col-span-8 xl:col-span-8 space-y-6">
        {/* ========================================================================= */}
        {/* EXCEL TEMPLATE WORKFLOW BAR: DOWNLOAD TEMPLATE & UPLOAD EXCEL BATCH       */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-emerald-50/70 via-slate-50 to-teal-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F4C3A] text-white flex items-center justify-center shadow-xs shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Address Print Excel Workflow
                  </h4>
                  <span className="text-[10px] font-bold bg-emerald-100 text-[#0F4C3A] px-2 py-0.5 rounded-full border border-emerald-200">
                    Batch Template & Upload
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Download the official template to enter TO & FROM address details in Excel, then upload to generate batches of thermal or A4 labels.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Option 1: Download Address Print Excel Template */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50/80 text-[#0F4C3A] border border-emerald-300 hover:border-emerald-500 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                title="Download formatted .xlsx Address Print template"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
                ) : (
                  <Download className="w-4 h-4 text-[#1E8262]" />
                )}
                <span>Download Address Print Excel Template</span>
              </button>

              {/* Option 2: Upload Address Print Excel */}
              <button
                type="button"
                onClick={() => excelFileInputRef.current?.click()}
                disabled={isParsingExcel}
                className="inline-flex items-center gap-2 bg-[#0F4C3A] hover:bg-[#155d47] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
                title="Upload completed Address Print Excel template"
              >
                {isParsingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                ) : (
                  <Upload className="w-4 h-4 text-emerald-300" />
                )}
                <span>Upload Address Print Excel</span>
              </button>

              <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Consignment & Tracking Number Manual Entry Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#0F4C3A]">
              <Truck className="w-4 h-4 text-[#1E8262]" />
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                Consignment & Tracking Number (Optional)
              </label>
            </div>
            {errors.trackingNumber && (
              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.trackingNumber}
              </span>
            )}
          </div>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => {
              setTrackingNumber(e.target.value.toUpperCase());
              if (errors.trackingNumber) {
                setErrors((prev) => ({ ...prev, trackingNumber: '' }));
              }
            }}
            placeholder="Enter Consignment / Tracking Number manually (Optional, e.g. GT2610138625)"
            className={`w-full text-sm font-mono font-black tracking-wider px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 ${
              errors.trackingNumber
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/20'
                : 'border-slate-200 focus:border-[#1E8262] focus:ring-emerald-500/20 bg-slate-50/40'
            }`}
          />
          <p className="text-[10px] text-slate-400 font-medium">
            Enter the consignment/tracking number manually (optional). If entered, this number will be encoded into the live scannable barcode and 2D QR code.
          </p>
        </div>

        {/* Quantity Mismatch Global Alert Banner */}
        {errors.quantityMismatch && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errors.quantityMismatch}</span>
          </div>
        )}

        {/* SECTION A: TO / CONSIGNEE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* Left: Heading with DELIVERY DESTINATION directly beneath in bluish color */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[#0F4C3A]">
                <MapPin className="w-4 h-4 text-[#1E8262]" />
                <h3 className="font-black text-sm uppercase tracking-wider">
                  TO
                </h3>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-blue-700 tracking-wider mt-0.5 ml-6">
                DELIVERY DESTINATION
              </span>
            </div>

            {/* Middle: Word-Style Text Formatting Toolbar for Section A */}
            <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/90 px-2 py-1 rounded-xl shadow-2xs self-start md:self-auto">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyCommand('section-a-address-editor', 'bold');
                }}
                className="w-7 h-7 flex items-center justify-center font-black text-xs font-serif rounded-lg hover:bg-white text-slate-800 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                title="Bold (B)"
              >
                B
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyCommand('section-a-address-editor', 'underline');
                }}
                className="w-7 h-7 flex items-center justify-center font-bold text-xs underline font-serif rounded-lg hover:bg-white text-slate-800 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                title="Underline (U)"
              >
                U
              </button>

              <div className="w-px h-4 bg-slate-300 mx-0.5" />

              {/* Font Size Dropdown (8pt to 70pt, scrolling after 20pt, no duplicate 'Size' in menu) */}
              <div className="relative flex items-center" ref={sizeMenuRefA}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection('section-a-address-editor');
                  }}
                  onClick={() => setShowSizeMenuA((prev) => !prev)}
                  className="h-7 text-[11px] font-bold font-mono px-2 py-0 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Font Size"
                >
                  <span>{selectedSizeA || 'Size'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showSizeMenuA && (
                  <div
                    className="absolute top-full left-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 w-[80px] max-h-[260px] overflow-y-auto"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {FONT_SIZE_OPTIONS.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          applyFontSize('section-a-address-editor', sz);
                          setSelectedSizeA(sz);
                          setShowSizeMenuA(false);
                        }}
                        className={`w-full text-left px-3 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                          selectedSizeA === sz ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-4 bg-slate-300 mx-0.5" />

              {/* Font Color Picker with Quick Standard Colors Palette */}
              <div className="relative flex items-center" ref={colorPaletteRefA}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => setShowColorPaletteA((prev) => !prev)}
                  className="w-7 h-7 flex flex-col items-center justify-center rounded-lg hover:bg-white text-slate-800 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                  title="Font Color (A)"
                  aria-label="Font Color"
                >
                  <span className="text-[11px] font-black leading-none font-serif text-slate-900">A</span>
                  <span
                    className="w-3.5 h-[2.5px] rounded-full mt-0.5 transition-colors"
                    style={{ backgroundColor: activeColorA }}
                  />
                </button>

                {showColorPaletteA && (
                  <div className="absolute top-full left-0 mt-1.5 z-40 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 w-[164px]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-0.5">
                      Standard Colors
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {STANDARD_FONT_COLORS.map((col) => (
                        <button
                          key={col.name}
                          type="button"
                          title={col.name}
                          aria-label={col.name}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyCommand('section-a-address-editor', 'foreColor', col.hex);
                            setActiveColorA(col.hex);
                            setShowColorPaletteA(false);
                          }}
                          className="w-6 h-6 rounded-full border border-slate-300 hover:scale-110 hover:shadow-md transition-all flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                    <div className="border-t border-slate-100 mt-2 pt-1.5 px-0.5">
                      <label
                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-emerald-700 cursor-pointer py-0.5 relative"
                        title="Custom Color"
                      >
                        <div className="w-4 h-4 rounded-full border border-slate-300 bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 to-indigo-500 shrink-0 shadow-2xs" />
                        <span>Custom...</span>
                        <input
                          type="color"
                          onChange={(e) => {
                            applyCommand('section-a-address-editor', 'foreColor', e.target.value);
                            setActiveColorA(e.target.value);
                            setShowColorPaletteA(false);
                          }}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Highlighter Dropdown (no duplicate 'Highlight' inside menu) */}
              <div className="relative flex items-center" ref={highlightMenuRefA}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection('section-a-address-editor');
                  }}
                  onClick={() => setShowHighlightMenuA((prev) => !prev)}
                  className="h-7 text-[10.5px] font-bold px-2 py-0 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Background Highlighter"
                >
                  <span>Highlight</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showHighlightMenuA && (
                  <div className="absolute top-full left-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-[140px] max-h-[300px] overflow-y-auto">
                    {HIGHLIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          applyHighlight('section-a-address-editor', opt.id);
                          setShowHighlightMenuA(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <span
                          className="w-4 h-4 rounded border border-slate-300 shrink-0"
                          style={{ backgroundColor: opt.bgColor }}
                        />
                        <span className="text-slate-800">{opt.label}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        applyHighlight('section-a-address-editor', 'clear');
                        setShowHighlightMenuA(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="w-4 h-4 rounded border border-slate-300 bg-white shrink-0 flex items-center justify-center text-[10px] text-slate-400">∅</span>
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Text Case Conversion Control beside Highlight option */}
              <div className="relative flex items-center" ref={caseMenuRefA}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection('section-a-address-editor');
                  }}
                  onClick={() => setShowCaseMenuA((prev) => !prev)}
                  className="h-7 text-[11px] font-bold px-2 py-0 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Change Case (Normal, UPPERCASE, lowercase)"
                >
                  <span className="font-serif font-black">{caseModeA === 'uppercase' ? 'AA' : caseModeA === 'lowercase' ? 'aa' : 'Aa'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showCaseMenuA && (
                  <div className="absolute top-full left-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-[165px]">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        applyTextCase('A', 'normal');
                        setShowCaseMenuA(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer ${
                        caseModeA === 'normal' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-800'
                      }`}
                    >
                      <span className="font-serif font-bold text-xs w-5">Aa</span>
                      <span>Aa – Normal Case</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        applyTextCase('A', 'upper');
                        setShowCaseMenuA(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer ${
                        caseModeA === 'uppercase' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-800'
                      }`}
                    >
                      <span className="font-serif font-black text-xs w-5">AA</span>
                      <span>AA – UPPERCASE</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        applyTextCase('A', 'lower');
                        setShowCaseMenuA(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer ${
                        caseModeA === 'lowercase' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-800'
                      }`}
                    >
                      <span className="font-serif font-normal text-xs w-5">aa</span>
                      <span>aa – lowercase</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Multiple Print quantity input */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-colors shadow-2xs self-start md:self-auto ${
                errors.quantityMismatch || errors.toQuantity
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <label className="text-[11px] font-bold whitespace-nowrap">
                Multiple Print:
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={toQuantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setToQuantity(isNaN(val) ? 1 : val);
                  if (errors.toQuantity || errors.quantityMismatch) {
                    setErrors((prev) => ({
                      ...prev,
                      toQuantity: '',
                      quantityMismatch: '',
                    }));
                  }
                }}
                className="w-[53px] text-center font-black font-mono text-xs px-1.5 py-0.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#1E8262]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {/* 1. Recipient / Company Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Recipient / Company Name *
              </label>
              <input
                type="text"
                value={toName}
                onChange={(e) => {
                  const val = e.target.value;
                  toOriginalTextRef.current.name = val;
                  if (caseModeA === 'uppercase') setToName(val.toUpperCase());
                  else if (caseModeA === 'lowercase') setToName(val.toLowerCase());
                  else setToName(val);
                  if (errors.toName) setErrors((prev) => ({ ...prev, toName: '' }));
                }}
                className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none focus:border-[#1E8262] focus:ring-2 ${
                  errors.toName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:ring-emerald-500/20'
                }`}
                placeholder="e.g. Ramesh Enterprises / Priya Sharma"
              />
              <FieldFormattingBar
                formatting={toFormatting.companyName}
                onChange={(f) => updateToFieldFormatting('companyName', f)}
              />
              {errors.toName && (
                <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.toName}
                </p>
              )}
            </div>

            {/* 2. Contact Person Name (Optional) + Mobile Number * Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 items-start">
              {/* Contact Person Name (Left Side) */}
              <div>
                <div className="flex items-center gap-3 mb-1 min-h-[20px] flex-wrap">
                  <label className="text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap">
                    Contact Person Name (Optional)
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={toIncludeContactPerson}
                      onChange={(e) => setToIncludeContactPerson(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#1E8262] focus:ring-[#1E8262] border-slate-300 accent-[#1E8262] cursor-pointer"
                    />
                    <span className="text-[10.5px] font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap">
                      Include on Thermal Label
                    </span>
                  </label>
                </div>
                <input
                  type="text"
                  value={toContactPerson}
                  onChange={(e) => {
                    const val = e.target.value;
                    toOriginalTextRef.current.contactPerson = val;
                    if (caseModeA === 'uppercase') setToContactPerson(val.toUpperCase());
                    else if (caseModeA === 'lowercase') setToContactPerson(val.toLowerCase());
                    else setToContactPerson(val);
                  }}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] h-[40px] shadow-xs"
                  placeholder="e.g. Mr. Rajesh Kumar / Receiving Staff"
                />
                <FieldFormattingBar
                  formatting={toFormatting.contactPerson}
                  onChange={(f) => updateToFieldFormatting('contactPerson', f)}
                />
              </div>

              {/* Mobile Number (Right Side) */}
              <div>
                <div className="flex items-center justify-between mb-1 min-h-[20px]">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap">
                    Mobile Number *
                  </label>
                  {toCountry.code === 'IN' ? (
                    toMobileError ? (
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        Accepts only 10 digits
                      </span>
                    ) : toMobileDigits.length === 10 ? (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        10 Digits Validated
                      </span>
                    ) : toMobileDigits.length > 0 ? (
                      <span className="text-[10px] font-semibold text-amber-600">
                        {10 - toMobileDigits.length} digits needed
                      </span>
                    ) : (
                      <span className="text-[10px] text-helper-blue font-medium">10 digits required</span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {toCountry.name} ({toCountry.dialCode})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Standalone Country Code Selector Button */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsToCountryOpen((prev) => !prev)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-colors focus:outline-none focus:border-[#1E8262] h-[40px] shadow-xs cursor-pointer min-w-[95px] justify-between"
                      title="Select Country Calling Code"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 text-xs">{toCountry.code}</span>
                        <span className="font-mono font-black text-slate-900 text-xs">{toCountry.dialCode}</span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>

                    {/* Searchable Dropdown Popover */}
                    {isToCountryOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => {
                            setIsToCountryOpen(false);
                            setToCountrySearch('');
                          }}
                        />
                        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                            <div className="relative flex items-center">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                              <input
                                type="text"
                                value={toCountrySearch}
                                onChange={(e) => setToCountrySearch(e.target.value)}
                                placeholder="Search country or code..."
                                autoFocus
                                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#1E8262]"
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                            {filteredToCountries.length > 0 ? (
                              filteredToCountries.map((c) => {
                                const isSelected = c.code === toCountry.code;
                                return (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => {
                                      setToCountry(c);
                                      setIsToCountryOpen(false);
                                      setToCountrySearch('');
                                    }}
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
                    value={toMobileDigits}
                    onChange={handleToMobileDigitsChange}
                    onKeyDown={(e) => handleMobileKeyDown(e, toCountry, toMobileDigits, toMobileError, setToMobileError)}
                    maxLength={toCountry.code === 'IN' ? 10 : (toCountry.maxLength || 15)}
                    className={`flex-1 w-full text-xs font-mono font-bold px-3.5 py-2.5 border rounded-xl focus:outline-none h-[40px] shadow-xs ${
                      toMobileError || errors.toMobile
                        ? 'border-red-400 focus:border-red-500 text-red-900 bg-red-50/20'
                        : 'border-slate-200 focus:border-[#1E8262]'
                    }`}
                    placeholder={toCountry.placeholder || 'Enter mobile number'}
                  />
                </div>
                <FieldFormattingBar
                  formatting={toFormatting.mobile}
                  onChange={(f) => updateToFieldFormatting('mobile', f)}
                />

                {toCountry.code === 'IN' && toMobileError && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Accepts only 10 digits
                  </p>
                )}
                {!toMobileError && errors.toMobile && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.toMobile}
                  </p>
                )}
              </div>
            </div>

            {/* 3. Address Line 1 * (with Word-Style Rich-Text Formatting capability) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Address Line 1 *
                </label>
                {errors.toAddress && (
                  <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.toAddress}
                  </span>
                )}
              </div>
              <div
                id="section-a-address-editor"
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Shop No. 12, Industrial Area Phase 2, Near Landmark / Gate"
                onInput={() => syncEditorContent('section-a-address-editor')}
                onKeyUp={() => saveSelection('section-a-address-editor')}
                onMouseUp={() => saveSelection('section-a-address-editor')}
                onSelect={() => saveSelection('section-a-address-editor')}
                className={`w-full min-h-[42px] max-h-[140px] overflow-y-auto text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 bg-white leading-relaxed shadow-xs empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:font-normal empty:before:pointer-events-none ${
                  errors.toAddress
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:border-[#1E8262] focus:ring-emerald-500/20'
                }`}
                style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
              />
              <FieldFormattingBar
                formatting={toFormatting.address1}
                onChange={(f) => updateToFieldFormatting('address1', f)}
              />
            </div>

            {/* 4. Pincode | City | State (3-column grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Pincode *
                  </label>
                  {toPincodeLoading ? (
                    <span className="text-[10px] text-helper-blue flex items-center gap-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin text-[#1E8262]" />
                      Looking up...
                    </span>
                  ) : toPincodeSuccess ? (
                    <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Auto-filled
                    </span>
                  ) : toPincodeError ? (
                    <span className="text-[10px] text-red-600 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      {toPincodeError}
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={toPincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setToPincode(val);
                      if (errors.toPincode) setErrors((prev) => ({ ...prev, toPincode: '' }));
                      if (val.length === 6) {
                        lookupToPincode(val);
                      } else {
                        setToPincodeError('');
                        setToPincodeSuccess(false);
                      }
                    }}
                    maxLength={6}
                    className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none ${
                      toPincodeError || errors.toPincode
                        ? 'border-red-300 focus:border-red-500 text-red-900 bg-red-50/10'
                        : toPincodeSuccess
                        ? 'border-emerald-300 focus:border-[#1E8262]'
                        : 'border-slate-200 focus:border-[#1E8262]'
                    }`}
                    placeholder="e.g. 560086"
                  />
                  {toPincodeLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
                    </div>
                  )}
                </div>
                <FieldFormattingBar
                  formatting={toFormatting.pincode}
                  onChange={(f) => updateToFieldFormatting('pincode', f)}
                />
                {toPincodeError && (
                  <p className="text-[10.5px] font-semibold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {toPincodeError}
                  </p>
                )}
                {!toPincodeError && errors.toPincode && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.toPincode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={toCity}
                  onChange={(e) => {
                    const val = e.target.value;
                    toOriginalTextRef.current.city = val;
                    if (caseModeA === 'uppercase') setToCity(val.toUpperCase());
                    else if (caseModeA === 'lowercase') setToCity(val.toLowerCase());
                    else setToCity(val);
                    if (errors.toCity) setErrors((prev) => ({ ...prev, toCity: '' }));
                  }}
                  className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none ${
                    errors.toCity
                      ? 'border-red-300 focus:border-red-500 text-red-900 bg-red-50/20'
                      : 'border-slate-200 focus:border-[#1E8262]'
                  }`}
                  placeholder="Mumbai"
                />
                <FieldFormattingBar
                  formatting={toFormatting.city}
                  onChange={(f) => updateToFieldFormatting('city', f)}
                />
                {errors.toCity && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.toCity}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  State *
                </label>
                <input
                  type="text"
                  value={toState}
                  onChange={(e) => {
                    const val = e.target.value;
                    toOriginalTextRef.current.state = val;
                    if (caseModeA === 'uppercase') setToState(val.toUpperCase());
                    else if (caseModeA === 'lowercase') setToState(val.toLowerCase());
                    else setToState(val);
                    if (errors.toState) setErrors((prev) => ({ ...prev, toState: '' }));
                  }}
                  className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none ${
                    errors.toState
                      ? 'border-red-300 focus:border-red-500 text-red-900 bg-red-50/20'
                      : 'border-slate-200 focus:border-[#1E8262]'
                  }`}
                  placeholder="Maharashtra"
                />
                <FieldFormattingBar
                  formatting={toFormatting.state}
                  onChange={(f) => updateToFieldFormatting('state', f)}
                />
                {errors.toState && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.toState}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION B: FROM / CONSIGNOR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* Left: Heading with SENDER / ORIGIN directly beneath in bluish color */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[#0F4C3A]">
                <Building2 className="w-4 h-4 text-[#1E8262]" />
                <h3 className="font-black text-sm uppercase tracking-wider">
                  FROM
                </h3>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-blue-700 tracking-wider mt-0.5 ml-6">
                SENDER / ORIGIN
              </span>
            </div>

            {/* Middle: Word-Style Text Formatting Toolbar for Section B */}
            <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/90 px-2 py-1 rounded-xl shadow-2xs self-start md:self-auto">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyCommand('section-b-address-editor', 'bold');
                }}
                className="w-7 h-7 flex items-center justify-center font-black text-xs font-serif rounded-lg hover:bg-white text-slate-800 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                title="Bold (B)"
              >
                B
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyCommand('section-b-address-editor', 'underline');
                }}
                className="w-7 h-7 flex items-center justify-center font-bold text-xs underline font-serif rounded-lg hover:bg-white text-slate-800 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                title="Underline (U)"
              >
                U
              </button>

              <div className="w-px h-4 bg-slate-300 mx-0.5" />

              {/* Font Size Dropdown (8pt to 70pt, scrolling after 20pt, no duplicate 'Size' in menu) */}
              <div className="relative flex items-center" ref={sizeMenuRefB}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection('section-b-address-editor');
                  }}
                  onClick={() => setShowSizeMenuB((prev) => !prev)}
                  className="h-7 text-[11px] font-bold font-mono px-2 py-0 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Font Size"
                >
                  <span>{selectedSizeB || 'Size'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showSizeMenuB && (
                  <div
                    className="absolute top-full left-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 w-[80px] max-h-[260px] overflow-y-auto"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {FONT_SIZE_OPTIONS.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          applyFontSize('section-b-address-editor', sz);
                          setSelectedSizeB(sz);
                          setShowSizeMenuB(false);
                        }}
                        className={`w-full text-left px-3 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                          selectedSizeB === sz ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-4 bg-slate-300 mx-0.5" />

              {/* Font Color Picker with Quick Standard Colors Palette */}
              <div className="relative flex items-center" ref={colorPaletteRefB}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => setShowColorPaletteB((prev) => !prev)}
                  className="w-7 h-7 flex flex-col items-center justify-center rounded-lg hover:bg-white text-slate-800 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                  title="Font Color (A)"
                  aria-label="Font Color"
                >
                  <span className="text-[11px] font-black leading-none font-serif text-slate-900">A</span>
                  <span
                    className="w-3.5 h-[2.5px] rounded-full mt-0.5 transition-colors"
                    style={{ backgroundColor: activeColorB }}
                  />
                </button>

                {showColorPaletteB && (
                  <div className="absolute top-full left-0 mt-1.5 z-40 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 w-[164px]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-0.5">
                      Standard Colors
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {STANDARD_FONT_COLORS.map((col) => (
                        <button
                          key={col.name}
                          type="button"
                          title={col.name}
                          aria-label={col.name}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyCommand('section-b-address-editor', 'foreColor', col.hex);
                            setActiveColorB(col.hex);
                            setShowColorPaletteB(false);
                          }}
                          className="w-6 h-6 rounded-full border border-slate-300 hover:scale-110 hover:shadow-md transition-all flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                    <div className="border-t border-slate-100 mt-2 pt-1.5 px-0.5">
                      <label
                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-emerald-700 cursor-pointer py-0.5 relative"
                        title="Custom Color"
                      >
                        <div className="w-4 h-4 rounded-full border border-slate-300 bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 to-indigo-500 shrink-0 shadow-2xs" />
                        <span>Custom...</span>
                        <input
                          type="color"
                          onChange={(e) => {
                            applyCommand('section-b-address-editor', 'foreColor', e.target.value);
                            setActiveColorB(e.target.value);
                            setShowColorPaletteB(false);
                          }}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Highlighter Dropdown (no duplicate 'Highlight' inside menu) */}
              <div className="relative flex items-center" ref={highlightMenuRefB}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection('section-b-address-editor');
                  }}
                  onClick={() => setShowHighlightMenuB((prev) => !prev)}
                  className="h-7 text-[10.5px] font-bold px-2 py-0 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Background Highlighter"
                >
                  <span>Highlight</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showHighlightMenuB && (
                  <div className="absolute top-full left-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-[140px] max-h-[300px] overflow-y-auto">
                    {HIGHLIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          applyHighlight('section-b-address-editor', opt.id);
                          setShowHighlightMenuB(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <span
                          className="w-4 h-4 rounded border border-slate-300 shrink-0"
                          style={{ backgroundColor: opt.bgColor }}
                        />
                        <span className="text-slate-800">{opt.label}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        applyHighlight('section-b-address-editor', 'clear');
                        setShowHighlightMenuB(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span className="w-4 h-4 rounded border border-slate-300 bg-white shrink-0 flex items-center justify-center text-[10px] text-slate-400">∅</span>
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Text Case Conversion Control beside Highlight option */}
              <div className="relative flex items-center" ref={caseMenuRefB}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection('section-b-address-editor');
                  }}
                  onClick={() => setShowCaseMenuB((prev) => !prev)}
                  className="h-7 text-[11px] font-bold px-2 py-0 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Change Case (Normal, UPPERCASE, lowercase)"
                >
                  <span className="font-serif font-black">{caseModeB === 'uppercase' ? 'AA' : caseModeB === 'lowercase' ? 'aa' : 'Aa'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showCaseMenuB && (
                  <div className="absolute top-full left-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-[165px]">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        applyTextCase('B', 'normal');
                        setShowCaseMenuB(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer ${
                        caseModeB === 'normal' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-800'
                      }`}
                    >
                      <span className="font-serif font-bold text-xs w-5">Aa</span>
                      <span>Aa – Normal Case</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        applyTextCase('B', 'upper');
                        setShowCaseMenuB(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer ${
                        caseModeB === 'uppercase' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-800'
                      }`}
                    >
                      <span className="font-serif font-black text-xs w-5">AA</span>
                      <span>AA – UPPERCASE</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        applyTextCase('B', 'lower');
                        setShowCaseMenuB(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-slate-100 transition-colors cursor-pointer ${
                        caseModeB === 'lowercase' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-800'
                      }`}
                    >
                      <span className="font-serif font-normal text-xs w-5">aa</span>
                      <span>aa – lowercase</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Multiple Print quantity input */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-colors shadow-2xs self-start md:self-auto ${
                errors.quantityMismatch || errors.fromQuantity
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <label className="text-[11px] font-bold whitespace-nowrap">
                Multiple Print:
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={fromQuantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setFromQuantity(isNaN(val) ? 1 : val);
                  if (errors.fromQuantity || errors.quantityMismatch) {
                    setErrors((prev) => ({
                      ...prev,
                      fromQuantity: '',
                      quantityMismatch: '',
                    }));
                  }
                }}
                className="w-[53px] text-center font-black font-mono text-xs px-1.5 py-0.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#1E8262]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {/* 1. Sender / Company Name * */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Sender / Company Name *
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => {
                  const val = e.target.value;
                  fromOriginalTextRef.current.name = val;
                  if (caseModeB === 'uppercase') setFromName(val.toUpperCase());
                  else if (caseModeB === 'lowercase') setFromName(val.toLowerCase());
                  else setFromName(val);
                  if (errors.fromName) setErrors((prev) => ({ ...prev, fromName: '' }));
                }}
                className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none focus:border-[#1E8262] focus:ring-2 ${
                  errors.fromName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:ring-emerald-500/20'
                }`}
                placeholder="e.g. Geo Transit Warehouse / Apex Industries"
              />
              <FieldFormattingBar
                formatting={fromFormatting.companyName}
                onChange={(f) => updateFromFieldFormatting('companyName', f)}
              />
              {errors.fromName && (
                <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.fromName}
                </p>
              )}
            </div>

            {/* 2. Contact Person Name (Optional) + Mobile Number * Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 items-start">
              {/* Contact Person Name (Left Side) */}
              <div>
                <div className="flex items-center gap-3 mb-1 min-h-[20px] flex-wrap">
                  <label className="text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap">
                    Contact Person Name (Optional)
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fromIncludeContactPerson}
                      onChange={(e) => setFromIncludeContactPerson(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#1E8262] focus:ring-[#1E8262] border-slate-300 accent-[#1E8262] cursor-pointer"
                    />
                    <span className="text-[10.5px] font-semibold text-slate-600 hover:text-slate-900 whitespace-nowrap">
                      Include on Thermal Label
                    </span>
                  </label>
                </div>
                <input
                  type="text"
                  value={fromContactPerson}
                  onChange={(e) => {
                    const val = e.target.value;
                    fromOriginalTextRef.current.contactPerson = val;
                    if (caseModeB === 'uppercase') setFromContactPerson(val.toUpperCase());
                    else if (caseModeB === 'lowercase') setFromContactPerson(val.toLowerCase());
                    else setFromContactPerson(val);
                  }}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] h-[40px] shadow-xs"
                  placeholder="e.g. Mr. Rajesh Kumar / Dispatch Staff"
                />
                <FieldFormattingBar
                  formatting={fromFormatting.contactPerson}
                  onChange={(f) => updateFromFieldFormatting('contactPerson', f)}
                />
              </div>

              {/* Mobile Number (Right Side) */}
              <div>
                <div className="flex items-center justify-between mb-1 min-h-[20px]">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase whitespace-nowrap">
                    Mobile Number *
                  </label>
                  {fromCountry.code === 'IN' ? (
                    fromMobileError ? (
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        Accepts only 10 digits
                      </span>
                    ) : fromMobileDigits.length === 10 ? (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        10 Digits Validated
                      </span>
                    ) : fromMobileDigits.length > 0 ? (
                      <span className="text-[10px] font-semibold text-amber-600">
                        {10 - fromMobileDigits.length} digits needed
                      </span>
                    ) : (
                      <span className="text-[10px] text-helper-blue font-medium">10 digits required</span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {fromCountry.name} ({fromCountry.dialCode})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Standalone Country Code Selector Button */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFromCountryOpen((prev) => !prev)}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-colors focus:outline-none focus:border-[#1E8262] h-[40px] shadow-xs cursor-pointer min-w-[95px] justify-between"
                      title="Select Country Calling Code"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700 text-xs">{fromCountry.code}</span>
                        <span className="font-mono font-black text-slate-900 text-xs">{fromCountry.dialCode}</span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>

                    {/* Searchable Dropdown Popover */}
                    {isFromCountryOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => {
                            setIsFromCountryOpen(false);
                            setFromCountrySearch('');
                          }}
                        />
                        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                            <div className="relative flex items-center">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                              <input
                                type="text"
                                value={fromCountrySearch}
                                onChange={(e) => setFromCountrySearch(e.target.value)}
                                placeholder="Search country or code..."
                                autoFocus
                                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#1E8262]"
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                            {filteredFromCountries.length > 0 ? (
                              filteredFromCountries.map((c) => {
                                const isSelected = c.code === fromCountry.code;
                                return (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => {
                                      setFromCountry(c);
                                      setIsFromCountryOpen(false);
                                      setFromCountrySearch('');
                                    }}
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
                    value={fromMobileDigits}
                    onChange={handleFromMobileDigitsChange}
                    onKeyDown={(e) => handleMobileKeyDown(e, fromCountry, fromMobileDigits, fromMobileError, setFromMobileError)}
                    maxLength={fromCountry.code === 'IN' ? 10 : (fromCountry.maxLength || 15)}
                    className={`flex-1 w-full text-xs font-mono font-bold px-3.5 py-2.5 border rounded-xl focus:outline-none h-[40px] shadow-xs ${
                      fromMobileError || errors.fromMobile
                        ? 'border-red-400 focus:border-red-500 text-red-900 bg-red-50/20'
                        : 'border-slate-200 focus:border-[#1E8262]'
                    }`}
                    placeholder={fromCountry.placeholder || 'Enter mobile number'}
                  />
                </div>
                <FieldFormattingBar
                  formatting={fromFormatting.mobile}
                  onChange={(f) => updateFromFieldFormatting('mobile', f)}
                />

                {fromCountry.code === 'IN' && fromMobileError && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Accepts only 10 digits
                  </p>
                )}
                {!fromMobileError && errors.fromMobile && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.fromMobile}
                  </p>
                )}
              </div>
            </div>

            {/* 3. Address Line 1 * (with Word-Style Rich-Text Formatting capability) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Address Line 1 *
                </label>
                {errors.fromAddress && (
                  <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.fromAddress}
                  </span>
                )}
              </div>
              <div
                id="section-b-address-editor"
                contentEditable
                suppressContentEditableWarning
                data-placeholder="e.g. Unit 4B, Central Logistics Park, National Highway 8, Sector 18"
                onInput={() => syncEditorContent('section-b-address-editor')}
                onKeyUp={() => saveSelection('section-b-address-editor')}
                onMouseUp={() => saveSelection('section-b-address-editor')}
                onSelect={() => saveSelection('section-b-address-editor')}
                className={`w-full min-h-[42px] max-h-[140px] overflow-y-auto text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 bg-white leading-relaxed shadow-xs empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:font-normal empty:before:pointer-events-none ${
                  errors.fromAddress
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:border-[#1E8262] focus:ring-emerald-500/20'
                }`}
                style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
              />
              <FieldFormattingBar
                formatting={fromFormatting.address1}
                onChange={(f) => updateFromFieldFormatting('address1', f)}
              />
            </div>

            {/* 4. Pincode | City | State (3-column grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Pincode *
                  </label>
                  {fromPincodeLoading ? (
                    <span className="text-[10px] text-helper-blue flex items-center gap-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin text-[#1E8262]" />
                      Looking up...
                    </span>
                  ) : fromPincodeSuccess ? (
                    <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Auto-filled
                    </span>
                  ) : fromPincodeError ? (
                    <span className="text-[10px] text-red-600 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      {fromPincodeError}
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={fromPincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFromPincode(val);
                      if (errors.fromPincode) setErrors((prev) => ({ ...prev, fromPincode: '' }));
                      if (val.length === 6) {
                        lookupFromPincode(val);
                      } else {
                        setFromPincodeError('');
                        setFromPincodeSuccess(false);
                      }
                    }}
                    maxLength={6}
                    className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none ${
                      fromPincodeError || errors.fromPincode
                        ? 'border-red-300 focus:border-red-500 text-red-900 bg-red-50/10'
                        : fromPincodeSuccess
                        ? 'border-emerald-300 focus:border-[#1E8262]'
                        : 'border-slate-200 focus:border-[#1E8262]'
                    }`}
                    placeholder="e.g. 110001"
                  />
                  {fromPincodeLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
                    </div>
                  )}
                </div>
                <FieldFormattingBar
                  formatting={fromFormatting.pincode}
                  onChange={(f) => updateFromFieldFormatting('pincode', f)}
                />
                {fromPincodeError && (
                  <p className="text-[10.5px] font-semibold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fromPincodeError}
                  </p>
                )}
                {!fromPincodeError && errors.fromPincode && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.fromPincode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={fromCity}
                  onChange={(e) => {
                    const val = e.target.value;
                    fromOriginalTextRef.current.city = val;
                    if (caseModeB === 'uppercase') setFromCity(val.toUpperCase());
                    else if (caseModeB === 'lowercase') setFromCity(val.toLowerCase());
                    else setFromCity(val);
                    if (errors.fromCity) setErrors((prev) => ({ ...prev, fromCity: '' }));
                  }}
                  className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none ${
                    errors.fromCity
                      ? 'border-red-300 focus:border-red-500 text-red-900 bg-red-50/20'
                      : 'border-slate-200 focus:border-[#1E8262]'
                  }`}
                  placeholder="Gurugram"
                />
                <FieldFormattingBar
                  formatting={fromFormatting.city}
                  onChange={(f) => updateFromFieldFormatting('city', f)}
                />
                {errors.fromCity && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.fromCity}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  State *
                </label>
                <input
                  type="text"
                  value={fromState}
                  onChange={(e) => {
                    const val = e.target.value;
                    fromOriginalTextRef.current.state = val;
                    if (caseModeB === 'uppercase') setFromState(val.toUpperCase());
                    else if (caseModeB === 'lowercase') setFromState(val.toLowerCase());
                    else setFromState(val);
                    if (errors.fromState) setErrors((prev) => ({ ...prev, fromState: '' }));
                  }}
                  className={`w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl focus:outline-none ${
                    errors.fromState
                      ? 'border-red-300 focus:border-red-500 text-red-900 bg-red-50/20'
                      : 'border-slate-200 focus:border-[#1E8262]'
                  }`}
                  placeholder="Haryana"
                />
                <FieldFormattingBar
                  formatting={fromFormatting.state}
                  onChange={(f) => updateFromFieldFormatting('state', f)}
                />
                {errors.fromState && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.fromState}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: THERMAL PREVIEW & PRIMARY ACTIONS (XL:COL-SPAN-4) */}
      {/* ========================================================================= */}
      <div className="lg:col-span-4 xl:col-span-4 sticky top-6 space-y-4">
        {/* Top Header Card with Shipper and Print Size dropdowns */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                {selectedPrintSize.id === 'a4' ? 'A4 PREVIEW' : 'THERMAL PREVIEW'}
              </span>
              <h3 className="font-black text-sm text-white">Live Address Label Preview</h3>
            </div>

            <div className="flex items-end gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              {/* Shipper Dropdown with Custom Shipper & + Add New Shipper Option */}
              <div className="flex flex-col items-start gap-1">
                <label className="text-xs font-semibold text-white tracking-tight">
                  Select Shipper
                </label>
                <div className="relative inline-flex items-center">
                  <select
                    value={activeShipperName}
                    onChange={(e) => handleShipperSelect(e.target.value)}
                    className="appearance-none bg-white text-slate-900 text-xs font-bold pl-2.5 pr-7 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs min-w-[125px] max-w-[155px] truncate"
                  >
                    <optgroup label="Standard Carriers">
                      {courierOptions.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>

                    {customShippers.length > 0 && (
                      <optgroup label="Custom Shippers">
                        {customShippers.map((cs) => (
                          <option key={cs.id} value={cs.name}>
                            ★ {cs.name}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <option
                      value="__ADD_NEW_SHIPPER__"
                      className="font-black text-[#0F4C3A] bg-emerald-50"
                    >
                      + Add New Shipper
                    </option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Print Size Dropdown (Preserves 4x6, 4x4, etc.) */}
              <div className="flex flex-col items-start gap-1">
                <label className="text-xs font-semibold text-white tracking-tight">
                  Select Print Size
                </label>
                <div className="relative inline-flex items-center shrink-0">
                  <select
                    value={selectedPrintSize.id}
                    onChange={(e) => {
                      const chosen = PRINT_SIZE_OPTIONS.find((opt) => opt.id === e.target.value);
                      if (chosen) onPrintSizeChange(chosen);
                    }}
                    className="appearance-none bg-white text-slate-900 font-bold text-xs pl-2.5 pr-7 py-2 rounded-xl border-2 border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs min-w-[80px]"
                  >
                    {PRINT_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Thermal / A4 Label Container with Universal Zoom Stage */}
        <LabelPreviewStage
          zoom={previewZoom}
          onZoomChange={setPreviewZoom}
          targetWidthPx={Math.round(selectedPrintSize.widthInches * 96)}
          targetHeightPx={Math.round(selectedPrintSize.heightInches * 96)}
          title="LIVE ADDRESS LABEL PREVIEW"
          badge={
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
              {selectedPrintSize.label}
            </span>
          }
          headerExtra={
            finalQuantity > 1 ? (
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded-full">
                Label 1 of {finalQuantity} ({finalQuantity} copies)
              </span>
            ) : undefined
          }
        >
          <AddressPrintLabelCard
            template={{
              ...template,
              widthInches: selectedPrintSize.widthInches,
              heightInches: selectedPrintSize.heightInches,
            }}
            data={previewData}
            scale={1}
            id="address-label-live-preview"
            onBarcodeGenerated={(url) => setLiveBarcodeUrl(url)}
          />
        </LabelPreviewStage>

        {/* Primary Action Buttons */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#0F4C3A] hover:bg-[#155d47] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'Saving Record...' : `Save & Record Label${finalQuantity > 1 ? ` (${finalQuantity} Copies)` : ''}`}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Download PDF{finalQuantity > 1 ? ` (${finalQuantity})` : ''}
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
              Download Excel{finalQuantity > 1 ? ` (${finalQuantity})` : ''}
            </button>

            <button
              type="button"
              onClick={handleDownloadWord}
              className="inline-flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-200"
              title="Download shipping label in Microsoft Word (.docx) format"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Download Word{finalQuantity > 1 ? ` (${finalQuantity})` : ''}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Print Label{finalQuantity > 1 ? ` (${finalQuantity})` : ''}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              Reset Form
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full text-slate-500 hover:text-slate-800 text-[11px] font-bold text-center pt-1 block cursor-pointer"
          >
            + Clear / Start Fresh Address Label
          </button>
        </div>
      </div>

      {/* HIDDEN CONTAINER FOR MULTIPLE LABEL PRINT COPIES */}
      <div
        id="address-labels-multi-print-pool"
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
        aria-hidden="true"
      >
        {Array.from({ length: finalQuantity }).map((_, idx) => (
          <div key={idx} id={`address-label-print-copy-${idx}`}>
            <AddressPrintLabelCard
              template={{
                ...template,
                widthInches: selectedPrintSize.widthInches,
                heightInches: selectedPrintSize.heightInches,
              }}
              data={{
                ...previewData,
                package_count:
                  finalQuantity > 1
                    ? `${String(idx + 1).padStart(2, '0')} / ${String(finalQuantity).padStart(2, '0')}`
                    : '01 / 01',
              }}
              id={`address-label-copy-canvas-${idx}`}
            />
          </div>
        ))}
      </div>

      {/* HIDDEN CONTAINER FOR BATCH LABEL PRINT COPIES */}
      {batchSummary && (
        <div
          id="address-labels-batch-print-pool"
          style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
          aria-hidden="true"
        >
          {batchSummary.rows
            .filter((r) => r.isValid)
            .map((row) =>
              Array.from({ length: row.multiple_print }).map((_, cIdx) => (
                <div
                  key={`batch-${row.rowNumber}-copy-${cIdx}`}
                  id={`address-batch-label-${row.rowNumber}-copy-${cIdx}`}
                >
                  <AddressPrintLabelCard
                    template={{
                      ...template,
                      widthInches: selectedPrintSize.widthInches,
                      heightInches: selectedPrintSize.heightInches,
                    }}
                    data={{
                      to_name: row.to_name,
                      to_contact_person: row.to_contact_person,
                      to_include_contact_person: row.to_include_contact_person,
                      to_mobile: row.to_mobile_full,
                      to_address: row.to_address_line_1,
                      to_address_line_1: row.to_address_line_1,
                      to_city: row.to_city,
                      to_state: row.to_state,
                      to_pincode: row.to_pincode,
                      to_formatting: toFormatting,
                      from_name: row.from_name,
                      from_contact_person: row.from_contact_person,
                      from_include_contact_person: row.from_include_contact_person,
                      from_mobile: row.from_mobile_full,
                      from_address: row.from_address_line_1,
                      from_address_line_1: row.from_address_line_1,
                      from_city: row.from_city,
                      from_state: row.from_state,
                      from_pincode: row.from_pincode,
                      from_formatting: fromFormatting,
                      tracking_number: row.tracking_number,
                      courier_company: row.courier_company || activeShipperName,
                      courier_logo: activeShipperLogo,
                      package_count:
                        row.multiple_print > 1
                          ? `${String(cIdx + 1).padStart(2, '0')} / ${String(row.multiple_print).padStart(2, '0')}`
                          : '01 / 01',
                    }}
                    id={`address-batch-label-canvas-${row.rowNumber}-${cIdx}`}
                  />
                </div>
              ))
            )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADDRESS PRINT EXCEL BATCH PROCESSING & PREVIEW WORKSPACE           */}
      {/* ========================================================================= */}
      {isBatchModalOpen && batchSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0F4C3A] text-white flex items-center justify-center shadow-xs shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      Address Print Excel Batch Processing
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-[#0F4C3A] px-2 py-0.5 rounded-full border border-emerald-200">
                      {batchSummary.validRecords} / {batchSummary.totalRecords} Valid
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    File: <span className="font-bold text-slate-800">{batchSummary.fileName}</span> • Shipper: <span className="font-bold text-slate-800">{activeShipperName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => reuploadFileInputRef.current?.click()}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#0F4C3A] bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  title="Upload a revised file"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Re-upload Excel</span>
                </button>
                <input
                  ref={reuploadFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Missing Required Columns Warning */}
            {batchSummary.missingRequiredColumns.length > 0 && (
              <div className="p-3 bg-red-50 border-b border-red-200 text-red-800 text-xs font-bold flex items-center gap-2 shrink-0 px-5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Missing Required Column Headings: {batchSummary.missingRequiredColumns.join(', ')}. Please use "Download Address Print Excel Template" to match column headers.
                </span>
              </div>
            )}

            {/* Summary Metrics Bar */}
            <div className="p-4 bg-white border-b border-slate-100 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Records
                </span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {batchSummary.totalRecords}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid Records
                </span>
                <span className="text-xl font-black text-emerald-900 font-mono">
                  {batchSummary.validRecords}
                </span>
              </div>

              <div className={`p-3 rounded-2xl border ${batchSummary.invalidRecords > 0 ? 'bg-red-50/70 border-red-200' : 'bg-slate-50 border-slate-200/80'}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1 ${batchSummary.invalidRecords > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                  <AlertCircle className="w-3 h-3" /> Records with Errors
                </span>
                <span className={`text-xl font-black font-mono ${batchSummary.invalidRecords > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                  {batchSummary.invalidRecords}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block flex items-center gap-1">
                  <Printer className="w-3 h-3 text-blue-600" /> Total Labels to Print
                </span>
                <span className="text-xl font-black text-blue-900 font-mono">
                  {batchSummary.totalLabelsCount}
                </span>
              </div>
            </div>

            {/* Controls Bar: Filter pills + Print Size Selector */}
            <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setBatchFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    batchFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All ({batchSummary.totalRecords})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchFilter('valid')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    batchFilter === 'valid'
                      ? 'bg-[#0F4C3A] text-white shadow-2xs'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-slate-200'
                  }`}
                >
                  Valid Only ({batchSummary.validRecords})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchFilter('errors')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    batchFilter === 'errors'
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'bg-white text-red-700 hover:bg-red-50 border border-slate-200'
                  }`}
                >
                  Errors Only ({batchSummary.invalidRecords})
                </button>
              </div>

              {/* Print Size Selection for the Batch */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Print Size:
                </span>
                <div className="flex items-center gap-1">
                  {PRINT_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onPrintSizeChange(opt)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        selectedPrintSize.id === opt.id
                          ? 'bg-[#0F4C3A] text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Split Content Body: Left = Table, Right = Live Preview */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Left Column: Records Table (7 cols) */}
              <div className="lg:col-span-7 border-r border-slate-200 overflow-y-auto max-h-[500px] lg:max-h-none p-3 space-y-2">
                {batchSummary.rows
                  .filter((row) => {
                    if (batchFilter === 'valid') return row.isValid;
                    if (batchFilter === 'errors') return !row.isValid;
                    return true;
                  })
                  .map((row) => {
                    const isSelected = batchSummary.rows[selectedBatchRowIndex]?.rowNumber === row.rowNumber;
                    return (
                      <div
                        key={row.rowNumber}
                        onClick={() => {
                          const idx = batchSummary.rows.findIndex((r) => r.rowNumber === row.rowNumber);
                          if (idx !== -1) setSelectedBatchRowIndex(idx);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/50 border-[#1E8262] ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 font-mono font-black text-xs text-slate-700 flex items-center justify-center shrink-0">
                              #{row.rowNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                row.isValid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {row.isValid ? (
                                <>
                                  <Check className="w-3 h-3" /> Valid
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3" /> {row.errors.length} Error(s)
                                </>
                              )}
                            </span>
                            {row.multiple_print > 1 && (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                {row.multiple_print} Copies
                              </span>
                            )}
                            {row.tracking_number && (
                              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {row.tracking_number}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadRowIntoEditor(row);
                              }}
                              className="text-[10.5px] font-bold text-slate-600 hover:text-[#0F4C3A] bg-slate-100 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-emerald-200 cursor-pointer"
                              title="Load this record into the main editor"
                            >
                              Load in Editor
                            </button>
                          </div>
                        </div>

                        {/* Record Details summary */}
                        <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              TO (Recipient)
                            </span>
                            <span className="font-bold text-slate-900 block truncate">
                              {row.to_name || '—'}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {[row.to_city, row.to_state, row.to_pincode].filter(Boolean).join(', ') || '—'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              FROM (Sender)
                            </span>
                            <span className="font-bold text-slate-900 block truncate">
                              {row.from_name || '—'}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {[row.from_city, row.from_state, row.from_pincode].filter(Boolean).join(', ') || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Display row errors if invalid */}
                        {!row.isValid && row.errors.length > 0 && (
                          <div className="mt-2.5 p-2 rounded-xl bg-red-50/80 border border-red-200 space-y-0.5">
                            {row.errors.map((err, eIdx) => (
                              <p key={eIdx} className="text-[11px] font-semibold text-red-700 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                                {err}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Right Column: Live Label Preview (5 cols) */}
              <div className="lg:col-span-5 bg-slate-100/60 p-4 sm:p-5 flex flex-col items-center justify-start overflow-y-auto max-h-[500px] lg:max-h-none space-y-3">
                {batchSummary.rows[selectedBatchRowIndex] ? (
                  <>
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-slate-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Record #{batchSummary.rows[selectedBatchRowIndex].rowNumber} Preview
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <LabelPreviewZoomToolbar
                          zoom={batchPreviewZoom}
                          onZoomChange={setBatchPreviewZoom}
                          onFitToPreview={() => setBatchPreviewZoom(selectedPrintSize.id === 'a4' ? 0.45 : 0.9)}
                          onFullScreen={() => setIsBatchFullScreenOpen(true)}
                          compact
                          magnifierActive={batchMagnifierActive}
                          onToggleMagnifier={() => setBatchMagnifierActive((prev) => !prev)}
                        />
                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          {selectedPrintSize.label}
                        </span>
                      </div>
                    </div>

                    {!batchSummary.rows[selectedBatchRowIndex].isValid && (
                      <div className="w-full p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>This row contains validation errors. Fix in Excel and re-upload, or load into editor to correct manually.</span>
                      </div>
                    )}

                    <div
                      ref={batchViewportRef}
                      {...batchPanProps}
                      className={`w-full flex justify-center py-2 overflow-auto max-h-[540px] relative preview-viewport ${batchCursorClass}`}
                      style={{
                        ...batchPanProps.style,
                      }}
                    >
                      <div
                        style={{
                          transform: `scale(${batchPreviewZoom})`,
                          transformOrigin: 'top center',
                          transition: 'transform 0.15s ease-out',
                        }}
                      >
                        <LabelHoverMagnifier
                          zoom={batchPreviewZoom}
                          disabled={!batchMagnifierActive}
                          onOpenFullScreen={() => setIsBatchFullScreenOpen(true)}
                        >
                        <AddressPrintLabelCard
                          template={{
                            ...template,
                            widthInches: selectedPrintSize.widthInches,
                            heightInches: selectedPrintSize.heightInches,
                          }}
                          data={{
                            to_name: batchSummary.rows[selectedBatchRowIndex].to_name,
                            to_contact_person: batchSummary.rows[selectedBatchRowIndex].to_contact_person,
                            to_include_contact_person: batchSummary.rows[selectedBatchRowIndex].to_include_contact_person,
                            to_mobile: batchSummary.rows[selectedBatchRowIndex].to_mobile_full,
                            to_address: batchSummary.rows[selectedBatchRowIndex].to_address_line_1,
                            to_address_line_1: batchSummary.rows[selectedBatchRowIndex].to_address_line_1,
                            to_city: batchSummary.rows[selectedBatchRowIndex].to_city,
                            to_state: batchSummary.rows[selectedBatchRowIndex].to_state,
                            to_pincode: batchSummary.rows[selectedBatchRowIndex].to_pincode,
                            to_formatting: toFormatting,
                            from_name: batchSummary.rows[selectedBatchRowIndex].from_name,
                            from_contact_person: batchSummary.rows[selectedBatchRowIndex].from_contact_person,
                            from_include_contact_person: batchSummary.rows[selectedBatchRowIndex].from_include_contact_person,
                            from_mobile: batchSummary.rows[selectedBatchRowIndex].from_mobile_full,
                            from_address: batchSummary.rows[selectedBatchRowIndex].from_address_line_1,
                            from_address_line_1: batchSummary.rows[selectedBatchRowIndex].from_address_line_1,
                            from_city: batchSummary.rows[selectedBatchRowIndex].from_city,
                            from_state: batchSummary.rows[selectedBatchRowIndex].from_state,
                            from_pincode: batchSummary.rows[selectedBatchRowIndex].from_pincode,
                            from_formatting: fromFormatting,
                            tracking_number: batchSummary.rows[selectedBatchRowIndex].tracking_number,
                            courier_company: batchSummary.rows[selectedBatchRowIndex].courier_company || activeShipperName,
                            courier_logo: activeShipperLogo,
                            package_count:
                              batchSummary.rows[selectedBatchRowIndex].multiple_print > 1
                                ? `01 / ${String(batchSummary.rows[selectedBatchRowIndex].multiple_print).padStart(2, '0')}`
                                : '01 / 01',
                          }}
                          id="batch-preview-selected-card"
                          scale={1}
                        />
                        </LabelHoverMagnifier>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-slate-400">
                    <p className="text-xs font-bold">Select a record to preview label</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Action Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 font-medium">
                {batchSaveProgress ? (
                  <span className="flex items-center gap-2 font-bold text-emerald-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving label {batchSaveProgress.current} of {batchSaveProgress.total}...
                  </span>
                ) : (
                  <span>
                    Ready to generate <strong className="text-slate-900">{batchSummary.totalLabelsCount}</strong> total labels for <strong className="text-slate-900">{batchSummary.validRecords}</strong> valid records.
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleSaveBatchToHistory}
                  disabled={isSavingBatch || batchSummary.validRecords === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Save valid labels into Organization history"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Valid ({batchSummary.validRecords})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBatchPDF}
                  disabled={isExportingBatchPdf || batchSummary.validRecords === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-[#0F4C3A] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Download all valid labels in a single PDF document"
                >
                  {isExportingBatchPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1E8262]" />
                  ) : (
                    <Download className="w-4 h-4 text-[#1E8262]" />
                  )}
                  <span>Download Batch PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintBatchLabels}
                  disabled={batchSummary.validRecords === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C3A] hover:bg-[#155d47] rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs hover:shadow-md"
                  title="Print all valid labels with their respective copy counts"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Print All Valid ({batchSummary.totalLabelsCount})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL SHIPPER CREATION */}
      {isAddShipperModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#1E8262]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Add New Shipper</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Create custom shipping company with logo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddShipperModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newShipperError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{newShipperError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Shipper Name *
              </label>
              <input
                type="text"
                value={newShipperName}
                onChange={(e) => {
                  setNewShipperName(e.target.value);
                  if (newShipperError) setNewShipperError('');
                }}
                placeholder="e.g. SpeedPost Global / Swift Logistics"
                className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1E8262] focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Shipper Logo (PNG, JPG, JPEG, WebP)
              </label>
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {newShipperLogoUrl ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-24 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 overflow-hidden shadow-2xs">
                      <img
                        src={newShipperLogoUrl}
                        alt="Logo Preview"
                        className="max-h-8 max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Logo Uploaded
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready for Label
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewShipperLogoUrl('');
                      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl bg-slate-50/50 hover:bg-emerald-50/20 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer group"
                >
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                    Upload Shipper Logo
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Click to select PNG, JPG, JPEG, or WebP
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddShipperModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewShipper}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0F4C3A] hover:bg-[#155d47] rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save Shipper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Batch Row Preview Modal (90-95% Viewport) */}
      <FullScreenLabelPreviewModal
        isOpen={isBatchFullScreenOpen}
        onClose={() => setIsBatchFullScreenOpen(false)}
        title="BATCH ROW SHIPPING LABEL PREVIEW"
        badge={
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-emerald-400 rounded border border-slate-700">
            {selectedPrintSize.label}
          </span>
        }
        targetWidthPx={Math.round(selectedPrintSize.widthInches * 96)}
        targetHeightPx={Math.round(selectedPrintSize.heightInches * 96)}
      />
    </div>
  );
}
