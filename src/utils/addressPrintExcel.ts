import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { PrintSizeOption, PRINT_SIZE_OPTIONS } from '@/lib/shippingLabel';
import { COUNTRIES, DEFAULT_COUNTRY, CountryCode, parseMobileAndCountry } from '@/lib/countryCodes';

function formatMobileWithCountry(dialCode: string, mobileDigits: string): string {
  const cleanDigits = mobileDigits.replace(/\D/g, '');
  if (!cleanDigits) return '';
  const cleanDial = dialCode.startsWith('+') ? dialCode : `+${dialCode.replace(/\D/g, '')}`;
  return `${cleanDial} ${cleanDigits}`;
}


export interface AddressPrintTemplateColDef {
  header: string;
  key: string;
  section: 'TO' | 'FROM' | 'ADDITIONAL';
  required: boolean;
  sampleValue: string | number;
  description: string;
  width: number;
}

export const ADDRESS_PRINT_TEMPLATE_COLUMNS: AddressPrintTemplateColDef[] = [
  // SECTION A: TO / CONSIGNEE — Delivery Destination
  {
    header: 'Recipient / Company Name *',
    key: 'to_name',
    section: 'TO',
    required: true,
    sampleValue: 'Ramesh Enterprises',
    description: 'Mandatory. Full name of recipient or receiving organization.',
    width: 28,
  },
  {
    header: 'Contact Person Name',
    key: 'to_contact_person',
    section: 'TO',
    required: false,
    sampleValue: 'Rajesh Kumar',
    description: 'Optional. Name of the contact or receiving personnel.',
    width: 22,
  },
  {
    header: 'Include Contact Person on Label (Yes/No)',
    key: 'to_include_contact_person',
    section: 'TO',
    required: false,
    sampleValue: 'Yes',
    description: 'Optional. "Yes" to print ATTN line on label, "No" to hide.',
    width: 36,
  },
  {
    header: 'Mobile Country Code',
    key: 'to_country_code',
    section: 'TO',
    required: false,
    sampleValue: '+91',
    description: 'Optional. Country dial code (defaults to +91 India).',
    width: 20,
  },
  {
    header: 'Mobile Number *',
    key: 'to_mobile',
    section: 'TO',
    required: true,
    sampleValue: '9876543210',
    description: 'Mandatory. 10-digit mobile number for delivery contact.',
    width: 20,
  },
  {
    header: 'Address Line 1 *',
    key: 'to_address_line_1',
    section: 'TO',
    required: true,
    sampleValue: 'Shop No. 12, Industrial Area Phase 2, Near Landmark Gate',
    description: 'Mandatory. Complete street address / building premises.',
    width: 42,
  },
  {
    header: 'Pincode *',
    key: 'to_pincode',
    section: 'TO',
    required: true,
    sampleValue: '400001',
    description: 'Mandatory. 6-digit postal pincode.',
    width: 16,
  },
  {
    header: 'City *',
    key: 'to_city',
    section: 'TO',
    required: true,
    sampleValue: 'Mumbai',
    description: 'Mandatory. Destination city.',
    width: 20,
  },
  {
    header: 'State *',
    key: 'to_state',
    section: 'TO',
    required: true,
    sampleValue: 'Maharashtra',
    description: 'Mandatory. Destination state.',
    width: 22,
  },
  {
    header: 'Multiple Print',
    key: 'multiple_print',
    section: 'TO',
    required: false,
    sampleValue: 1,
    description: 'Optional. Number of identical label copies to print (default 1).',
    width: 16,
  },

  // SECTION B: FROM / CONSIGNOR — Sender Origin
  {
    header: 'Sender / Company Name *',
    key: 'from_name',
    section: 'FROM',
    required: true,
    sampleValue: 'Geo Transit Warehouse / Apex Industries',
    description: 'Mandatory. Full name of sender or dispatch organization.',
    width: 32,
  },
  {
    header: 'Contact Person Name (Sender)',
    key: 'from_contact_person',
    section: 'FROM',
    required: false,
    sampleValue: 'Dispatch Staff',
    description: 'Optional. Name of dispatch or sender contact person.',
    width: 25,
  },
  {
    header: 'Include Contact Person on Label (Sender) (Yes/No)',
    key: 'from_include_contact_person',
    section: 'FROM',
    required: false,
    sampleValue: 'No',
    description: 'Optional. "Yes" to print ATTN line for sender, "No" to hide.',
    width: 38,
  },
  {
    header: 'Mobile Country Code (Sender)',
    key: 'from_country_code',
    section: 'FROM',
    required: false,
    sampleValue: '+91',
    description: 'Optional. Sender country dial code (defaults to +91).',
    width: 22,
  },
  {
    header: 'Mobile Number (Sender) *',
    key: 'from_mobile',
    section: 'FROM',
    required: true,
    sampleValue: '9876543211',
    description: 'Mandatory. 10-digit mobile number for sender.',
    width: 22,
  },
  {
    header: 'Address Line 1 (Sender) *',
    key: 'from_address_line_1',
    section: 'FROM',
    required: true,
    sampleValue: 'Plot 45, Sector 18, Transport Nagar Hub',
    description: 'Mandatory. Complete sender premises / warehouse address.',
    width: 40,
  },
  {
    header: 'Pincode (Sender) *',
    key: 'from_pincode',
    section: 'FROM',
    required: true,
    sampleValue: '110001',
    description: 'Mandatory. 6-digit sender pincode.',
    width: 18,
  },
  {
    header: 'City (Sender) *',
    key: 'from_city',
    section: 'FROM',
    required: true,
    sampleValue: 'New Delhi',
    description: 'Mandatory. Sender city.',
    width: 20,
  },
  {
    header: 'State (Sender) *',
    key: 'from_state',
    section: 'FROM',
    required: true,
    sampleValue: 'Delhi',
    description: 'Mandatory. Sender state.',
    width: 22,
  },

  // ADDITIONAL FIELDS
  {
    header: 'Consignment / Tracking Number',
    key: 'tracking_number',
    section: 'ADDITIONAL',
    required: false,
    sampleValue: 'GT2610138625',
    description: 'Optional. Manual consignment tracking ID. Leave blank if none.',
    width: 30,
  },
  {
    header: 'Shipper Name',
    key: 'courier_company',
    section: 'ADDITIONAL',
    required: false,
    sampleValue: 'GEO TRANSIT',
    description: 'Optional. Shipper / courier company name (e.g. GEO TRANSIT).',
    width: 22,
  },
  {
    header: 'Print Size',
    key: 'print_size',
    section: 'ADDITIONAL',
    required: false,
    sampleValue: '4x6',
    description: 'Optional. Supported sizes: 4x6, 4x4, 4x2.5, 4x2, A4.',
    width: 18,
  },
];

