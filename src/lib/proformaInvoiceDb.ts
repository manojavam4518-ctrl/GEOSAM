import crypto from 'crypto';
import { convertNumberToIndianWords } from '@/utils/numberToWords';

export interface ProformaInvoiceItem {
  id?: string;
  sNo: number;
  description: string;
  hsnCode: string;
  quantity: number | '';
  rate: number | '';
  valueInr: number;
}

export interface ProformaInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string; // DD.MM.YYYY matching reference e.g. 29.03.2025

  // Consignor Details
  consignorTitle?: string; // e.g. "Mr.", "Mrs.", "Ms.", "Madam", "Dr.", "M/s"
  consignorName: string;
  consignorRelationshipType?: string;
  consignorRelationshipName?: string;
  consignorAddress: string;
  consignorCity: string;
  consignorState: string;
  consignorCountry: string;
  consignorPincode: string;
  consignorCountryCode?: string; // e.g. "+91", "+1", "+44", "+971"
  consignorContact: string;
  consignorEmail: string;

  // Consignee Details
  consigneeTitle?: string; // e.g. "Mr.", "Mrs.", "Ms.", "Madam", "Dr.", "M/s"
  consigneeName: string;
  consigneeRelationshipType?: string;
  consigneeRelationshipName?: string;
  consigneeAddress: string;
  consigneeCity: string;
  consigneeState: string;
  consigneeCountry: string;
  consigneePincode: string;
  consigneeCountryCode?: string; // e.g. "+91", "+1", "+44", "+971"
  consigneeContact: string;
  consigneeEmail: string;

  // KYC Details
  kycType: 'AADHAAR NO' | 'PASSPORT NO' | 'PAN NO' | 'IEC NO' | 'KYC ID';
  kycNumber: string; // e.g. 6566 1068 9680
  kycMasked: boolean; // whether to mask in preview e.g. **** **** 9680

  // Country Details
  countryOfOrigin: string; // default "India"
  countryOfFinalDestination: string;
  defaultOriginIndia?: boolean; // whether India is set as default origin (default true)

  // Shipment & Transportation Details
  preCarriageBy: string;
  placeOfReceiptByPreCarrier: string;
  defaultPlaceOfReceiptIndia?: boolean; // whether India is set as default place of receipt (default true)
  vesselFlightNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  finalDestination: string;

  // Goods Description (6 initial rows)
  items: ProformaInvoiceItem[];

  // Totals & Declarations
  totalValue: number;
  valueInWords: string;
  declarationText: string;

  // Signature & Date
  signatureBase64?: string;
  signatureDate?: string;

  // Consignee Authorized Signature & OTP Verification
  signatureVerificationMethod?: 'OTP' | 'DIRECT'; // 'OTP' (MFA) or 'DIRECT' (Whiteboard only)
  signatureStatus?: 'PENDING' | 'OTP_SENT' | 'VERIFIED' | 'SIGNED';
  signatureVerifiedAt?: string;
  signatureVerifiedContact?: string;
}

export interface ProformaInvoiceRecord extends ProformaInvoiceInput {
  id: string;
  organizationId?: string;
  userId?: string;
  createdByName?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

/**
 * Standard relationship options for Consignor and Consignee
 */
export const PROFORMA_RELATIONSHIP_TYPES = [
  'Son of (S/O)',
  'Daughter of (D/O)',
  'Wife of (W/O)',
  'Husband of (H/O)',
  'Care of (C/O)',
  'Father of',
  'Mother of',
  'Other',
] as const;

export type ProformaRelationshipType = (typeof PROFORMA_RELATIONSHIP_TYPES)[number];

/**
 * Standard title options for Consignor and Consignee names
 */
export const PROFORMA_NAME_TITLES = [
  'Mr.',
  'Mrs.',
  'Ms.',
  'Madam',
  'Dr.',
  'M/s',
] as const;

export type ProformaNameTitle = (typeof PROFORMA_NAME_TITLES)[number];

/**
 * Formats name with title cleanly, preventing duplicate title if user manually entered the title in the name field.
 * e.g., "Mr." + "Kumar Swamy" -> "Mr. Kumar Swamy"
 * e.g., "Mr." + "Mr. Kumar Swamy" -> "Mr. Kumar Swamy"
 * e.g., "" + "Kumar Swamy" -> "Kumar Swamy"
 */
export function formatNameWithTitle(title?: string, name?: string): string {
  const cleanName = (name || '').trim();
  if (!cleanName) return '';
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return cleanName;

  // Prevent duplicate titles if user manually typed the title into name input
  const escapedTitle = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titleRegex = new RegExp(`^${escapedTitle}\\b\\.?\\s*`, 'i');
  if (titleRegex.test(cleanName)) {
    const remaining = cleanName.replace(titleRegex, '').trim();
    return `${cleanTitle} ${remaining}`.trim();
  }

  return `${cleanTitle} ${cleanName}`;
}

/**
 * Formats relationship abbreviation and name cleanly for document display.
 * e.g., "Son of (S/O)" + "Ramesh Swamy" -> "S/O: Ramesh Swamy"
 * e.g., "Wife of (W/O)" + "Sita Devi" -> "W/O: Sita Devi"
 * e.g., "Father of" + "Rajesh" -> "Father of: Rajesh"
 */
export function formatRelationshipDisplay(type?: string, name?: string): string {
  const cleanName = (name || '').trim();
  if (!cleanName) return '';
  const cleanType = (type || '').trim();
  if (!cleanType) return `S/O: ${cleanName}`;
  const parenMatch = cleanType.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    return `${parenMatch[1].trim()}: ${cleanName}`;
  }
  return `${cleanType}: ${cleanName}`;
}

