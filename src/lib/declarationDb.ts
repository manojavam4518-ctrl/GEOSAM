import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface DeclarationInput {
  templateType?: 'GOODS_DECLARATION' | 'PERSONAL_GOODS';

  // Consignment Details
  consignmentNumber: string;
  consigneeName: string;
  receiverAddress: string;
  pinCode: string;
  contactNumber: string;

  // Consignor Details
  consignorName: string;
  consignorAddress: string;
  isGstRegistered: boolean;
  gstNumber?: string;

  // Shipment Information
  content: string;
  hsnCode?: string;
  reasonForTransportation: string;
  isCommercial: boolean;

  // Consignment Value
  valueInr: number;
  amountInWords: string;

  // Invoice Details
  hasInvoice: boolean;
  invoiceNumber?: string;

  // Challan Details
  hasChallan: boolean;
  challanNumber?: string;

  // Consignor Signature & Self Attestation
  signatureBase64: string; // PNG base64 data url
  declarationDate: string; // DD/MM/YYYY
  selfAttested: boolean;
  attestationStatement?: string;

  // Consignor OTP Verification
  mobileVerified: boolean;
  verifiedMobileNumber?: string;
  otpVerifiedAt?: string;

  // Rich-Text HTML Fields
  consigneeNameHtml?: string;
  receiverAddressHtml?: string;
  consignorNameHtml?: string;
  consignorAddressHtml?: string;
  contentHtml?: string;
  reasonForTransportationHtml?: string;
}

