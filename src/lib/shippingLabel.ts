import { prisma } from './prisma';

export const SHIPPING_LABEL_MODULE_KEY = 'SHIPPING_LABEL_GENERATOR';

export type LabelFieldType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'CURRENCY'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'DROPDOWN'
  | 'QR_CODE'
  | 'BARCODE'
  | 'IMAGE'
  | 'FIXED_TEXT';

export type LabelSection =
  | 'HEADER'
  | 'SHIP_TO'
  | 'SERVICE'
  | 'PAYMENT'
  | 'BARCODE_TRACKING'
  | 'ROUTING'
  | 'FOOTER';

export interface ShippingLabelFieldConfig {
  id: string;
  name: string;
  key: string;
  type: LabelFieldType;
  required: boolean;
  visible: boolean;
  section: LabelSection;
  order: number;
  options?: string[];
  defaultValue?: string | number | boolean;
  fontSize?: number; // in pt/px
  alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
  placeholder?: string;
  helpText?: string;
  isProtected?: boolean; // If true, cannot be removed by basic users
}

export interface ShippingLabelQrConfig {
  enabled: boolean;
  sourceField: 'tracking_number' | 'shipment_id' | 'combined' | 'custom_url';
  customUrl?: string;
  size: number; // in mm or px
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface ShippingLabelBarcodeConfig {
  enabled: boolean;
  type: 'CODE128' | 'CODE39' | 'EAN13';
  sourceField: 'tracking_number' | 'custom_value';
  showValue: boolean;
  height: number; // in mm or px
}

export interface ShippingLabelTemplateData {
  id?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  version: number;
  sizePreset: '4x6' | 'A6' | 'CUSTOM';
  widthInches: number;
  heightInches: number;
  widthMm: number;
  heightMm: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  logoUrl?: string;
  logoPosition: 'TOP_RIGHT' | 'TOP_LEFT' | 'TOP_CENTER';
  logoWidth: number;
  logoHeight: number;
  headerText?: string;
  footerText?: string;
  borderStyle: 'SOLID' | 'THICK' | 'NONE';
  qrConfig: ShippingLabelQrConfig;
  barcodeConfig: ShippingLabelBarcodeConfig;
  fields: ShippingLabelFieldConfig[];
}

export const DEFAULT_GEO_TRANSIT_LOGO =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 75" width="280" height="75"><rect width="280" height="75" rx="10" fill="%230F4C3A"/><rect x="12" y="14" width="46" height="46" rx="9" fill="%231E8262"/><path d="M25 45V30h20v6h-13v4h11v5h-11v6z" fill="%23FFFFFF"/><text x="70" y="38" font-family="Arial,sans-serif" font-weight="900" font-size="24" fill="%23FFFFFF" letter-spacing="1">GEO TRANSIT</text><text x="72" y="55" font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="%23A7F3D0" letter-spacing="2">EXPRESS LOGISTICS</text></svg>';

export const DEFAULT_SHIPPING_LABEL_FIELDS: ShippingLabelFieldConfig[] = [
  // 1. RECIPIENT SECTION (SHIP TO:)
  {
    id: 'f_recip_name',
    name: 'Recipient Name',
    key: 'recipient_name',
    type: 'SHORT_TEXT',
    required: true,
    visible: true,
    section: 'SHIP_TO',
    order: 1,
    fontSize: 12,
    alignment: 'LEFT',
    placeholder: 'e.g. Ramesh Kumar / ABC Enterprises',
    isProtected: true,
  },
  {
    id: 'f_addr1',
    name: 'Address Line 1',
    key: 'address_line_1',
    type: 'SHORT_TEXT',
    required: true,
    visible: true,
    section: 'SHIP_TO',
    order: 2,
    fontSize: 10,
    alignment: 'LEFT',
    placeholder: 'Plot No. 45, Industrial Area Phase II',
  },
  {
    id: 'f_addr2',
    name: 'Address Line 2',
    key: 'address_line_2',
    type: 'SHORT_TEXT',
    required: false,
    visible: true,
    section: 'SHIP_TO',
    order: 3,
    fontSize: 10,
    alignment: 'LEFT',
    placeholder: 'Near Central Warehousing Complex',
  },
  {
    id: 'f_city',
    name: 'City',
    key: 'city',
    type: 'SHORT_TEXT',
    required: true,
    visible: true,
    section: 'SHIP_TO',
    order: 4,
    fontSize: 10,
    alignment: 'LEFT',
    placeholder: 'Mumbai',
  },
  {
    id: 'f_state',
    name: 'State',
    key: 'state',
    type: 'SHORT_TEXT',
    required: true,
    visible: true,
    section: 'SHIP_TO',
    order: 5,
    fontSize: 10,
    alignment: 'LEFT',
    placeholder: 'Maharashtra',
  },
  {
    id: 'f_pincode',
    name: 'Pincode',
    key: 'pincode',
    type: 'SHORT_TEXT',
    required: true,
    visible: true,
    section: 'SHIP_TO',
    order: 6,
    fontSize: 11,
    alignment: 'LEFT',
    placeholder: '400001',
  },
  {
    id: 'f_mobile',
    name: 'Mobile Number',
    key: 'mobile',
    type: 'SHORT_TEXT',
    required: true,
    visible: true,
    section: 'SHIP_TO',
    order: 7,
    fontSize: 11,
    alignment: 'LEFT',
    placeholder: '+91 9876543210',
  },

  // 2. SERVICE INFORMATION
  {
    id: 'f_service',
    name: 'Service',
    key: 'service',
    type: 'DROPDOWN',
    required: false,
    visible: true,
    section: 'SERVICE',
    order: 8,
    options: ['LITE', 'CARGO', 'EXPRESS', 'STANDARD'],
    defaultValue: 'LITE',
  },
  {
    id: 'f_service_type',
    name: 'Service Type',
    key: 'service_type',
    type: 'DROPDOWN',
    required: false,
    visible: true,
    section: 'SERVICE',
    order: 9,
    options: ['STD EXP-A', 'PRIORITY', 'ECONOMY', 'SAME DAY'],
    defaultValue: 'STD EXP-A',
  },
  {
    id: 'f_org_code',
    name: 'Origin Code',
    key: 'origin_code',
    type: 'SHORT_TEXT',
    required: false,
    visible: true,
    section: 'SERVICE',
    order: 10,
    fontSize: 12,
    defaultValue: 'BOM',
    placeholder: 'BOM',
  },
  {
    id: 'f_dst_code',
    name: 'Destination Code',
    key: 'destination_code',
    type: 'SHORT_TEXT',
    required: false,
    visible: true,
    section: 'SERVICE',
    order: 11,
    fontSize: 12,
    defaultValue: 'DEL',
    placeholder: 'DEL',
  },

  // 3. PAYMENT SECTION
  {
    id: 'f_payment_status',
    name: 'Payment Status',
    key: 'payment_status',
    type: 'DROPDOWN',
    required: true,
    visible: true,
    section: 'PAYMENT',
    order: 12,
    options: ['PREPAID', 'COD', 'PARTIAL', 'TO PAY'],
    defaultValue: 'PREPAID',
  },
  {
    id: 'f_amount_to_collect',
    name: 'Amount to Collect',
    key: 'amount_to_collect',
    type: 'CURRENCY',
    required: false,
    visible: true,
    section: 'PAYMENT',
    order: 13,
    defaultValue: 0,
    placeholder: '0.00',
  },

  // 4. BARCODE & TRACKING NUMBER
  {
    id: 'f_tracking_num',
    name: 'Tracking / Consignment Number',
    key: 'tracking_number',
    type: 'SHORT_TEXT',
    required: true,
    visible: true,
    section: 'BARCODE_TRACKING',
    order: 14,
    fontSize: 14,
    isProtected: true,
    placeholder: 'e.g. GT2609001421',
  },
  {
    id: 'f_pkg_count',
    name: 'Package Count',
    key: 'package_count',
    type: 'SHORT_TEXT',
    required: false,
    visible: true,
    section: 'BARCODE_TRACKING',
    order: 15,
    defaultValue: '001 / 001',
    placeholder: '001 / 001',
  },

  // 5. ROUTING & WEIGHT
  {
    id: 'f_route',
    name: 'Route / Location',
    key: 'route_location',
    type: 'SHORT_TEXT',
    required: false,
    visible: true,
    section: 'ROUTING',
    order: 16,
    defaultValue: 'NORTH HUB / R-04',
    placeholder: 'NORTH HUB / R-04',
  },
  {
    id: 'f_weight',
    name: 'Weight (kg)',
    key: 'weight',
    type: 'NUMBER',
    required: true,
    visible: true,
    section: 'ROUTING',
    order: 17,
    defaultValue: 1.0,
    placeholder: '1.00',
  },
  {
    id: 'f_date',
    name: 'Date',
    key: 'date',
    type: 'DATE',
    required: false,
    visible: true,
    section: 'ROUTING',
    order: 18,
  },
  {
    id: 'f_time',
    name: 'Time',
    key: 'time',
    type: 'TIME',
    required: false,
    visible: true,
    section: 'ROUTING',
    order: 19,
  },
  {
    id: 'f_mode',
    name: 'Mode',
    key: 'mode',
    type: 'DROPDOWN',
    required: false,
    visible: true,
    section: 'ROUTING',
    order: 20,
    options: ['SURFACE', 'AIR', 'EXPRESS'],
    defaultValue: 'SURFACE',
  },
];

export const DEFAULT_MASTER_TEMPLATE: ShippingLabelTemplateData = {
  name: 'Standard 4×6 Logistics Label',
  description: 'Industrial 4×6 inch thermal shipping label with QR, CODE128 barcode, and route dispatch details',
  isDefault: true,
  isActive: true,
  version: 1,
  sizePreset: '4x6',
  widthInches: 4.0,
  heightInches: 6.0,
  widthMm: 101.6,
  heightMm: 152.4,
  orientation: 'PORTRAIT',
  logoUrl: DEFAULT_GEO_TRANSIT_LOGO,
  logoPosition: 'TOP_RIGHT',
  logoWidth: 105,
  logoHeight: 38,
  headerText: 'GEO TRANSIT EXPRESS CARGO',
  footerText: 'GEO TRANSIT LOGISTICS NETWORK • SCAN QR OR VERIFY AT WWW.GEOTRANSIT.COM',
  borderStyle: 'SOLID',
  qrConfig: {
    enabled: true,
    sourceField: 'tracking_number',
    size: 70,
    errorCorrectionLevel: 'M',
  },
  barcodeConfig: {
    enabled: true,
    type: 'CODE128',
    sourceField: 'tracking_number',
    showValue: true,
    height: 48,
  },
  fields: DEFAULT_SHIPPING_LABEL_FIELDS,
};

/**
 * Generates a unique, professional consignment/tracking number in standard format:
 * e.g. GT + Year (2 digits) + Month (2 digits) + 6 random digits (e.g. GT2609048123)
 */
export function generateTrackingNumber(): string {
  const now = new Date();
  const yr = String(now.getFullYear()).slice(-2);
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `GT${yr}${mo}${rand}`;
}

/**
 * Ensures the default master template exists in the database.
 */
export async function getOrCreateMasterShippingLabelTemplate() {
  try {
    let template = await (prisma as any).shippingLabelTemplate.findFirst({
      where: { isDefault: true },
    });

    if (!template) {
      template = await (prisma as any).shippingLabelTemplate.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!template) {
      template = await (prisma as any).shippingLabelTemplate.create({
        data: {
          name: DEFAULT_MASTER_TEMPLATE.name,
          description: DEFAULT_MASTER_TEMPLATE.description,
          isDefault: true,
          isActive: true,
          version: 1,
          sizePreset: DEFAULT_MASTER_TEMPLATE.sizePreset,
          widthInches: DEFAULT_MASTER_TEMPLATE.widthInches,
          heightInches: DEFAULT_MASTER_TEMPLATE.heightInches,
          widthMm: DEFAULT_MASTER_TEMPLATE.widthMm,
          heightMm: DEFAULT_MASTER_TEMPLATE.heightMm,
          orientation: DEFAULT_MASTER_TEMPLATE.orientation,
          logoUrl: DEFAULT_MASTER_TEMPLATE.logoUrl,
          logoPosition: DEFAULT_MASTER_TEMPLATE.logoPosition,
          logoWidth: DEFAULT_MASTER_TEMPLATE.logoWidth,
          logoHeight: DEFAULT_MASTER_TEMPLATE.logoHeight,
          headerText: DEFAULT_MASTER_TEMPLATE.headerText,
          footerText: DEFAULT_MASTER_TEMPLATE.footerText,
          borderStyle: DEFAULT_MASTER_TEMPLATE.borderStyle,
          qrConfig: DEFAULT_MASTER_TEMPLATE.qrConfig,
          barcodeConfig: DEFAULT_MASTER_TEMPLATE.barcodeConfig,
          fields: DEFAULT_MASTER_TEMPLATE.fields,
        },
      });
    }

    return template;
  } catch (error) {
    console.error('Error fetching/creating master shipping label template:', error);
    // Return memory fallback if database operation is pending
    return { ...DEFAULT_MASTER_TEMPLATE, id: 'master_default' };
  }
}

/**
 * Validates label inputs against required fields configured in the template.
 */
export function validateShippingLabelData(
  templateFields: ShippingLabelFieldConfig[],
  formData: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of templateFields) {
    if (field.required && field.visible) {
      const val = formData[field.key];
      if (val === undefined || val === null || String(val).trim() === '') {
        errors.push(`${field.name} is required.`);
      }
    }
  }

  if (!formData.tracking_number || String(formData.tracking_number).trim() === '') {
    errors.push('Tracking / Consignment number is required to generate scannable barcodes and QR codes.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
