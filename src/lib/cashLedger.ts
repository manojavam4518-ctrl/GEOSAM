import { prisma } from './prisma';

export type LedgerFieldType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'CURRENCY'
  | 'DATE'
  | 'MONTH'
  | 'DROPDOWN'
  | 'MULTIPLE_CHOICE'
  | 'CHECKBOX'
  | 'YES_NO'
  | 'EMAIL'
  | 'PHONE';

export interface LedgerFieldConfig {
  id: string;
  key: string; // Stable machine-safe key (e.g. "customer_type")
  name: string; // Display label (e.g. "Customer Type")
  type: LedgerFieldType;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // Dropdown, Multiple Choice, Checkbox options
  order: number;
  active: boolean; // Active in ledger [ON/OFF]
  width?: number; // Spreadsheets column width in pixels
  placeholder?: string;
  currencySymbol?: string; // Default: '₹'
  decimalPlaces?: number; // Default: 2
  dateFormat?: string; // Default: 'DD/MM/YYYY'
  monthFormat?: string; // Default: 'MMMM_YYYY'
  isSystem?: boolean;
  calcRole?: 'NONE' | 'CASH_IN' | 'CASH_OUT' | 'BANK_DEPOSIT' | 'BALANCE';
}

/**
 * Backward compatibility interface for previous column structure
 */
export interface LedgerColumnConfig extends LedgerFieldConfig {
  enabled?: boolean;
  isCalculation?: boolean;
}

/**
 * EXACT reference fields from the Sales Payment Collection Ledger specification:
 * 1. Invoice Month (MONTH, Required: YES, format: MMMM_YYYY)
 * 2. Customer Type (DROPDOWN, Required: YES, options: CREDIT CUSTOMER, CASH CUSTOMER)
 * 3. Customer Name (SHORT TEXT, Required: YES)
 * 4. Invoice Number (SHORT TEXT, Required: YES)
 * 5. Total Invoice Amount (CURRENCY, Required: YES, INR, 2 decimals)
 * 6. Payment Received Mode (DROPDOWN, Required: NO, 8 exact options)
 * 7. Cheque Clearance Status (DROPDOWN, Required: NO, 3 exact options)
 */
export const REFERENCE_LEDGER_FIELDS: LedgerFieldConfig[] = [
  {
    id: 'fld_invoice_month',
    key: 'invoice_month',
    name: 'Invoice Month',
    type: 'MONTH',
    required: true,
    defaultValue: getCurrentMonthYearString(),
    monthFormat: 'MMMM_YYYY',
    order: 0,
    active: true,
    width: 160,
  },
  {
    id: 'fld_customer_type',
    key: 'customer_type',
    name: 'Customer Type',
    type: 'DROPDOWN',
    required: true,
    defaultValue: 'CREDIT CUSTOMER',
    options: ['CREDIT CUSTOMER', 'CASH CUSTOMER'],
    order: 1,
    active: true,
    width: 170,
  },
  {
    id: 'fld_customer_name',
    key: 'customer_name',
    name: 'Customer Name',
    type: 'SHORT_TEXT',
    required: true,
    defaultValue: '',
    order: 2,
    active: true,
    width: 220,
    placeholder: 'Enter customer / client name',
  },
  {
    id: 'fld_invoice_number',
    key: 'invoice_number',
    name: 'Invoice Number',
    type: 'SHORT_TEXT',
    required: true,
    defaultValue: '',
    order: 3,
    active: true,
    width: 170,
    placeholder: 'e.g. GIN2600016',
  },
  {
    id: 'fld_total_invoice_amount',
    key: 'total_invoice_amount',
    name: 'Total Invoice Amount',
    type: 'CURRENCY',
    required: true,
    defaultValue: '',
    currencySymbol: '₹',
    decimalPlaces: 2,
    order: 4,
    active: true,
    width: 180,
    calcRole: 'CASH_IN',
  },
  {
    id: 'fld_payment_received_mode',
    key: 'payment_received_mode',
    name: 'Payment Received Mode',
    type: 'DROPDOWN',
    required: false,
    defaultValue: '',
    options: [
      'CHEQUE',
      'NEFT/IMPS',
      'DIGITAL PAYMENTS',
      'DTDC WALLET',
      'CASH',
      'PARTIAL PAYMENT',
      'ADJUSTMENT',
      'CONSOLIDATED',
    ],
    order: 5,
    active: true,
    width: 210,
  },
  {
    id: 'fld_cheque_clearance_status',
    key: 'cheque_clearance_status',
    name: 'Cheque Clearance Status',
    type: 'DROPDOWN',
    required: false,
    defaultValue: '',
    options: ['CREDITED', 'CHEQUE BOUNCE', 'PENDING'],
    order: 6,
    active: true,
    width: 190,
  },
];