export interface DeclarationRecord extends DeclarationInput {
  id: string;
  _id?: any;
  declarationNumber: string;
  organizationId: string;
  userId: string;
  createdByName: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface DeclarationFilterOptions {
  search?: string;
  preset?: string; // 'all' | 'today' | 'this_week' | 'this_month' | 'custom'
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Normalizes MongoDB raw document to typed DeclarationRecord
 */
function normalizeDoc(raw: any): DeclarationRecord {
  const id = raw._id?.$oid || (typeof raw._id === 'string' ? raw._id : raw.id) || String(raw._id || '');
  const createdAt = raw.createdAt?.$date || raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updatedAt?.$date || raw.updatedAt || new Date().toISOString();

  return {
    ...raw,
    id,
    _id: id,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
    updatedAt: typeof updatedAt === 'string' ? updatedAt : new Date(updatedAt).toISOString(),
    consignmentNumber: raw.consignmentNumber || '',
    consigneeName: raw.consigneeName || '',
    receiverAddress: raw.receiverAddress || '',
    pinCode: raw.pinCode || '',
    contactNumber: raw.contactNumber || '',
    consignorName: raw.consignorName || '',
    consignorAddress: raw.consignorAddress || '',
    isGstRegistered: Boolean(raw.isGstRegistered),
    gstNumber: raw.gstNumber || '',
    content: raw.content || '',
    hsnCode: raw.hsnCode || '',
    reasonForTransportation: raw.reasonForTransportation || '',
    isCommercial: Boolean(raw.isCommercial),
    valueInr: Number(raw.valueInr || 0),
    amountInWords: raw.amountInWords || '',
    hasInvoice: Boolean(raw.hasInvoice),
    invoiceNumber: raw.invoiceNumber || '',
    hasChallan: Boolean(raw.hasChallan),
    challanNumber: raw.challanNumber || '',
    signatureBase64: raw.signatureBase64 || '',
    declarationDate: raw.declarationDate || '',
    selfAttested: Boolean(raw.selfAttested),
    mobileVerified: Boolean(raw.mobileVerified),
    verifiedMobileNumber: raw.verifiedMobileNumber || '',
    otpVerifiedAt: raw.otpVerifiedAt || '',
    consigneeNameHtml: raw.consigneeNameHtml || raw.consigneeName || '',
    receiverAddressHtml: raw.receiverAddressHtml || raw.receiverAddress || '',
    consignorNameHtml: raw.consignorNameHtml || raw.consignorName || '',
    consignorAddressHtml: raw.consignorAddressHtml || raw.consignorAddress || '',
    contentHtml: raw.contentHtml || raw.content || '',
    reasonForTransportationHtml: raw.reasonForTransportationHtml || raw.reasonForTransportation || '',
    status: raw.status || 'ACTIVE',
    templateType: raw.templateType || 'GOODS_DECLARATION',
    // Personal Declaration specific fields
    consignorAddressLine1: raw.consignorAddressLine1 || '',
    consignorAddressLine2: raw.consignorAddressLine2 || '',
    consignorPincode: raw.consignorPincode || raw.pinCode || '',
    consignorContact: raw.consignorContact || raw.contactNumber || '',
    consigneeAddressLine1: raw.consigneeAddressLine1 || '',
    consigneeAddressLine2: raw.consigneeAddressLine2 || '',
    consigneePincode: raw.consigneePincode || '',
    consigneeContact: raw.consigneeContact || '',
    customerName: raw.customerName || '',
    residentialAddress: raw.residentialAddress || '',
    identificationNumber: raw.identificationNumber || '',
    destinationAddress: raw.destinationAddress || '',
    items: Array.isArray(raw.items) ? raw.items : [],
    docketNumber: raw.docketNumber || raw.consignmentNumber || '',
  };
}

/**
 * Generate a unique sequential-style Declaration Number
 * e.g. DEC-20261031-A4B2
 */
export function generateDeclarationNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `DEC-${yyyy}${mm}${dd}-${randomSuffix}`;
}

/**
 * Create and persist a new Declaration in MongoDB
 */
export async function createDeclaration(
  organizationId: string,
  userId: string,
  createdByName: string,
  input: DeclarationInput
): Promise<DeclarationRecord> {
  const declarationNumber = generateDeclarationNumber();
  const nowIso = new Date().toISOString();
  const uuid = crypto.randomUUID();

  const doc = {
    id: uuid,
    declarationNumber,
    organizationId,
    userId,
    createdByName,
    ...input,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await prisma.$runCommandRaw({
    insert: 'declarations',
    documents: [doc],
  });

  return normalizeDoc({ ...doc, _id: uuid, createdAt: nowIso, updatedAt: nowIso });
}

/**
 * Query declarations by organization with search, date bounds, and pagination
 */
export async function getDeclarationsByOrg(
  organizationId: string,
  options: DeclarationFilterOptions = {}
): Promise<{ items: DeclarationRecord[]; total: number; page: number; limit: number }> {
  const { search, preset = 'all', startDate, endDate, page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  // Build MongoDB Filter
  const filter: any = {
    organizationId,
    status: { $ne: 'DELETED' },
  };

  // Date filtering
  const now = new Date();
  let start: Date | undefined;
  let end: Date | undefined;

  if (preset === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (preset === 'this_week') {
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - diffToMonday), 23, 59, 59, 999);
  } else if (preset === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (preset === 'custom' || startDate || endDate) {
    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }
  }

  if (start && end) {
    filter.createdAt = { $gte: start, $lte: end };
  } else if (start) {
    filter.createdAt = { $gte: start };
  } else if (end) {
    filter.createdAt = { $lte: end };
  }

  // Keyword search
  if (search && search.trim()) {
    const cleanSearch = search.trim();
    filter.$or = [
      { consignmentNumber: { $regex: cleanSearch, $options: 'i' } },
      { declarationNumber: { $regex: cleanSearch, $options: 'i' } },
      { consignorName: { $regex: cleanSearch, $options: 'i' } },
      { consigneeName: { $regex: cleanSearch, $options: 'i' } },
      { contactNumber: { $regex: cleanSearch, $options: 'i' } },
    ];
  }

  // Execute find query via Prisma raw command
  const findResult = (await prisma.$runCommandRaw({
    find: 'declarations',
    filter,
    sort: { createdAt: -1 },
    skip,
    limit,
  })) as any;

  const rawDocs: any[] = findResult?.cursor?.firstBatch || [];
  const items = rawDocs.map(normalizeDoc);

  // Count total
  let total = items.length;
  try {
    const countResult = (await prisma.$runCommandRaw({
      count: 'declarations',
      query: filter,
    })) as any;
    if (typeof countResult?.n === 'number') {
      total = countResult.n;
    }
  } catch (err) {
    // If count command fails, fallback to length
  }

  return { items, total, page, limit };
}

/**
 * Fetch a single declaration by id ensuring organization isolation
 */
export async function getDeclarationById(
  id: string,
  organizationId: string
): Promise<DeclarationRecord | null> {
  // Query by either id or _id
  let filter: any = {
    organizationId,
    $or: [{ id }, { declarationNumber: id }],
  };

  // If id is valid 24-character hex, also query by $oid
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    filter.$or.push({ _id: { $oid: id } });
  }

  const result = (await prisma.$runCommandRaw({
    find: 'declarations',
    filter,
    limit: 1,
  })) as any;

  const docs: any[] = result?.cursor?.firstBatch || [];
  if (!docs.length) return null;

  return normalizeDoc(docs[0]);
}

/**
 * OTP Record Interface
 */
export interface DeclarationOTPRecord {
  id: string;
  mobile: string;
  code: string;
  organizationId: string;
  userId?: string;
  attempts: number;
  expiresAt: string; // ISO date
  verified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

/**
 * Send an OTP to the consignor's mobile number
 * - Validates 10-digit Indian phone
 * - Enforces 30s resend cooldown
 * - Sets 5-minute expiry
 */
export async function sendDeclarationOTP(
  rawMobile: string,
  organizationId: string,
  userId?: string
): Promise<{ success: boolean; message: string; simulatedOtp: string; expiresAt: string }> {
  // Extract last 10 digits
  const cleaned = rawMobile.replace(/\D/g, '');
  const mobile = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
  }