export interface AddressPrintBatchRow {
  rowNumber: number; // 1-based Excel row number
  // TO
  to_name: string;
  to_contact_person: string;
  to_include_contact_person: boolean;
  to_country_code: string;
  to_mobile: string;
  to_mobile_full: string;
  to_address_line_1: string;
  to_pincode: string;
  to_city: string;
  to_state: string;
  // FROM
  from_name: string;
  from_contact_person: string;
  from_include_contact_person: boolean;
  from_country_code: string;
  from_mobile: string;
  from_mobile_full: string;
  from_address_line_1: string;
  from_pincode: string;
  from_city: string;
  from_state: string;
  // Multiple print
  multiple_print: number;
  // Additional
  tracking_number: string;
  courier_company: string;
  print_size: string;
  // Status
  errors: string[];
  isValid: boolean;
  isDuplicate?: boolean;
}

export interface AddressPrintBatchSummary {
  fileName: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  totalLabelsCount: number; // Sum of multiple_print for valid records
  rows: AddressPrintBatchRow[];
  hasErrors: boolean;
  missingRequiredColumns: string[];
}

/**
 * Generates and downloads the professional Address Print Excel Template (.xlsx)
 * with styled headers, distinct TO/FROM color palettes, sample data row,
 * frozen headers, column filters, data validations, and an Instructions sheet.
 */
export async function downloadAddressPrintExcelTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GEO TRANSIT Shipping Label Engine';
  workbook.created = new Date();

  // ----------------------------------------------------
  // SHEET 1: Address Labels
  // ----------------------------------------------------
  const sheet = workbook.addWorksheet('Address Labels', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }],
    properties: { defaultRowHeight: 22 },
  });

  sheet.columns = ADDRESS_PRINT_TEMPLATE_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style Header Row
  const headerRow = sheet.getRow(1);
  headerRow.height = 36;
  headerRow.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  ADDRESS_PRINT_TEMPLATE_COLUMNS.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    let fgColor = 'FF1E3A8A'; // Deep Navy Blue for TO

    if (col.section === 'FROM') {
      fgColor = 'FF334155'; // Dark Slate for FROM
    } else if (col.section === 'ADDITIONAL') {
      fgColor = 'FF0F766E'; // Deep Teal for Additional
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fgColor },
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Sample Data Row
  const sampleDataObj: Record<string, string | number> = {};
  ADDRESS_PRINT_TEMPLATE_COLUMNS.forEach((col) => {
    sampleDataObj[col.key] = col.sampleValue;
  });

  const sampleRow = sheet.addRow(sampleDataObj);
  sampleRow.height = 24;
  sampleRow.font = { name: 'Calibri', size: 10 };
  sampleRow.alignment = { vertical: 'middle', horizontal: 'left' };

  ADDRESS_PRINT_TEMPLATE_COLUMNS.forEach((col, index) => {
    const cell = sampleRow.getCell(index + 1);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    if (col.key === 'multiple_print' || col.key === 'to_pincode' || col.key === 'from_pincode') {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  // Enable AutoFilter on header + sample row
  sheet.autoFilter = {
    from: 'A1',
    to: `${String.fromCharCode(64 + ADDRESS_PRINT_TEMPLATE_COLUMNS.length)}2`,
  };

  // Add Excel Data Validations (Yes/No dropdowns, positive numbers, print size)
  for (let r = 2; r <= 500; r++) {
    // Col C: Include Contact Person on Label (Yes/No)
    sheet.getCell(`C${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Yes,No"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Selection',
      error: 'Please choose "Yes" or "No" from the dropdown.',
    };

    // Col J: Multiple Print (Positive integer between 1 and 100)
    sheet.getCell(`J${r}`).dataValidation = {
      type: 'whole',
      operator: 'between',
      allowBlank: true,
      formulae: [1, 100],
      showErrorMessage: true,
      errorTitle: 'Invalid Multiple Print',
      error: 'Multiple Print must be a positive whole number between 1 and 100.',
    };

    // Col M: Include Contact Person (Sender) (Yes/No)
    sheet.getCell(`M${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Yes,No"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Selection',
      error: 'Please choose "Yes" or "No" from the dropdown.',
    };

    // Col V: Print Size
    sheet.getCell(`V${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"4x6,4x4,4x2.5,4x2,A4"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Print Size',
      error: 'Select a valid size: 4x6, 4x4, 4x2.5, 4x2, or A4.',
    };
  }

  // ----------------------------------------------------
  // SHEET 2: Instructions
  // ----------------------------------------------------
  const instrSheet = workbook.addWorksheet('Instructions', {
    views: [{ state: 'normal' }],
  });

  instrSheet.columns = [
    { width: 32 },
    { width: 18 },
    { width: 14 },
    { width: 50 },
    { width: 24 },
  ];

  instrSheet.addRow(['GEO TRANSIT — ADDRESS PRINT EXCEL TEMPLATE INSTRUCTIONS']);
  const titleRow = instrSheet.getRow(1);
  titleRow.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF0F4C3A' } };
  titleRow.height = 28;

  instrSheet.addRow(['Follow the column guidelines below to populate recipient (TO) and sender (FROM) address details.']);
  instrSheet.getRow(2).font = { name: 'Calibri', italic: true, size: 10, color: { argb: 'FF475569' } };
  instrSheet.addRow([]);

  instrSheet.addRow(['Column Heading', 'Section', 'Required?', 'Format & Rules', 'Example']);
  const instrHeader = instrSheet.getRow(4);
  instrHeader.height = 26;
  instrHeader.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  instrHeader.alignment = { vertical: 'middle', horizontal: 'left' };

  for (let c = 1; c <= 5; c++) {
    instrHeader.getCell(c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F4C3A' },
    };
    instrHeader.getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  }

  ADDRESS_PRINT_TEMPLATE_COLUMNS.forEach((col) => {
    const row = instrSheet.addRow([
      col.header,
      col.section === 'TO' ? 'TO / CONSIGNEE' : col.section === 'FROM' ? 'FROM / CONSIGNOR' : 'ADDITIONAL',
      col.required ? 'MANDATORY' : 'OPTIONAL',
      col.description,
      String(col.sampleValue),
    ]);
    row.height = 22;
    row.font = { name: 'Calibri', size: 9.5 };
    row.alignment = { vertical: 'middle', horizontal: 'left' };

    const reqCell = row.getCell(3);
    reqCell.font = {
      name: 'Calibri',
      bold: true,
      size: 9.5,
      color: { argb: col.required ? 'FFDC2626' : 'FF059669' },
    };
  });

  instrSheet.addRow([]);
  instrSheet.addRow(['CRITICAL GUIDELINES:']);
  const critTitle = instrSheet.getRow(instrSheet.rowCount);
  critTitle.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF1E293B' } };

  const guidelines = [
    '1. Do not rename or delete any column headers in row 1 of the "Address Labels" worksheet.',
    '2. Mandatory fields marked with "*" must not be left blank.',
    '3. For Indian addresses (+91), Mobile Number must be exactly 10 digits and Pincode must be exactly 6 digits.',
    '4. Consignment / Tracking Number is strictly optional. If left blank, labels will be printed without auto-generated tracking numbers.',
    '5. Multiple Print defaults to 1. Set to a positive number (e.g. 2, 3) to print identical label copies for that row.',
    '6. Print Size defaults to the currently selected size in Address Print if left blank.',
  ];

  guidelines.forEach((g) => {
    const gRow = instrSheet.addRow([g]);
    gRow.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF334155' } };
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'address_print_template.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Normalizes header string for robust matching
 */
function normalizeColHeader(str: string): string {
  return str
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[()[\]{}_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps raw header text to canonical field key
 */
function mapHeaderToFieldKey(rawHeader: string): string | null {
  const norm = normalizeColHeader(rawHeader);

  // Distinguish TO vs FROM
  const isFrom = norm.includes('sender') || norm.includes('from') || norm.includes('consignor') || norm.includes('origin');
  
  if (norm.includes('tracking') || norm.includes('consignment')) return 'tracking_number';
  if (norm.includes('shipper') || norm.includes('courier')) return 'courier_company';
  if (norm.includes('print size') || norm === 'size') return 'print_size';
  if (norm.includes('multiple print') || norm.includes('print count') || norm.includes('copies') || norm === 'quantity' || norm === 'qty') {
    return 'multiple_print';
  }

  if (isFrom) {
    if (norm.includes('contact person') && (norm.includes('include') || norm.includes('yes/no') || norm.includes('yes no'))) {
      return 'from_include_contact_person';
    }
    if (norm.includes('contact person') || norm.includes('attn')) return 'from_contact_person';
    if (norm.includes('country code') || norm.includes('dial code')) return 'from_country_code';
    if (norm.includes('mobile') || norm.includes('phone') || norm.includes('contact no')) return 'from_mobile';
    if (norm.includes('address line 1') || norm.includes('address 1') || norm.includes('address')) return 'from_address_line_1';
    if (norm.includes('pincode') || norm.includes('pin code') || norm.includes('postal') || norm.includes('pin')) return 'from_pincode';
    if (norm.includes('city')) return 'from_city';
    if (norm.includes('state')) return 'from_state';
    if (norm.includes('name') || norm.includes('company')) return 'from_name';
  } else {
    // Default TO / Consignee
    if (norm.includes('contact person') && (norm.includes('include') || norm.includes('yes/no') || norm.includes('yes no'))) {
      return 'to_include_contact_person';
    }
    if (norm.includes('contact person') || norm.includes('attn')) return 'to_contact_person';
    if (norm.includes('country code') || norm.includes('dial code')) return 'to_country_code';
    if (norm.includes('mobile') || norm.includes('phone') || norm.includes('contact no')) return 'to_mobile';
    if (norm.includes('address line 1') || norm.includes('address 1') || norm.includes('address')) return 'to_address_line_1';
    if (norm.includes('pincode') || norm.includes('pin code') || norm.includes('postal') || norm.includes('pin')) return 'to_pincode';
    if (norm.includes('city')) return 'to_city';
    if (norm.includes('state')) return 'to_state';
    if (norm.includes('name') || norm.includes('recipient') || norm.includes('consignee') || norm.includes('company')) return 'to_name';
  }

  return null;
}

/**
 * Parses and validates an uploaded Address Print Excel file
 */
export async function parseAndValidateAddressPrintExcel(file: File): Promise<AddressPrintBatchSummary> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Look for 'Address Labels' sheet first, fallback to first worksheet
  let sheetName = workbook.SheetNames.find((name) =>
    name.toLowerCase().includes('address') || name.toLowerCase().includes('label')
  );
  if (!sheetName) {
    sheetName = workbook.SheetNames[0];
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error('Workbook contains no readable worksheets.');
  }

  // Convert to array of arrays
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    throw new Error('The uploaded file is empty or does not contain data rows beneath the header.');
  }

  const rawHeaderRow = rawRows[0];
  const colIndexToKeyMap: Record<number, string> = {};

  rawHeaderRow.forEach((col: any, idx: number) => {
    if (col !== undefined && col !== null && String(col).trim() !== '') {
      const fieldKey = mapHeaderToFieldKey(String(col));
      if (fieldKey) {
        colIndexToKeyMap[idx] = fieldKey;
      }
    }
  });

  // Verify presence of mandatory columns
  const requiredKeys = [
    { key: 'to_name', label: 'Recipient / Company Name' },
    { key: 'to_mobile', label: 'Mobile Number (TO)' },
    { key: 'to_address_line_1', label: 'Address Line 1 (TO)' },
    { key: 'to_pincode', label: 'Pincode (TO)' },
    { key: 'to_city', label: 'City (TO)' },
    { key: 'to_state', label: 'State (TO)' },
    { key: 'from_name', label: 'Sender / Company Name' },
    { key: 'from_mobile', label: 'Mobile Number (FROM)' },
    { key: 'from_address_line_1', label: 'Address Line 1 (FROM)' },
    { key: 'from_pincode', label: 'Pincode (FROM)' },
    { key: 'from_city', label: 'City (FROM)' },
    { key: 'from_state', label: 'State (FROM)' },
  ];

  const mappedKeys = new Set(Object.values(colIndexToKeyMap));
  const missingRequiredColumns: string[] = [];

  requiredKeys.forEach((req) => {
    if (!mappedKeys.has(req.key)) {
      missingRequiredColumns.push(req.label);
    }
  });

  const parsedBatchRows: AddressPrintBatchRow[] = [];
  const trackingNumberCounts = new Map<string, number>();

  // Parse each row (row 2 onwards, 1-based index)
  for (let r = 1; r < rawRows.length; r++) {
    const rowData = rawRows[r];
    // Check if entire row is blank
    const isAllBlank = rowData.every(
      (val: any) => val === undefined || val === null || String(val).trim() === ''
    );
    if (isAllBlank) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    Object.entries(colIndexToKeyMap).forEach(([idxStr, key]) => {
      const idx = Number(idxStr);
      rowObj[key] = rowData[idx] !== undefined && rowData[idx] !== null ? String(rowData[idx]).trim() : '';
    });

    const rowNumber = r + 1;
    const errors: string[] = [];

    // TO / CONSIGNEE FIELDS
    const to_name = rowObj['to_name'] || '';
    if (!to_name) errors.push('Recipient / Company Name is required.');

    const to_contact_person = rowObj['to_contact_person'] || '';
    const toIncRaw = (rowObj['to_include_contact_person'] || '').toLowerCase();
    const to_include_contact_person = toIncRaw === 'yes' || toIncRaw === 'true' || toIncRaw === '1' || toIncRaw === 'y';

    const to_country_code = rowObj['to_country_code'] || '+91';
    const to_mobile_raw = rowObj['to_mobile'] || '';
    const to_mobile_digits = to_mobile_raw.replace(/\D/g, '');
    const to_mobile_full = formatMobileWithCountry(to_country_code, to_mobile_raw);

    if (!to_mobile_raw) {
      errors.push('TO Mobile Number is required.');
    } else if (to_country_code.includes('91') && to_mobile_digits.length !== 10) {
      errors.push(`TO Mobile (${to_mobile_raw}) must be exactly 10 digits for India.`);
    } else if (to_mobile_digits.length < 5) {
      errors.push(`TO Mobile number is too short.`);
    }

    const to_address_line_1 = rowObj['to_address_line_1'] || '';
    if (!to_address_line_1) errors.push('TO Address Line 1 is required.');

    const to_pincode = rowObj['to_pincode'] || '';
    const to_pincode_clean = to_pincode.replace(/\D/g, '');
    if (!to_pincode) {
      errors.push('TO Pincode is required.');
    } else if (to_country_code.includes('91') && to_pincode_clean.length !== 6) {
      errors.push(`TO Pincode (${to_pincode}) must be exactly 6 digits.`);
    }

    const to_city = rowObj['to_city'] || '';
    if (!to_city) errors.push('TO City is required.');

    const to_state = rowObj['to_state'] || '';
    if (!to_state) errors.push('TO State is required.');

    // Multiple Print
    let multiple_print = 1;
    const rawMulti = rowObj['multiple_print'];
    if (rawMulti !== undefined && rawMulti !== '') {
      const parsedMulti = parseInt(String(rawMulti), 10);
      if (isNaN(parsedMulti) || parsedMulti < 1) {
        errors.push('Multiple Print must be a positive whole number (min 1).');
      } else if (parsedMulti > 100) {
        errors.push('Multiple Print cannot exceed 100 copies.');
      } else {
        multiple_print = parsedMulti;
      }
    }

    // FROM / CONSIGNOR FIELDS
    const from_name = rowObj['from_name'] || '';
    if (!from_name) errors.push('Sender / Company Name is required.');

    const from_contact_person = rowObj['from_contact_person'] || '';
    const fromIncRaw = (rowObj['from_include_contact_person'] || '').toLowerCase();
    const from_include_contact_person = fromIncRaw === 'yes' || fromIncRaw === 'true' || fromIncRaw === '1' || fromIncRaw === 'y';

    const from_country_code = rowObj['from_country_code'] || '+91';
    const from_mobile_raw = rowObj['from_mobile'] || '';
    const from_mobile_digits = from_mobile_raw.replace(/\D/g, '');
    const from_mobile_full = formatMobileWithCountry(from_country_code, from_mobile_raw);

    if (!from_mobile_raw) {
      errors.push('FROM Mobile Number is required.');
    } else if (from_country_code.includes('91') && from_mobile_digits.length !== 10) {
      errors.push(`FROM Mobile (${from_mobile_raw}) must be exactly 10 digits for India.`);
    } else if (from_mobile_digits.length < 5) {
      errors.push(`FROM Mobile number is too short.`);
    }

    const from_address_line_1 = rowObj['from_address_line_1'] || '';
    if (!from_address_line_1) errors.push('FROM Address Line 1 is required.');

    const from_pincode = rowObj['from_pincode'] || '';
    const from_pincode_clean = from_pincode.replace(/\D/g, '');
    if (!from_pincode) {
      errors.push('FROM Pincode is required.');
    } else if (from_country_code.includes('91') && from_pincode_clean.length !== 6) {
      errors.push(`FROM Pincode (${from_pincode}) must be exactly 6 digits.`);
    }

    const from_city = rowObj['from_city'] || '';
    if (!from_city) errors.push('FROM City is required.');

    const from_state = rowObj['from_state'] || '';
    if (!from_state) errors.push('FROM State is required.');

    // ADDITIONAL FIELDS
    const tracking_number = (rowObj['tracking_number'] || '').toUpperCase().trim();
    if (tracking_number) {
      const prevCount = trackingNumberCounts.get(tracking_number) || 0;
      trackingNumberCounts.set(tracking_number, prevCount + 1);
      if (prevCount > 0) {
        errors.push(`Duplicate Tracking Number "${tracking_number}" in file.`);
      }
    }

    const courier_company = rowObj['courier_company'] || '';
    const print_size = (rowObj['print_size'] || '').toLowerCase();

    parsedBatchRows.push({
      rowNumber,
      to_name,
      to_contact_person,
      to_include_contact_person,
      to_country_code,
      to_mobile: to_mobile_raw,
      to_mobile_full,
      to_address_line_1,
      to_pincode,
      to_city,
      to_state,
      from_name,
      from_contact_person,
      from_include_contact_person,
      from_country_code,
      from_mobile: from_mobile_raw,
      from_mobile_full,
      from_address_line_1,
      from_pincode,
      from_city,
      from_state,
      multiple_print,
      tracking_number,
      courier_company,
      print_size,
      errors,
      isValid: errors.length === 0,
    });
  }

  const validRecords = parsedBatchRows.filter((r) => r.isValid).length;
  const invalidRecords = parsedBatchRows.filter((r) => !r.isValid).length;
  const totalLabelsCount = parsedBatchRows
    .filter((r) => r.isValid)
    .reduce((sum, r) => sum + r.multiple_print, 0);

  return {
    fileName: file.name,
    totalRecords: parsedBatchRows.length,
    validRecords,
    invalidRecords,
    totalLabelsCount,
    rows: parsedBatchRows,
    hasErrors: invalidRecords > 0 || missingRequiredColumns.length > 0,
    missingRequiredColumns,
  };
}
