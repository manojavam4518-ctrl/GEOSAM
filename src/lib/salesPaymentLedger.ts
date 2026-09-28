import { prisma } from './prisma';

export const SALES_PAYMENT_LEDGER_MODULE_KEY = 'SALES_PAYMENT_COLLECTION_LEDGER';

export type SalesPaymentFieldType =
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

export interface SalesPaymentFieldConfig {
  id: string;
  key: string; // Stable machine-safe key (e.g. "customer_type")
  name: string; // Display label (e.g. "Customer Type")
  type: SalesPaymentFieldType;
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
  includeInTotal?: boolean; // If true, numeric / currency column is aggregated in ledger totals
}

/**
 * EXACT REFERENCE FIELDS from Google Sheets "SALES PAYMENT COLLECTION LEDGER"
 */
export const REFERENCE_SALES_PAYMENT_FIELDS: SalesPaymentFieldConfig[] = [
  {
    id: 'spf_invoice_month',
    key: 'invoice_month',
    name: 'Invoice Month',
    type: 'MONTH',
    required: true,
    defaultValue: '',
    monthFormat: 'MMMM_YYYY',
    order: 0,
    active: true,
    width: 170,
    placeholder: 'e.g. APRIL_2026',
  },
  {
    id: 'spf_customer_type',
    key: 'customer_type',
    name: 'Customer Type',
    type: 'DROPDOWN',
    required: true,
    defaultValue: '',
    options: ['CREDIT CUSTOMER', 'CASH CUSTOMER'],
    order: 1,
    active: true,
    width: 180,
  },
  {
    id: 'spf_customer_name',
    key: 'customer_name',
    name: 'Customer Name',
    type: 'SHORT_TEXT',
    required: true,
    defaultValue: '',
    order: 2,
    active: true,
    width: 260,
    placeholder: 'e.g. INHAWK IT SOLUTIONS PVT LTD',
  },
  {
    id: 'spf_invoice_number',
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
    id: 'spf_total_invoice_amount',
    key: 'total_invoice_amount',
    name: 'Total Invoice Amount',
    type: 'CURRENCY',
    required: true,
    defaultValue: '',
    currencySymbol: '₹',
    decimalPlaces: 2,
    order: 4,
    active: true,
    width: 190,
    includeInTotal: true,
  },
  {
    id: 'spf_payment_received_mode',
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
    width: 220,
  },
  {
    id: 'spf_cheque_clearance_status',
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

/**
 * Returns current Month_Year string (e.g. "APRIL_2026")
 */
export function getCurrentMonthYearString(d: Date = new Date()): string {
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  ];
  return `${months[d.getMonth()]}_${d.getFullYear()}`;
}

/**
 * Generates selectable Month_Year options
 */
export function generateMonthYearOptions(centerYear: number = new Date().getFullYear()): string[] {
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
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
 * Normalizes field definitions to standard SalesPaymentFieldConfig
 */
export function normalizeSalesPaymentField(raw: any, index: number): SalesPaymentFieldConfig {
  const typeMap: Record<string, SalesPaymentFieldType> = {
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
  const normalizedType: SalesPaymentFieldType = typeMap[rawType] || 'SHORT_TEXT';

  let options: string[] = [];
  if (Array.isArray(raw.options)) {
    options = raw.options
      .map((opt: any) => (typeof opt === 'string' ? opt.trim() : String(opt?.label || opt?.value || '').trim()))
      .filter(Boolean);
  }

  let key = raw.key ? String(raw.key).trim() : '';
  if (!key) {
    key = String(raw.name || `col_${index}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Include in total: true by default for Total Invoice Amount, configurable for other currency/number fields
  const includeInTotal =
    raw.includeInTotal !== undefined
      ? Boolean(raw.includeInTotal)
      : key === 'total_invoice_amount';

  return {
    id: String(raw.id || `spf_${Date.now()}_${index}`),
    key,
    name: String(raw.name || 'Untitled Column').trim(),
    type: normalizedType,
    required: Boolean(raw.required),
    defaultValue: raw.defaultValue !== undefined ? raw.defaultValue : '',
    options,
    order: typeof raw.order === 'number' ? raw.order : index,
    active: raw.active !== undefined ? Boolean(raw.active) : true,
    width: typeof raw.width === 'number' ? raw.width : 170,
    placeholder: raw.placeholder ? String(raw.placeholder).trim() : '',
    currencySymbol: raw.currencySymbol || '₹',
    decimalPlaces: typeof raw.decimalPlaces === 'number' ? raw.decimalPlaces : 2,
    dateFormat: raw.dateFormat || 'DD/MM/YYYY',
    monthFormat: raw.monthFormat || 'MMMM_YYYY',
    includeInTotal,
  };
}

/**
 * Returns ledger column configuration for a specific organization.
 * Maintains complete multi-tenant organization isolation.
 */
export async function getOrganizationSalesPaymentLedgerConfig(organizationId: string) {
  const orgConfig = await (prisma as any).salesPaymentLedgerConfig.findUnique({
    where: { organizationId },
  });

  let fields: SalesPaymentFieldConfig[] = REFERENCE_SALES_PAYMENT_FIELDS;

  if (orgConfig && Array.isArray(orgConfig.columns) && orgConfig.columns.length > 0) {
    fields = orgConfig.columns.map(normalizeSalesPaymentField);
  }

  fields.sort((a, b) => a.order - b.order);

  return {
    id: orgConfig?.id || `default_${organizationId}`,
    organizationId,
    columns: fields,
    fields,
    updatedAt: orgConfig?.updatedAt || new Date(),
  };
}

/**
 * Extracts cell value checking dynamic data map and root database fields
 */
export function extractSalesPaymentRowValue(data: Record<string, any>, entry: any, fieldKey: string): any {
  if (!data && !entry) return '';

  // 1. Exact key match in data
  if (data && data[fieldKey] !== undefined && data[fieldKey] !== null) {
    return data[fieldKey];
  }

  // 2. camelCase key in data
  const camelKey = fieldKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  if (data && data[camelKey] !== undefined && data[camelKey] !== null) {
    return data[camelKey];
  }

  // 3. Root database fields on entry
  if (entry) {
    if (fieldKey === 'invoice_month' && entry.invoiceMonth !== undefined) return entry.invoiceMonth;
    if (fieldKey === 'customer_type' && entry.customerType !== undefined) return entry.customerType;
    if (fieldKey === 'customer_name' && entry.customerName !== undefined) return entry.customerName;
    if (fieldKey === 'invoice_number' && entry.invoiceNumber !== undefined) return entry.invoiceNumber;
    if (fieldKey === 'total_invoice_amount' && entry.totalInvoiceAmount !== undefined) return entry.totalInvoiceAmount;
    if (fieldKey === 'payment_received_mode' && entry.paymentReceivedMode !== undefined) return entry.paymentReceivedMode;
    if (fieldKey === 'cheque_clearance_status' && entry.chequeClearanceStatus !== undefined) return entry.chequeClearanceStatus;
  }

  return '';
}

/**
 * Backend validator enforcing required fields
 */
export function validateSalesPaymentEntryData(
  data: Record<string, any>,
  fields: SalesPaymentFieldConfig[]
): { valid: boolean; error?: string } {
  const activeRequiredFields = fields.filter((f) => f.active !== false && f.required === true);

  for (const field of activeRequiredFields) {
    const val = extractSalesPaymentRowValue(data, data, field.key);

    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      return {
        valid: false,
        error: `Required field missing: "${field.name}". Please complete all required columns before saving.`,
      };
    }

    if (field.type === 'CURRENCY' || field.type === 'NUMBER') {
      const num = Number(val);
      if (isNaN(num)) {
        return {
          valid: false,
          error: `Invalid numeric value for "${field.name}".`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Calculates totals and breakdown aggregations from filtered records
 */
export function calculateSalesPaymentLedgerTotals(
  entries: any[],
  fields: SalesPaymentFieldConfig[]
): {
  recordCount: number;
  totalInvoiceAmount: number;
  columnTotals: Record<string, number>;
  modeTotals: Record<string, number>;
  modeCounts: Record<string, number>;
} {
  let totalInvoiceAmount = 0;
  const columnTotals: Record<string, number> = {};
  const modeTotals: Record<string, number> = {};
  const modeCounts: Record<string, number> = {};

  const totalableFields = fields.filter(
    (f) => f.includeInTotal && (f.type === 'CURRENCY' || f.type === 'NUMBER')
  );

  totalableFields.forEach((f) => {
    columnTotals[f.key] = 0;
  });

  for (const entry of entries) {
    const rowData = entry.data || entry;

    // Grand Total Invoice Amount
    const amountVal = Number(extractSalesPaymentRowValue(rowData, entry, 'total_invoice_amount')) || 0;
    totalInvoiceAmount += amountVal;

    // Individual configured totalable columns
    totalableFields.forEach((f) => {
      const v = Number(extractSalesPaymentRowValue(rowData, entry, f.key)) || 0;
      columnTotals[f.key] = (columnTotals[f.key] || 0) + v;
    });

    // Payment Mode breakdown
    const mode = String(extractSalesPaymentRowValue(rowData, entry, 'payment_received_mode') || 'UNSPECIFIED').toUpperCase();
    if (mode) {
      modeTotals[mode] = (modeTotals[mode] || 0) + amountVal;
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    }
  }

  return {
    recordCount: entries.length,
    totalInvoiceAmount: Math.round(totalInvoiceAmount * 100) / 100,
    columnTotals,
    modeTotals,
    modeCounts,
  };
}