  // Check 30-second cooldown
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  const recentOtpResult = (await prisma.$runCommandRaw({
    find: 'declaration_otps',
    filter: {
      mobile,
      organizationId,
      createdAt: { $gte: thirtySecondsAgo },
    },
    sort: { createdAt: -1 },
    limit: 1,
  })) as any;

  const recentDocs: any[] = recentOtpResult?.cursor?.firstBatch || [];
  if (recentDocs.length > 0) {
    const lastDoc = recentDocs[0];
    const createdTime = new Date(lastDoc.createdAt?.$date || lastDoc.createdAt).getTime();
    const elapsedSec = Math.floor((Date.now() - createdTime) / 1000);
    const waitSec = Math.max(1, 30 - elapsedSec);
    throw new Error(`Please wait ${waitSec} seconds before requesting a new OTP.`);
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const uuid = crypto.randomUUID();

  const otpDoc = {
    id: uuid,
    mobile,
    code: otpCode,
    organizationId,
    userId: userId || null,
    attempts: 0,
    expiresAt,
    verified: false,
    createdAt: new Date(),
  };

  await prisma.$runCommandRaw({
    insert: 'declaration_otps',
    documents: [otpDoc],
  });

  console.log(`[DECLARATION NOTE OTP] Code: ${otpCode} sent to +91 ${mobile} (Org: ${organizationId})`);

  return {
    success: true,
    message: `Verification code sent to +91 ${mobile}. Valid for 5 minutes.`,
    simulatedOtp: otpCode,
    expiresAt,
  };
}

/**
 * Verify Consignor OTP
 * - Checks expiry (5 minutes)
 * - Limits failed attempts to 5
 * - Sets verified status
 */
export async function verifyDeclarationOTP(
  rawMobile: string,
  code: string,
  organizationId: string
): Promise<{ verified: boolean; message: string; verifiedMobile: string; verifiedAt: string }> {
  const cleaned = rawMobile.replace(/\D/g, '');
  const mobile = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
  const cleanCode = code.trim();

  if (!mobile || !cleanCode) {
    throw new Error('Mobile number and 6-digit OTP code are required.');
  }

  // Find latest active OTP record for this mobile
  const result = (await prisma.$runCommandRaw({
    find: 'declaration_otps',
    filter: {
      mobile,
      organizationId,
      verified: false,
    },
    sort: { createdAt: -1 },
    limit: 1,
  })) as any;

  const docs: any[] = result?.cursor?.firstBatch || [];
  if (!docs.length) {
    throw new Error('No active OTP request found for this mobile number. Please request a new OTP.');
  }

  const otpDoc = docs[0];
  const docId = otpDoc.id || otpDoc._id?.$oid || otpDoc._id;
  const expiresAt = new Date(otpDoc.expiresAt?.$date || otpDoc.expiresAt).getTime();
  const attempts = Number(otpDoc.attempts || 0);

  // Check expiry
  if (Date.now() > expiresAt) {
    throw new Error('OTP has expired. Please request a new code.');
  }

  // Check max attempts
  if (attempts >= 5) {
    throw new Error('Maximum verification attempts exceeded. Please request a new code.');
  }

  // Validate Code
  if (otpDoc.code !== cleanCode) {
    // Increment attempts count
    await prisma.$runCommandRaw({
      update: 'declaration_otps',
      updates: [
        {
          q: { id: docId },
          u: { $set: { attempts: attempts + 1 } },
        },
      ],
    });
    throw new Error(`Invalid OTP code entered. ${4 - attempts} attempts remaining.`);
  }

  // Verification Succeeded: Mark verified
  const verifiedAt = new Date().toISOString();
  await prisma.$runCommandRaw({
    update: 'declaration_otps',
    updates: [
      {
        q: { id: docId },
        u: {
          $set: {
            verified: true,
            verifiedAt,
          },
        },
      },
    ],
  });

  return {
    verified: true,
    message: 'Mobile number successfully verified.',
    verifiedMobile: mobile,
    verifiedAt,
  };
}

/**
 * Custom Transportation Reason Document in MongoDB
 */
export interface CustomTransportationReasonDoc {
  id: string;
  organizationId: string;
  reason: string;
  normalizedReason: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetch all custom transportation reasons for an organization
 */
export async function getCustomTransportationReasons(organizationId: string): Promise<string[]> {
  try {
    const result = (await prisma.$runCommandRaw({
      find: 'declaration_custom_reasons',
      filter: { organizationId },
      sort: { createdAt: 1 },
    })) as any;

    const docs = result?.cursor?.firstBatch || [];
    return docs.map((d: any) => d.reason).filter(Boolean);
  } catch (err) {
    console.error('Error fetching custom transportation reasons:', err);
    return [];
  }
}

/**
 * Persist a new custom transportation reason for an organization
 * Performs case-insensitive duplicate checking before inserting
 */
export async function addCustomTransportationReason(
  organizationId: string,
  reason: string
): Promise<{ success: boolean; reason: string; alreadyExists?: boolean }> {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error('Reason cannot be empty.');
  }

  const normalized = trimmed.toLowerCase();

  // Check if it already matches a predefined option
  const predefinedOptions = [
    'personal use',
    'samples',
    'exhibition purpose',
    'testing purpose',
    'damaged goods return',
    'household items',
    'shifting',
    'replacement',
  ];

  if (predefinedOptions.includes(normalized)) {
    return { success: true, reason: trimmed, alreadyExists: true };
  }

  // Check MongoDB for case-insensitive duplicate in this organization
  const existing = (await prisma.$runCommandRaw({
    find: 'declaration_custom_reasons',
    filter: {
      organizationId,
      normalizedReason: normalized,
    },
    limit: 1,
  })) as any;

  const existingDocs = existing?.cursor?.firstBatch || [];
  if (existingDocs.length > 0) {
    return { success: true, reason: existingDocs[0].reason, alreadyExists: true };
  }

  // Insert new custom reason
  const uuid = crypto.randomUUID();
  const doc = {
    id: uuid,
    organizationId,
    reason: trimmed,
    normalizedReason: normalized,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await prisma.$runCommandRaw({
    insert: 'declaration_custom_reasons',
    documents: [doc],
  });

  return { success: true, reason: trimmed };
}