/**
 * Returns formatted today's date in DD.MM.YYYY format (matching reference image)
 */
export const getFormattedInvoiceDate = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

/**
 * Generates initial 6 empty goods-entry rows matching the reference template
 */
export const createDefaultInvoiceItems = (): ProformaInvoiceItem[] => {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `item-${i + 1}`,
    sNo: i + 1,
    description: '',
    hsnCode: '',
    quantity: '',
    rate: '',
    valueInr: 0,
  }));
};

/**
 * Standard declaration statement from the reference image
 */
export const DEFAULT_PROFORMA_DECLARATION =
  'We declare that invoice shows the actual price of goods described and that all particulars are true and correct.';

/**
 * Generate a clean sequential invoice number
 */
export const generateProformaInvoiceNumber = (): string => {
  const now = new Date();
  const yearSuffix = now.getFullYear().toString().slice(-2);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `PI-${yearSuffix}${randomNum}`;
};

/**
 * Initial empty form state
 */
export const initialProformaInvoiceState: ProformaInvoiceInput = {
  invoiceNumber: generateProformaInvoiceNumber(),
  invoiceDate: getFormattedInvoiceDate(),

  consignorTitle: '',
  consignorName: '',
  consignorRelationshipType: '',
  consignorRelationshipName: '',
  consignorAddress: '',
  consignorCity: '',
  consignorState: '',
  consignorCountry: 'India',
  consignorPincode: '',
  consignorCountryCode: '+91',
  consignorContact: '',
  consignorEmail: '',

  consigneeTitle: '',
  consigneeName: '',
  consigneeRelationshipType: '',
  consigneeRelationshipName: '',
  consigneeAddress: '',
  consigneeCity: '',
  consigneeState: '',
  consigneeCountry: '',
  consigneePincode: '',
  consigneeCountryCode: '+91',
  consigneeContact: '',
  consigneeEmail: '',

  kycType: 'AADHAAR NO',
  kycNumber: '',
  kycMasked: false,

  countryOfOrigin: 'India',
  countryOfFinalDestination: '',
  defaultOriginIndia: true,

  preCarriageBy: '',
  placeOfReceiptByPreCarrier: 'India',
  defaultPlaceOfReceiptIndia: true,
  vesselFlightNo: '',
  portOfLoading: '',
  portOfDischarge: '',
  finalDestination: '',

  items: createDefaultInvoiceItems(),
  totalValue: 0,
  valueInWords: 'ZERO ONLY',
  declarationText: DEFAULT_PROFORMA_DECLARATION,

  signatureBase64: '',
  signatureDate: getFormattedInvoiceDate(),
  signatureVerificationMethod: 'OTP',
  signatureStatus: 'PENDING',
  signatureVerifiedAt: '',
  signatureVerifiedContact: '',
};

/**
 * Compute total value and words from items
 */
export const calculateInvoiceTotals = (items: ProformaInvoiceItem[]) => {
  let sum = 0;
  const updatedItems = items.map((item, idx) => {
    const q = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
    const r = typeof item.rate === 'number' ? item.rate : parseFloat(String(item.rate)) || 0;
    const val = Math.round(q * r * 100) / 100;
    sum += val;
    return {
      ...item,
      sNo: idx + 1,
      valueInr: val,
    };
  });

  const totalValue = Math.round(sum * 100) / 100;
  let words = 'ZERO ONLY';
  if (totalValue > 0) {
    const wordsRaw = convertNumberToIndianWords(totalValue);
    words = wordsRaw.toUpperCase().replace(/\bAND\b/g, '&');
  }

  return {
    items: updatedItems,
    totalValue,
    valueInWords: words,
  };
};

// Client-side Local Storage Key for persistent records
export const PROFORMA_STORAGE_KEY = 'geo_proforma_invoices';

/**
 * Load saved invoices from localStorage
 */
export const loadProformaInvoicesFromStorage = (): ProformaInvoiceRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PROFORMA_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse saved proforma invoices from storage:', err);
    return [];
  }
};

/**
 * Save invoice to localStorage
 */
export const saveProformaInvoiceToStorage = (
  record: ProformaInvoiceInput & { id?: string }
): ProformaInvoiceRecord => {
  const existing = loadProformaInvoicesFromStorage();
  const now = new Date().toISOString();

  let targetRecord: ProformaInvoiceRecord;

  if (record.id) {
    // Update existing record
    const idx = existing.findIndex((r) => r.id === record.id);
    targetRecord = {
      ...record,
      id: record.id,
      status: 'ACTIVE',
      createdAt: idx >= 0 ? existing[idx].createdAt : now,
      updatedAt: now,
    };

    if (idx >= 0) {
      existing[idx] = targetRecord;
    } else {
      existing.unshift(targetRecord);
    }
  } else {
    // Create new record
    const id = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    targetRecord = {
      ...record,
      id,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    existing.unshift(targetRecord);
  }

  try {
    localStorage.setItem(PROFORMA_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to save proforma invoice to storage:', err);
  }

  return targetRecord;
};

/**
 * Delete invoice from localStorage
 */
export const deleteProformaInvoiceFromStorage = (id: string): void => {
  const existing = loadProformaInvoicesFromStorage();
  const updated = existing.filter((r) => r.id !== id);
  try {
    localStorage.setItem(PROFORMA_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete proforma invoice from storage:', err);
  }
};

