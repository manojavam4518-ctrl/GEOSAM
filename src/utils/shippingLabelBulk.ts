import * as XLSX from 'xlsx';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { ShippingLabelTemplateData, parsePackageCount, formatPackageSequence } from '@/lib/shippingLabel';

export interface BulkShipmentRow {
  rowNumber: number; // 1-based Excel row number (Row 2 is first data row)
  tracking_number: string;
  recipient_name: string;
  contact_person_name?: string;
  mobile: string;
  mobileDigits: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  payment_status: 'PREPAID' | 'COD' | 'TO PAY' | 'FOD';
  amount_to_collect: number;
  weight: number;
  package_count: number;
  mode: string;
  date: string;
  time?: string;
  service: string;
  service_type: string;
  origin_code: string;
  destination_code: string;
  route_location?: string;
  errors: string[];
  isValid: boolean;
}

export interface BulkValidationSummary {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  rows: BulkShipmentRow[];
  hasErrors: boolean;
}

// Canonical column definition for the dynamic Excel template
export interface BulkTemplateColumn {
  header: string;
  key: string;
  required: boolean;
  sampleValue: string | number;
  description: string;
}

export const BULK_TEMPLATE_COLUMNS: BulkTemplateColumn[] = [
  {
    header: 'Tracking / Consignment Number *',
    key: 'tracking_number',
    required: true,
    sampleValue: 'GT2609048123',
    description: 'Unique consignment tracking ID',
  },
  {
    header: 'Recipient / Company Name *',
    key: 'recipient_name',
    required: true,
    sampleValue: 'Ramesh Enterprises',
    description: 'Company or recipient name',
  },
  {
    header: 'Contact Person Name',
    key: 'contact_person_name',
    required: false,
    sampleValue: 'Rajesh Kumar',
    description: 'Optional receiving contact',
  },
  {
    header: 'Mobile Number *',
    key: 'mobile',
    required: true,
    sampleValue: '9876543210',
    description: '10-digit mobile number',
  },
  {
    header: 'Address Line 1 *',
    key: 'address_line_1',
    required: true,
    sampleValue: 'Shop No. 12, Industrial Area Phase 2',
    description: 'Street address / premises',
  },
  {
    header: 'City *',
    key: 'city',
    required: true,
    sampleValue: 'Mumbai',
    description: 'Destination city',
  },
  {
    header: 'State *',
    key: 'state',
    required: true,
    sampleValue: 'Maharashtra',
    description: 'Destination state',
  },
  {
    header: 'Pincode *',
    key: 'pincode',
    required: true,
    sampleValue: '400001',
    description: '6-digit destination pincode',
  },
  {
    header: 'Payment Mode *',
    key: 'payment_status',
    required: true,
    sampleValue: 'PREPAID',
    description: 'PREPAID, COD, TO PAY, or FOD',
  },
  {
    header: 'Amount to Collect (₹)',
    key: 'amount_to_collect',
    required: false,
    sampleValue: 0,
    description: 'Required if Payment Mode is COD',
  },
  {
    header: 'Weight (KG) *',
    key: 'weight',
    required: true,
    sampleValue: 1.5,
    description: 'Shipment weight in KG',
  },
  {
    header: 'Package Count',
    key: 'package_count',
    required: false,
    sampleValue: 1,
    description: 'Total packages (default 1)',
  },
  {
    header: 'Mode',
    key: 'mode',
    required: false,
    sampleValue: 'SURFACE',
    description: 'SURFACE, AIR, EXPRESS, etc.',
  },
  {
    header: 'Dispatch Date',
    key: 'date',
    required: false,
    sampleValue: new Date().toISOString().split('T')[0],
    description: 'YYYY-MM-DD or DD/MM/YYYY',
  },
  {
    header: 'Service',
    key: 'service',
    required: false,
    sampleValue: 'LITE',
    description: 'LITE, CARGO, EXPRESS, STANDARD',
  },
  {
    header: 'Service Type',
    key: 'service_type',
    required: false,
    sampleValue: 'STD EXP-A',
    description: 'STD EXP-A, PRIORITY, ECONOMY, SAME DAY',
  },
  {
    header: 'Origin Code',
    key: 'origin_code',
    required: false,
    sampleValue: 'BOM',
    description: 'Origin airport / station code',
  },
  {
    header: 'Destination Code',
    key: 'destination_code',
    required: false,
    sampleValue: 'DEL',
    description: 'Destination airport / station code',
  },
];

/**
 * Generates and downloads the bulk shipment Excel template dynamically
 * with exact column headers and a clearly marked sample row.
 */