export const DEFAULT_LEDGER_COLUMNS: LedgerColumnConfig[] = REFERENCE_LEDGER_FIELDS.map((f) => ({
  ...f,
  enabled: f.active,
  isCalculation: f.calcRole === 'CASH_IN' || f.calcRole === 'CASH_OUT' || f.calcRole === 'BANK_DEPOSIT',
}));

/**
 * Helper to get current Month_Year string (e.g. "APRIL_2026")
 */
export function getCurrentMonthYearString(d: Date = new Date()): string {
  const months = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  return `${months[d.getMonth()]}_${d.getFullYear()}`;
}

/**
 * Generates selectable Month_Year options for standard month pickers
 */
export function generateMonthYearOptions(centerYear: number = new Date().getFullYear()): string[] {
  const months = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  const list: string[] = [];
  for (let y = centerYear - 2; y <= centerYear + 2; y++) {
    for (const m of months) {
      list.push(`${m}_${y}`);
    }
  }
  return list;
}

/**
 * Normalizes any legacy or imported field object to standard LedgerFieldConfig.
 */
export function normalizeFieldConfig(raw: any, index: number): LedgerFieldConfig {
  const typeMap: Record<string, LedgerFieldType> = {
    TEXT: 'SHORT_TEXT',
    SHORT_TEXT: 'SHORT_TEXT',
    LONG_TEXT: 'LONG_TEXT',
    NUMBER: 'NUMBER',
    CURRENCY: 'CURRENCY',
    DATE: 'DATE',
    MONTH: 'MONTH',
    SELECT: 'DROPDOWN',
    DROPDOWN: 'DROPDOWN',
    RADIO: 'MULTIPLE_CHOICE',
    MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
    CHECKBOX: 'CHECKBOX',
    YES_NO: 'YES_NO',
    EMAIL: 'EMAIL',
    PHONE: 'PHONE',
    PHONE_NUMBER: 'PHONE',
  };

  const rawType = String(raw.type || 'SHORT_TEXT').toUpperCase();
  const normalizedType: LedgerFieldType = typeMap[rawType] || 'SHORT_TEXT';

  let options: string[] = [];
  if (Array.isArray(raw.options)) {
    options = raw.options
      .map((opt: any) => (typeof opt === 'string' ? opt.trim() : String(opt?.label || opt?.value || '').trim()))
      .filter(Boolean);
  }

  // Preserve stable machine key or generate clean snake_case from name/id
  let key = raw.key ? String(raw.key).trim() : '';
  if (!key) {
    key = String(raw.name || `field_${index}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  return {
    id: String(raw.id || `fld_${Date.now()}_${index}`),
    key,
    name: String(raw.name || 'Untitled Field').trim(),
    type: normalizedType,
    required: Boolean(raw.required),
    defaultValue: raw.defaultValue !== undefined ? raw.defaultValue : '',
    options,
    order: typeof raw.order === 'number' ? raw.order : index,
    active: raw.active !== undefined ? Boolean(raw.active) : raw.enabled !== undefined ? Boolean(raw.enabled) : true,
    width: typeof raw.width === 'number' ? raw.width : 160,
    placeholder: raw.placeholder ? String(raw.placeholder).trim() : '',
    currencySymbol: raw.currencySymbol || '₹',
    decimalPlaces: typeof raw.decimalPlaces === 'number' ? raw.decimalPlaces : 2,
    dateFormat: raw.dateFormat || 'DD/MM/YYYY',
    monthFormat: raw.monthFormat || 'MMMM_YYYY',
    isSystem: Boolean(raw.isSystem),
    calcRole: raw.calcRole || 'NONE',
  };
}

/**
 * Retrieves the global Super Admin master configuration.
 * Creates it with reference defaults if not yet present in the database.
 */
export async function getPlatformLedgerConfig(): Promise<{
  id: string;
  key: string;
  name: string;
  fields: LedgerFieldConfig[];
  updatedAt: Date;
}> {
  let master = await (prisma as any).platformLedgerConfig.findUnique({
    where: { key: 'COUNTER_CASH_LEDGER' },
  });

  if (!master) {
    master = await (prisma as any).platformLedgerConfig.create({
      data: {
        key: 'COUNTER_CASH_LEDGER',
        name: 'Counter Cash Ledger',
        fields: REFERENCE_LEDGER_FIELDS,
      },
    });
  }

  let fields: LedgerFieldConfig[] = [];
  if (Array.isArray(master.fields) && master.fields.length > 0) {
    fields = master.fields.map(normalizeFieldConfig);
  } else {
    fields = REFERENCE_LEDGER_FIELDS;
  }

  fields.sort((a, b) => a.order - b.order);

  return {
    id: master.id,
    key: master.key,
    name: master.name,
    fields,
    updatedAt: master.updatedAt,
  };
}

/**
 * Returns ledger column configuration for a specific organization.
 * Falls back to the Super Admin platform template.
 */
export async function getOrganizationLedgerConfig(organizationId: string) {
  const orgConfig = await (prisma as any).cashLedgerConfig.findUnique({
    where: { organizationId },
  });

  const platformConfig = await getPlatformLedgerConfig();

  let fields: LedgerFieldConfig[] = platformConfig.fields;
  let initialCashInHand = 0.0;

  if (orgConfig) {
    initialCashInHand = orgConfig.initialCashInHand || 0.0;
    if (Array.isArray(orgConfig.columns) && orgConfig.columns.length > 0) {
      fields = orgConfig.columns.map(normalizeFieldConfig);
    }
  }

  fields.sort((a, b) => a.order - b.order);

  return {
    id: orgConfig?.id || platformConfig.id,
    organizationId,
    columns: fields,
    fields,
    initialCashInHand,
    updatedAt: orgConfig?.updatedAt || platformConfig.updatedAt,
  };
}

/**
 * Seamlessly maps existing and historical row data to support both
 * snake_case and camelCase keys without losing any historical data.
 */
export function extractRowFieldValue(data: Record<string, any>, entry: any, fieldKey: string): any {
  if (!data && !entry) return '';

  // 1. Direct match on data
  if (data && data[fieldKey] !== undefined && data[fieldKey] !== null) {
    return data[fieldKey];
  }

  // 2. camelCase equivalent of fieldKey (e.g. invoice_month -> invoiceMonth)
  const camelKey = fieldKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  if (data && data[camelKey] !== undefined && data[camelKey] !== null) {
    return data[camelKey];
  }

  // 3. snake_case equivalent of fieldKey
  const snakeKey = fieldKey.replace(/([A-Z])/g, '_$1').toLowerCase();
  if (data && data[snakeKey] !== undefined && data[snakeKey] !== null) {
    return data[snakeKey];
  }

  // 4. Fallback mappings to root database fields on entry (for legacy entries)
  if (fieldKey === 'invoice_month' || fieldKey === 'invoiceMonth') {
    if (entry.date) {
      const d = new Date(entry.date);
      if (!isNaN(d.getTime())) return getCurrentMonthYearString(d);
    }
  }

  if (fieldKey === 'customer_name' || fieldKey === 'customerName') {
    return entry.receivedFrom || '';
  }

  if (fieldKey === 'invoice_number' || fieldKey === 'invoiceNumber') {
    return entry.purpose || '';
  }

  if (fieldKey === 'total_invoice_amount' || fieldKey === 'totalInvoiceAmount') {
    if (entry.cashReceived !== undefined && entry.cashReceived !== null && entry.cashReceived > 0) {
      return entry.cashReceived;
    }
  }

  if (fieldKey === 'customer_type' || fieldKey === 'customerType') {
    return 'CREDIT CUSTOMER';
  }

  return '';
}

/**
 * Backend validation for a ledger row submission against configured fields.
 * Validates required constraints and data formats.
 */
export function validateLedgerEntryData(
  entryData: Record<string, any>,
  fields: LedgerFieldConfig[]
): { valid: boolean; error?: string } {
  for (const field of fields) {
    if (!field.active) continue;

    // Check value using key or camelCase key
    const val = extractRowFieldValue(entryData, entryData, field.key);

    if (field.required) {
      if (val === undefined || val === null || val === '') {
        return {
          valid: false,
          error: `Field "${field.name}" is required. Please provide a value.`,
        };
      }
      if (Array.isArray(val) && val.length === 0) {
        return {
          valid: false,
          error: `Field "${field.name}" requires at least one selection.`,
        };
      }
    }

    if (val !== undefined && val !== null && val !== '') {
      if (field.type === 'NUMBER' || field.type === 'CURRENCY') {
        const num = Number(val);
        if (isNaN(num)) {
          return {
            valid: false,
            error: `Field "${field.name}" must be a valid number.`,
          };
        }
      } else if (field.type === 'EMAIL') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(val).trim())) {
          return {
            valid: false,
            error: `Field "${field.name}" must be a valid email address.`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Calculates running balances and financial summaries for spreadsheet rows.
 */
export function calculateLedgerBalances(
  entries: any[],
  fields: LedgerFieldConfig[] = REFERENCE_LEDGER_FIELDS,
  initialCash: number = 0
) {
  let running = Number(initialCash) || 0;
  let totalCashReceived = 0;
  let totalPaidAmount = 0;
  let totalBankDeposit = 0;
  let totalInvoiceAmount = 0;

  const modeTotals: Record<string, number> = {};

  const computedEntries = entries.map((entry) => {
    const rawData = entry.data || entry.customFields || {};

    // Standardize all configured fields on data object
    const normalizedData: Record<string, any> = { ...rawData };
    fields.forEach((f) => {
      normalizedData[f.key] = extractRowFieldValue(rawData, entry, f.key);
    });

    const invoiceAmt = Number(normalizedData.total_invoice_amount ?? normalizedData.totalInvoiceAmount ?? 0) || 0;
    const received = Number(entry.cashReceived ?? (invoiceAmt > 0 ? invoiceAmt : 0)) || 0;
    const paid = Number(entry.paidAmount ?? 0) || 0;
    const deposit = Number(entry.bankDeposit ?? 0) || 0;

    totalInvoiceAmount += invoiceAmt;
    totalCashReceived += received;
    totalPaidAmount += paid;
    totalBankDeposit += deposit;

    running = running + received - paid - deposit;

    const mode =
      normalizedData.payment_received_mode ||
      normalizedData.paymentReceivedMode ||
      entry.paymentReceivedMode ||
      '';
    if (mode) {
      const modeKey = String(mode).toUpperCase();
      modeTotals[modeKey] = (modeTotals[modeKey] || 0) + (invoiceAmt || received);
    }

    return {
      ...entry,
      data: normalizedData,
      cashInHand: running,
    };
  });

  return {
    entries: computedEntries,
    summary: {
      initialCashInHand: Number(initialCash) || 0,
      totalCashReceived: totalCashReceived || totalInvoiceAmount,
      totalInvoiceAmount,
      totalPaidAmount,
      totalBankDeposit,
      currentCashInHand: running,
      netChange: totalCashReceived - totalPaidAmount - totalBankDeposit,
      entryCount: entries.length,
      modeTotals,
    },
  };
}