export function downloadBulkExcelTemplate(): void {
  const headers = BULK_TEMPLATE_COLUMNS.map((col) => col.header);
  const sampleRow = BULK_TEMPLATE_COLUMNS.map((col) => col.sampleValue);

  const wsData = [headers, sampleRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set nice column widths
  ws['!cols'] = BULK_TEMPLATE_COLUMNS.map((col) => ({
    wch: Math.max(col.header.length + 4, String(col.sampleValue).length + 4, 15),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Shipments');

  XLSX.writeFile(wb, 'shipping_labels_bulk_template.xlsx');
}

/**
 * Normalizes an arbitrary header string for robust matching
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[()[\]{}_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps a raw Excel column header to a known canonical field key
 */
function mapHeaderToKey(rawHeader: string): string | null {
  const norm = normalizeHeader(rawHeader);

  if (norm.includes('tracking') || norm.includes('consignment')) return 'tracking_number';
  if (norm.includes('recipient') || norm.includes('company')) return 'recipient_name';
  if (norm.includes('contact person') || norm.includes('attn')) return 'contact_person_name';
  if (norm.includes('mobile') || norm.includes('phone') || norm.includes('contact no')) return 'mobile';
  if (norm.includes('address line 1') || norm.includes('address 1') || norm === 'address') return 'address_line_1';
  if (norm.includes('address line 2') || norm.includes('address 2')) return 'address_line_2';
  if (norm === 'city' || norm.includes('city')) return 'city';
  if (norm === 'state' || norm.includes('state')) return 'state';
  if (norm.includes('pincode') || norm.includes('pin code') || norm.includes('postal') || norm === 'pin') return 'pincode';
  if (norm.includes('payment') || norm === 'payment status') return 'payment_status';
  if (norm.includes('amount') || norm.includes('collect') || norm.includes('cod amount')) return 'amount_to_collect';
  if (norm.includes('weight')) return 'weight';
  if (norm.includes('package') || norm.includes('pkg count') || norm.includes('packages')) return 'package_count';
  if (norm === 'mode' || norm.includes('shipping mode')) return 'mode';
  if (norm.includes('dispatch') || norm === 'date' || norm.includes('shipment date')) return 'date';
  if (norm === 'service type' || norm.includes('service type')) return 'service_type';
  if (norm === 'service') return 'service';
  if (norm.includes('origin')) return 'origin_code';
  if (norm.includes('destination') || norm.includes('dst')) return 'destination_code';

  return null;
}

/**
 * Helper to parse Excel dates (both serial numbers and date strings)
 */
function parseExcelDate(val: any): string {
  if (!val) {
    return new Date().toISOString().split('T')[0];
  }

  // Handle Excel serial date numbers (e.g. 45565)
  if (typeof val === 'number') {
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (dateObj) {
      const y = String(dateObj.y).padStart(4, '2000');
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  const s = String(val).trim();
  // If DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // If YYYY-MM-DD
  const yyyymmdd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback to standard Date parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return s;
}

/**
 * Parses an uploaded Excel (.xlsx/.xls) file and validates every row against
 * mandatory fields, mobile rules, pincode rules, numeric rules, and dropdown options.
 */
export async function parseAndValidateBulkExcel(
  file: File,
  options?: {
    validModes?: string[];
    validServices?: string[];
    validServiceTypes?: string[];
  }
): Promise<BulkValidationSummary> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  if (!ws) {
    throw new Error('Could not read the first worksheet in the uploaded Excel file.');
  }

  // Convert to 2D array of raw values
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded Excel file is empty.');
  }

  // Find header row (usually row 0)
  const headerRow = rawRows[0];
  if (!headerRow || headerRow.length === 0) {
    throw new Error('No header row found in the uploaded Excel file.');
  }

  // Map column index to field key
  const colIndexToKey: Record<number, string> = {};
  headerRow.forEach((colVal: any, colIdx: number) => {
    if (colVal !== undefined && colVal !== null) {
      const key = mapHeaderToKey(String(colVal));
      if (key) {
        colIndexToKey[colIdx] = key;
      }
    }
  });

  const recognizedKeys = Object.values(colIndexToKey);
  if (!recognizedKeys.includes('recipient_name') && !recognizedKeys.includes('tracking_number')) {
    throw new Error(
      'The uploaded Excel file does not match the required shipping label columns. Please download and use the official Excel Template.'
    );
  }

  const allowedModes = (options?.validModes || ['SURFACE', 'AIR', 'EXPRESS', 'EXPRESS BEES']).map((m) =>
    m.toUpperCase()
  );
  const allowedServices = (options?.validServices || ['LITE', 'CARGO', 'EXPRESS', 'STANDARD']).map((s) =>
    s.toUpperCase()
  );
  const allowedServiceTypes = (
    options?.validServiceTypes || ['STD EXP-A', 'PRIORITY', 'ECONOMY', 'SAME DAY']
  ).map((st) => st.toUpperCase());
  const allowedPaymentModes = ['PREPAID', 'COD', 'TO PAY', 'FOD'];

  const rows: BulkShipmentRow[] = [];
  const trackingNumberOccurrences: Record<string, number[]> = {};

  // Process data rows starting from index 1 (Excel Row 2)
  for (let rIdx = 1; rIdx < rawRows.length; rIdx++) {
    const rawRow = rawRows[rIdx];
    // Check if entire row is empty
    if (!rawRow || rawRow.every((c) => c === undefined || c === null || String(c).trim() === '')) {
      continue;
    }

    const rowNum = rIdx + 1; // 1-indexed Excel row
    const rowObj: Record<string, any> = {};

    Object.entries(colIndexToKey).forEach(([cIdxStr, key]) => {
      const cIdx = parseInt(cIdxStr, 10);
      rowObj[key] = rawRow[cIdx];
    });

    const errors: string[] = [];

    // 1. Tracking / Consignment Number *
    const rawTracking = String(rowObj.tracking_number || '').trim().toUpperCase();
    if (!rawTracking) {
      errors.push('Tracking / Consignment Number is required');
    } else {
      if (!trackingNumberOccurrences[rawTracking]) {
        trackingNumberOccurrences[rawTracking] = [];
      }
      trackingNumberOccurrences[rawTracking].push(rowNum);
    }

    // 2. Recipient / Company Name *
    const recipientName = String(rowObj.recipient_name || '').trim();
    if (!recipientName) {
      errors.push('Recipient / Company Name is required');
    }

    // 3. Mobile Number *
    const rawMobile = String(rowObj.mobile || '').trim();
    const cleanDigits = rawMobile.replace(/\D/g, '');
    let finalMobileDigits = cleanDigits;

    if (!cleanDigits) {
      errors.push('Mobile Number is required');
    } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      finalMobileDigits = cleanDigits.slice(2);
    } else if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) {
      finalMobileDigits = cleanDigits.slice(1);
    }

    if (cleanDigits && finalMobileDigits.length !== 10) {
      errors.push('Mobile Number must contain exactly 10 digits');
    }

    const fullMobile = finalMobileDigits ? `+91 ${finalMobileDigits}` : rawMobile;

    // 4. Address Line 1 *
    const addressLine1 = String(rowObj.address_line_1 || '').trim();
    if (!addressLine1) {
      errors.push('Address Line 1 is required');
    }

    // 5. City *
    const city = String(rowObj.city || '').trim();
    if (!city) {
      errors.push('City is required');
    }

    // 6. State *
    const state = String(rowObj.state || '').trim();
    if (!state) {
      errors.push('State is required');
    }

    // 7. Pincode *
    let rawPincode = String(rowObj.pincode || '').trim().replace(/\D/g, '');
    if (!rawPincode) {
      errors.push('Pincode is required');
    } else if (rawPincode.length !== 6) {
      errors.push('Pincode must contain exactly 6 digits');
    }

    // 8. Payment Mode *
    const rawPayment = rowObj.payment_status;
    let paymentMode = String(rawPayment || '').trim().toUpperCase();
    if (rawPayment === undefined || rawPayment === null || String(rawPayment).trim() === '') {
      errors.push('Payment Mode is required');
    } else if (!allowedPaymentModes.includes(paymentMode)) {
      errors.push(`Invalid Payment Mode "${paymentMode}". Allowed: ${allowedPaymentModes.join(', ')}`);
    }


    // Amount to collect if COD
    let amountToCollect = 0;
    if (paymentMode === 'COD') {
      const rawAmt = rowObj.amount_to_collect;
      amountToCollect = parseFloat(String(rawAmt || 0));
      if (isNaN(amountToCollect) || amountToCollect <= 0) {
        errors.push('Amount to Collect is required for Cash on Delivery (COD) shipments');
      }
    } else if (rowObj.amount_to_collect) {
      amountToCollect = parseFloat(String(rowObj.amount_to_collect)) || 0;
    }

    // 9. Weight (KG) *
    const rawWeight = rowObj.weight;
    let weight = parseFloat(String(rawWeight || ''));
    if (rawWeight === undefined || rawWeight === null || String(rawWeight).trim() === '') {
      errors.push('Weight is required');
    } else if (isNaN(weight) || weight <= 0) {
      errors.push('Weight must be a positive number');
    } else {
      weight = parseFloat(weight.toFixed(2));
    }

    // 10. Package Count
    let packageCount = 1;
    if (rowObj.package_count !== undefined && rowObj.package_count !== null && String(rowObj.package_count).trim() !== '') {
      const parsedPkg = parseInt(String(rowObj.package_count).trim(), 10);
      if (isNaN(parsedPkg) || parsedPkg < 1) {
        errors.push('Package Count must be an integer of 1 or greater');
      } else {
        packageCount = parsedPkg;
      }
    }

    // 11. Mode
    let mode = String(rowObj.mode || 'SURFACE').trim().toUpperCase();
    if (!mode) mode = 'SURFACE';
    if (!allowedModes.includes(mode)) {
      errors.push(`Invalid Mode "${mode}". Allowed: ${allowedModes.join(', ')}`);
    }

    // 12. Dispatch Date
    const dispatchDate = parseExcelDate(rowObj.date);
    if (isNaN(new Date(dispatchDate).getTime())) {
      errors.push('Invalid Dispatch Date format');
    }

    // 13. Service
    let service = String(rowObj.service || 'LITE').trim().toUpperCase();
    if (!service) service = 'LITE';
    if (!allowedServices.includes(service)) {
      errors.push(`Invalid Service "${service}". Allowed: ${allowedServices.join(', ')}`);
    }

    // 14. Service Type
    let serviceType = String(rowObj.service_type || 'STD EXP-A').trim().toUpperCase();
    if (!serviceType) serviceType = 'STD EXP-A';
    if (!allowedServiceTypes.includes(serviceType)) {
      errors.push(`Invalid Service Type "${serviceType}". Allowed: ${allowedServiceTypes.join(', ')}`);
    }

    const contactPerson = String(rowObj.contact_person_name || '').trim();
    const originCode = String(rowObj.origin_code || 'BOM').trim().toUpperCase();
    const destinationCode = String(rowObj.destination_code || 'DEL').trim().toUpperCase();

    rows.push({
      rowNumber: rowNum,
      tracking_number: rawTracking,
      recipient_name: recipientName,
      contact_person_name: contactPerson || undefined,
      mobile: fullMobile,
      mobileDigits: finalMobileDigits,
      address_line_1: addressLine1,
      address_line_2: String(rowObj.address_line_2 || '').trim() || undefined,
      city,
      state,
      pincode: rawPincode,
      payment_status: paymentMode as any,
      amount_to_collect: amountToCollect,
      weight: isNaN(weight) ? 1.0 : weight,
      package_count: packageCount,
      mode,
      date: dispatchDate,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      service,
      service_type: serviceType,
      origin_code: originCode,
      destination_code: destinationCode,
      route_location: 'NORTH HUB / R-04',
      errors,
      isValid: errors.length === 0,
    });
  }

  // Cross-check duplicate tracking numbers across the file
  Object.entries(trackingNumberOccurrences).forEach(([tracking, rowNums]) => {
    if (rowNums.length > 1) {
      rowNums.forEach((rNum) => {
        const row = rows.find((r) => r.rowNumber === rNum);
        if (row) {
          const dupErr = `Duplicate Tracking Number "${tracking}" found in rows ${rowNums.join(', ')}`;
          if (!row.errors.includes(dupErr)) {
            row.errors.push(dupErr);
            row.isValid = false;
          }
        }
      });
    }
  });

  const totalRecords = rows.length;
  const validRecords = rows.filter((r) => r.isValid).length;
  const invalidRecords = totalRecords - validRecords;

  return {
    totalRecords,
    validRecords,
    invalidRecords,
    rows,
    hasErrors: invalidRecords > 0,
  };
}

/**
 * Generates and downloads an Excel Error Report containing affected row numbers
 * and detailed validation errors so users can fix and re-upload.
 */
export function downloadBulkErrorReport(rows: BulkShipmentRow[]): void {
  const errorRows = rows.filter((r) => !r.isValid);
  if (errorRows.length === 0) return;

  const exportData = errorRows.map((r) => ({
    'Excel Row Number': `Row ${r.rowNumber}`,
    'Tracking Number': r.tracking_number || '(Missing)',
    'Recipient Name': r.recipient_name || '(Missing)',
    'Mobile Number': r.mobile || '(Missing)',
    'Validation Errors': r.errors.map((e) => `❌ ${e}`).join('; '),
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
    { wch: 55 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Validation Errors');

  XLSX.writeFile(wb, 'shipping_labels_error_report.xlsx');
}

/**
 * Generates real machine-readable CODE128 Barcode as a Data URL for bulk label rendering
 */
export async function generateBulkBarcodeDataUrl(trackingNumber: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, trackingNumber, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 48,
        width: 2.2,
        background: '#ffffff',
        lineColor: '#000000',
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Barcode generation error for tracking:', trackingNumber, err);
      resolve('');
    }
  });
}

/**
 * Generates real 2D QR Code as a Data URL for bulk label rendering
 */
export async function generateBulkQrDataUrl(trackingNumber: string): Promise<string> {
  try {
    return await QRCode.toDataURL(trackingNumber, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('QR code generation error for tracking:', trackingNumber, err);
    return '';
  }
}
