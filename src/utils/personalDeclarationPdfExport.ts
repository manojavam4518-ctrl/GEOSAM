import jsPDF from 'jspdf';
import {
  PersonalDeclarationInput,
  PersonalDeclarationRecord,
  PersonalDeclarationItem,
} from '@/lib/personalDeclarationDb';
import { cropSignatureDataUrl } from '@/utils/declarationPdfExport';

export type PersonalDeclarationPdfData =
  | PersonalDeclarationInput
  | PersonalDeclarationRecord
  | (PersonalDeclarationInput & { declarationNumber?: string; consignmentNumber?: string });

export interface PersonalDeclarationRenderOptions {
  isInteractive?: boolean;
}

export const PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE =
  'Please complete your signature before downloading the Personal Goods Declaration PDF.';

/**
 * Strict validator for Personal Goods Declaration signature data.
 * Considers null, undefined, empty string, non-data URI, or blank canvas data as unsigned.
 */
export function isValidPersonalDeclarationSignature(signature?: string | null): boolean {
  if (!signature || typeof signature !== 'string') return false;
  const trimmed = signature.trim();
  if (!trimmed.startsWith('data:image')) return false;
  // A valid non-blank digital signature stroke has at least 250 base64 characters
  if (trimmed.length < 250) return false;
  return true;
}

/**
 * Converts a raw date string to standard Indian Date format: DD/MM/YYYY
 */
export function formatIndianDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const dashMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dashMatch) {
    return `${dashMatch[1]}/${dashMatch[2]}/${dashMatch[3]}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return trimmed;
}

/**
 * Formats a number to Indian currency format (e.g. 1,23,456)
 */
export function formatIndianCurrency(num: number): string {
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

/**
 * Converts a numeric amount into formal Indian currency words:
 * Example: 7322 -> "Rupees Seven Thousand Three Hundred and Twenty-Two Only."
 */
export function convertAmountToWordsPersonalDeclaration(amount: number): string {
  if (isNaN(amount) || amount <= 0) return '';

  const ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  const convertTwo = (n: number): string => {
    if (n < 20) return ONES[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o > 0 ? `${TENS[t]}-${ONES[o]}` : TENS[t];
  };

  const convertThree = (n: number): string => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let res = '';
    if (h > 0) {
      res += `${ONES[h]} Hundred`;
    }
    if (r > 0) {
      if (res) res += ' and ';
      res += convertTwo(r);
    }
    return res;
  };

  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  const parts: string[] = [];
  let num = rupees;

  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  if (crores > 0) {
    parts.push(`${convertThree(crores)} Crore`);
  }

  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  if (lakhs > 0) {
    parts.push(`${convertTwo(lakhs)} Lakh`);
  }

  const thousands = Math.floor(num / 1000);
  num %= 1000;
  if (thousands > 0) {
    parts.push(`${convertTwo(thousands)} Thousand`);
  }

  if (num > 0) {
    parts.push(convertThree(num));
  }

  let words = parts.join(' ').trim();
  if (!words && rupees === 0) {
    words = 'Zero';
  }

  let result = `Rupees ${words}`;
  if (paise > 0) {
    result += ` and ${convertTwo(paise)} Paise`;
  }
  return `${result.trim()} Only.`;
}

/**
 * Escapes HTML characters for safe HTML interpolation
 */
function escapeHtml(str: string = ''): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips HTML tags for clean plain text fallback
 */
function stripHtml(html: string = ''): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Automatically detects and cleanly removes duplicate 6-digit Indian PIN codes from an address string.
 * Preserves all surrounding address text and cleans up punctuation (commas, hyphens, periods).
 * Requires exact 6 digits to prevent premature removal while user is typing.
 */
export function removeDuplicatePincodeFromAddress(
  address?: string | null,
  pincode?: string | null
): string {
  if (!address || typeof address !== 'string') return address || '';
  if (!pincode || typeof pincode !== 'string') return address;

  const cleanPin = pincode.trim();
  // PIN code must be exactly 6 digits
  if (!/^\d{6}$/.test(cleanPin)) {
    return address;
  }

  // Pattern 1: With explicit PIN label before the PIN code
  // e.g. ", Pin Code: 382430", " - PIN 382430", ", Pincode - 382430."
  const labelPattern = new RegExp(
    `([,\\-\\s]+)?\\b(?:pin(?:\\s*code)?|pincode|postal\\s*code)\\b\\s*[:\\-]?\\s*\\b${cleanPin}\\b([,\\s]*)?`,
    'gi'
  );

  // Pattern 2: Standalone 6-digit PIN code preceded or followed by punctuation
  // e.g. ", 382430.", " - 382430", ",, 382430"
  const standalonePattern = new RegExp(
    `([,\\-\\s]+)?\\b${cleanPin}\\b([,\\s]*)?`,
    'g'
  );

  let cleaned = address;
  const replacer = (_match: string, prefix?: string, suffix?: string) => {
    // If there was a comma before or after and text continues, preserve a comma
    const hasComma = (prefix && prefix.includes(',')) || (suffix && suffix.includes(','));
    return hasComma ? ', ' : ' ';
  };

  if (labelPattern.test(cleaned)) {
    cleaned = cleaned.replace(labelPattern, replacer);
  } else if (standalonePattern.test(cleaned)) {
    cleaned = cleaned.replace(standalonePattern, replacer);
  }

  // Cleanup redundant punctuation created by removal:
  // 1. Multiple consecutive commas (e.g. ",,", ", ,") -> single comma followed by space
  cleaned = cleaned.replace(/,\s*,+/g, ',');
  cleaned = cleaned.replace(/,\s*/g, ', ');
  // 2. Comma followed immediately by period (e.g. ",.") -> period
  cleaned = cleaned.replace(/,\s*\./g, '.');
  // 3. Space before period (e.g. " .") -> "."
  cleaned = cleaned.replace(/\s+\./g, '.');
  // 4. Trailing commas, hyphens, or spaces before end of string (e.g. "KATHWADA,." or "KATHWADA,")
  cleaned = cleaned.replace(/[,\\-\s]+$/g, '');
  // 5. Leading commas, hyphens, or spaces (e.g. ", Plot 10")
  cleaned = cleaned.replace(/^[,\\-\s]+/g, '');
  // 6. Multiple spaces -> single space
  cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();

  // If the original address ended with a period and cleaned doesn't, restore period
  if (address.trim().endsWith('.') && !cleaned.endsWith('.')) {
    cleaned += '.';
  }

  return cleaned;
}

/**
 * Generates exact 1:1 standalone unscaled A4 HTML representation of the Personal Goods Declaration Note.
 *
 * Layout rules & strict specifications:
 *  1. Standard A4 Dimensions: 794px width x 1123px height (210mm x 297mm at 96 DPI).
 *  2. Typography:
 *     - Main heading: 13-14 pt bold serif (TO WHOM SO EVER IT MAY CONCERN).
 *     - Section headings: 9.5-10 pt bold serif (Consignor's Name & Address, Consignee's Name & Address).
 *     - Consignor & Consignee details: 8.5-9 pt with natural line wrapping.
 *     - Declaration intro paragraph: 8.5-9 pt with dotted underline for addresses and bold names.
 *     - Goods description table: 8.5-9 pt with thin crisp black borders.
 *     - Date & footer: 8-8.5 pt.
 *  3. Consignor & Consignee: Two equal columns (48% each, 24px gap) preventing any overlapping.
 *  4. Top-Right Date: Indian format (DD/MM/YYYY).
 *  5. Goods Description Table: Displays at least 10-15 rows on Page 1.
 *     If items > 15, cleanly paginates to subsequent pages with repeated table headers and continuous S.No.
 *  6. Signature: Bottom right, clear and proportional, above Customer's Signature.
 */
export function generatePersonalDeclarationHtml(
  data: PersonalDeclarationPdfData,
  options: PersonalDeclarationRenderOptions = {}
): string {
  const formattedDate = formatIndianDate(data.declarationDate);
  const rawItems: PersonalDeclarationItem[] =
    data.items && data.items.length > 0
      ? data.items
      : Array.from({ length: 10 }, (_, i) => ({ sNo: i + 1, description: '', amount: '' }));

  // Calculate live total amount
  const totalAmount = rawItems.reduce((sum, item) => {
    const num = parseFloat(String(item.amount).replace(/[^0-9.]/g, ''));
    return sum + (isNaN(num) || num < 0 ? 0 : num);
  }, 0);

  // Address lines composition with duplicate PIN code cleanup
  const consignorDisplayName = data.consignorName
    ? (data.consignorContact && !data.consignorName.includes(data.consignorContact)
        ? `${data.consignorName} - ${data.consignorContact}`
        : data.consignorName)
    : '';
  const rawConsignorAddress = [data.consignorAddressLine1, data.consignorAddressLine2]
    .filter(Boolean)
    .join(', ');
  const cleanedConsignorAddress = removeDuplicatePincodeFromAddress(
    rawConsignorAddress,
    data.consignorPincode || ''
  );

  const consigneeDisplayName = data.consigneeName
    ? (data.consigneeContact && !data.consigneeName.includes(data.consigneeContact)
        ? `${data.consigneeName} - ${data.consigneeContact}`
        : data.consigneeName)
    : '';
  const rawConsigneeAddress = [data.consigneeAddressLine1, data.consigneeAddressLine2]
    .filter(Boolean)
    .join(', ');
  const cleanedConsigneeAddress = removeDuplicatePincodeFromAddress(
    rawConsigneeAddress,
    data.consigneePincode || ''
  );

  const cleanedResidentialAddress = removeDuplicatePincodeFromAddress(
    data.residentialAddress || '',
    data.consignorPincode || ''
  );
  const cleanedDestinationAddress = removeDuplicatePincodeFromAddress(
    data.destinationAddress || '',
    data.consigneePincode || ''
  );

  // Pagination configuration
  const PAGE_1_ITEMS_LIMIT = 15;
  const CONTINUATION_PAGE_ITEMS_LIMIT = 25;

  const pages: PersonalDeclarationItem[][] = [];
  if (rawItems.length <= PAGE_1_ITEMS_LIMIT) {
    pages.push(rawItems);
  } else {
    pages.push(rawItems.slice(0, PAGE_1_ITEMS_LIMIT));
    let remaining = rawItems.slice(PAGE_1_ITEMS_LIMIT);
    while (remaining.length > 0) {
      pages.push(remaining.slice(0, CONTINUATION_PAGE_ITEMS_LIMIT));
      remaining = remaining.slice(CONTINUATION_PAGE_ITEMS_LIMIT);
    }
  }

  const totalPages = pages.length;

  // Signature Block HTML
  let signatureContentHtml = '';
  if (data.signatureBase64 && isValidPersonalDeclarationSignature(data.signatureBase64)) {
    signatureContentHtml = `
      <img
        src="${data.signatureBase64}"
        alt="Customer Signature"
        style="max-height: 46px; max-width: 175px; object-fit: contain; pointer-events: none; display: block; margin: 0 auto;"
      />
    `;
  } else if (options.isInteractive) {
    signatureContentHtml = `
      <div style="width: 100%; height: 100%; border: 1.5px dashed #f59e0b; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #fffbeb; font-size: 11px; color: #b45309; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; cursor: pointer;">
        ✍ Click to Sign
      </div>
    `;
  } else {
    signatureContentHtml = `
      <div style="width: 140px; border-bottom: 1px solid #000; height: 35px; margin: 0 auto;"></div>
    `;
  }

  // Render HTML for each A4 Page
  return pages
    .map((pageItems, pageIdx) => {
      const isFirstPage = pageIdx === 0;
      const isLastPage = pageIdx === totalPages - 1;
      const startItemIndex = isFirstPage ? 0 : PAGE_1_ITEMS_LIMIT + (pageIdx - 1) * CONTINUATION_PAGE_ITEMS_LIMIT;

      return `
        <div
          class="personal-declaration-a4-page"
          data-page="${pageIdx + 1}"
          style="
            width: 794px;
            min-height: 1123px;
            height: 1123px;
            max-height: 1123px;
            padding: 44px 50px 40px 50px;
            box-sizing: border-box;
            background: #ffffff;
            color: #000000;
            font-family: 'Times New Roman', Times, Georgia, serif;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: ${isLastPage ? 'auto' : 'always'};
            break-after: ${isLastPage ? 'auto' : 'page'};
            position: relative;
            overflow: hidden;
            margin: 0 auto;
          "
        >
          <!-- Page Main Content Area -->
          <div style="flex: 1 1 auto; display: flex; flex-direction: column;">
            ${
              isFirstPage
                ? `
                <!-- 1. Top Right Date -->
                <div style="text-align: right; font-size: 11px; margin-bottom: 6px;">
                  <span style="font-family: 'Times New Roman', serif;">Date : </span>
                  <span style="font-family: Arial, sans-serif; font-weight: 600; letter-spacing: 0.3px;">
                    ${formattedDate || '..................................'}
                  </span>
                </div>

                <!-- 2. Centered Prominent Main Heading: GOODS DECLARATION NOTE -->
                <div style="text-align: center; margin-bottom: 16px;">
                  <h1 style="margin: 0; font-size: 21px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase; font-family: 'Times New Roman', serif; color: #000000; line-height: 1.2;">
                    GOODS DECLARATION NOTE
                  </h1>
                </div>

                <!-- 3. Centered Subheading: TO WHOM SO EVER IT MAY CONCERN -->
                <div style="text-align: center; margin-bottom: 16px;">
                  <h2 style="margin: 0; font-size: 13.5px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; font-family: 'Times New Roman', serif; color: #000000; line-height: 1.2;">
                    TO WHOM SO EVER IT MAY CONCERN
                  </h2>
                </div>

                <!-- 4. Consignor and Consignee Columns (Balanced 2-Column Grid) -->
                <div style="display: flex; justify-content: space-between; gap: 26px; margin-bottom: 14px;">
                  <!-- Left Column: Consignor -->
                  <div style="width: 48%; box-sizing: border-box;">
                    <!-- Section Header -->
                    <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; font-family: 'Times New Roman', serif; color: #000000; letter-spacing: 0.4px;">
                      CONSIGNOR&apos;S DETAILS
                    </div>

                    <!-- Line 1: Consignor's Name -->
                    <div style="font-size: 11px; margin-bottom: 4px; line-height: 1.35; word-break: break-word;">
                      <strong style="font-family: 'Times New Roman', serif; font-weight: bold;">Consignor&apos;s Name:</strong>
                      <span style="font-family: Arial, sans-serif; font-weight: bold; margin-left: 4px; text-decoration: none;">
                        ${escapeHtml(consignorDisplayName) || '__________________________________'}
                      </span>
                    </div>

                    <!-- Line 2: Address (Label changed to "Address:" with no underlines) -->
                    <div style="font-size: 11px; margin-bottom: 4px; line-height: 1.35; word-break: break-word;">
                      <strong style="font-family: 'Times New Roman', serif; font-weight: bold;">Address:</strong>
                      <span style="font-family: Arial, sans-serif; margin-left: 4px; text-decoration: none;">
                        ${escapeHtml(cleanedConsignorAddress) || '__________________________________'}
                      </span>
                    </div>

                    <div style="display: flex; align-items: center; margin-top: 3px; font-size: 11px;">
                      <span style="font-weight: bold; width: 95px; flex-shrink: 0; font-family: 'Times New Roman', serif;">Pin Code</span>
                      <span style="font-weight: bold; width: 14px; flex-shrink: 0; text-align: center;">:</span>
                      <span style="font-family: monospace; font-weight: bold; font-size: 11.5px; color: #000;">
                        ${escapeHtml(data.consignorPincode) || '____________________'}
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; margin-top: 3px; font-size: 11px;">
                      <span style="font-weight: bold; width: 95px; flex-shrink: 0; font-family: 'Times New Roman', serif;">Contact Number</span>
                      <span style="font-weight: bold; width: 14px; flex-shrink: 0; text-align: center;">:</span>
                      <span style="font-family: monospace; font-weight: bold; font-size: 11.5px; color: #000;">
                        ${escapeHtml(data.consignorContact) || '____________________'}
                      </span>
                    </div>
                  </div>

                  <!-- Right Column: Consignee -->
                  <div style="width: 48%; box-sizing: border-box;">
                    <!-- Section Header -->
                    <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; font-family: 'Times New Roman', serif; color: #000000; letter-spacing: 0.4px;">
                      CONSIGNEE&apos;S DETAILS
                    </div>

                    <!-- Line 1: Consignee's Name -->
                    <div style="font-size: 11px; margin-bottom: 4px; line-height: 1.35; word-break: break-word;">
                      <strong style="font-family: 'Times New Roman', serif; font-weight: bold;">Consignee&apos;s Name:</strong>
                      <span style="font-family: Arial, sans-serif; font-weight: bold; margin-left: 4px; text-decoration: none;">
                        ${escapeHtml(consigneeDisplayName) || '__________________________________'}
                      </span>
                    </div>

                    <!-- Line 2: Address (Label changed to "Address:" with no underlines) -->
                    <div style="font-size: 11px; margin-bottom: 4px; line-height: 1.35; word-break: break-word;">
                      <strong style="font-family: 'Times New Roman', serif; font-weight: bold;">Address:</strong>
                      <span style="font-family: Arial, sans-serif; margin-left: 4px; text-decoration: none;">
                        ${escapeHtml(cleanedConsigneeAddress) || '__________________________________'}
                      </span>
                    </div>

                    <div style="display: flex; align-items: center; margin-top: 3px; font-size: 11px;">
                      <span style="font-weight: bold; width: 95px; flex-shrink: 0; font-family: 'Times New Roman', serif;">Pin Code</span>
                      <span style="font-weight: bold; width: 14px; flex-shrink: 0; text-align: center;">:</span>
                      <span style="font-family: monospace; font-weight: bold; font-size: 11.5px; color: #000;">
                        ${escapeHtml(data.consigneePincode) || '____________________'}
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; margin-top: 3px; font-size: 11px;">
                      <span style="font-weight: bold; width: 95px; flex-shrink: 0; font-family: 'Times New Roman', serif;">Contact Number</span>
                      <span style="font-weight: bold; width: 14px; flex-shrink: 0; text-align: center;">:</span>
                      <span style="font-family: monospace; font-weight: bold; font-size: 11.5px; color: #000;">
                        ${escapeHtml(data.consigneeContact) || '____________________'}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 4. Salutation & Declaration Intro Paragraph -->
                <div style="font-size: 11px; line-height: 1.45; margin-bottom: 12px; font-family: 'Times New Roman', serif;">
                  <p style="margin: 0 0 3px 0;">Dear Sir/Madam,</p>
                  <p style="margin: 0 0 3px 0; word-break: break-word;">
                    I <strong style="font-family: Arial, sans-serif; font-weight: bold;">${escapeHtml(data.customerName) || '________________________'}</strong> a resident of <span style="font-family: Arial, sans-serif;">${escapeHtml(cleanedResidentialAddress) || '------------------------------------------------------------------'}</span>
                  </p>
                  <p style="margin: 0 0 3px 0; word-break: break-word;">
                    Identification Number <span style="font-family: Arial, sans-serif;">${escapeHtml(data.identificationNumber) || '---------------------------------------------------'}</span>
                  </p>
                  <p style="margin: 0 0 4px 0; word-break: break-word;">
                    Want to send the below mentioned goods to <strong style="font-family: Arial, sans-serif; font-weight: bold;">${escapeHtml(cleanedDestinationAddress) || '________________________________________'}</strong>.
                  </p>
                  <p style="margin: 0;">The goods to be transported are:</p>
                </div>
              `
                : `
                <!-- Continuation Page Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 6px;">
                  <span style="font-weight: bold; text-transform: uppercase; font-family: 'Times New Roman', serif;">
                    PERSONAL GOODS DECLARATION NOTE &mdash; (Page ${pageIdx + 1} of ${totalPages})
                  </span>
                  <span style="font-family: Arial, sans-serif;">Date : ${formattedDate}</span>
                </div>
              `
            }

            <!-- 5. Goods Description Table (At least 10-15 rows fit comfortably on Page 1) -->
            <div style="width: 100%; margin-bottom: 8px;">
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
                <thead>
                  <tr style="height: 24px; background: #ffffff;">
                    <th style="width: 50px; border: 1px solid #000; text-align: center; font-size: 11px; font-weight: bold; font-family: 'Times New Roman', serif; padding: 2px 4px;">
                      S. No.
                    </th>
                    <th style="border: 1px solid #000; text-align: center; font-size: 11px; font-weight: bold; font-family: 'Times New Roman', serif; padding: 2px 8px;">
                      List / Description of Items
                    </th>
                    <th style="width: 115px; border: 1px solid #000; text-align: center; font-size: 11px; font-weight: bold; font-family: 'Times New Roman', serif; padding: 2px 6px;">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${pageItems
                    .map((item, idx) => {
                      const displaySNo = item.sNo || startItemIndex + idx + 1;
                      const hasAmount = item.amount && String(item.amount).trim() !== '';
                      return `
                      <tr style="height: 21px; min-height: 21px;">
                        <td style="width: 50px; border: 1px solid #000; text-align: center; font-size: 10.5px; font-family: 'Times New Roman', serif; padding: 2px 4px;">
                          ${displaySNo}
                        </td>
                        <td style="border: 1px solid #000; text-align: left; font-size: 10.5px; font-family: Arial, sans-serif; padding: 2px 8px; word-break: break-word; line-height: 1.25;">
                          ${escapeHtml(item.description) || '&nbsp;'}
                        </td>
                        <td style="width: 115px; border: 1px solid #000; text-align: center; vertical-align: middle; font-size: 10.5px; font-family: monospace; font-weight: 600; padding: 2px 4px;">
                          ${hasAmount ? escapeHtml(String(item.amount)) : '&nbsp;'}
                        </td>
                      </tr>
                    `;
                    })
                    .join('')}

                  ${
                    isLastPage && totalAmount > 0
                      ? `
                    <tr style="height: 22px; font-weight: bold; font-size: 11px; background: #fafafa;">
                      <td colspan="2" style="border: 1px solid #000; text-align: right; font-family: 'Times New Roman', serif; padding: 2px 8px;">
                        TOTAL AMOUNT:
                      </td>
                      <td style="width: 115px; border: 1px solid #000; text-align: center; vertical-align: middle; font-family: monospace; font-weight: bold; padding: 2px 8px;">
                        Rs. ${formatIndianCurrency(totalAmount)}
                      </td>
                    </tr>
                    <tr style="height: 22px; font-size: 10.5px; background: #fafafa;">
                      <td colspan="3" style="border: 1px solid #000; text-align: left; padding: 3px 8px;">
                        <span style="font-family: 'Times New Roman', serif; font-weight: bold;">AMOUNT IN WORDS:</span>
                        <span style="font-family: Arial, sans-serif; font-weight: bold; margin-left: 6px;">
                          ${escapeHtml(convertAmountToWordsPersonalDeclaration(totalAmount))}
                        </span>
                      </td>
                    </tr>
                  `
                      : ''
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- 6. Bottom Declarations & Customer Signature (Rendered on Last Page) -->
          ${
            isLastPage
              ? `
            <div style="flex-shrink: 0; margin-top: 6px;">
              <!-- Declaration Statement (Heading & Sentence on same line) -->
              <div style="font-size: 11px; font-weight: bold; line-height: 1.5; margin-bottom: 12px; font-family: 'Times New Roman', serif; text-align: justify;">
                <span style="font-size: 11px; font-weight: bold; text-decoration: underline; text-underline-offset: 3px; font-family: 'Times New Roman', serif; text-transform: uppercase;">DECLARATION:</span>
                &nbsp;I hereby declare that the shipment booked vide Docket Number <span style="font-family: monospace; font-weight: bold; text-decoration: underline; padding: 0 4px;">${escapeHtml(data.docketNumber || (data as any).consignmentNumber) || '_____________________________________'}</span> is for Personal use only and does not have any commercial value.
              </div>

              <!-- Customer Signature Block (Shifted ~3% / 34px upwards) -->
              <div style="display: flex; flex-direction: column; align-items: flex-end; margin-top: 6px; margin-bottom: 34px;">
                <div
                  id="personal-signature-click-target"
                  style="
                    width: 180px;
                    height: 50px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    margin-bottom: 3px;
                    cursor: ${options.isInteractive ? 'pointer' : 'default'};
                  "
                  title="${options.isInteractive ? 'Click to sign or update digital signature' : ''}"
                >
                  ${signatureContentHtml}
                </div>
                <div style="width: 180px; text-align: center; font-size: 11.5px; font-weight: bold; font-family: 'Times New Roman', serif;">
                  Customer's Signature
                </div>
              </div>

              <!-- Footer GEO TRANSIT -->
              <div style="text-align: center; margin-top: 14px; font-size: 10px; font-weight: bold; letter-spacing: 1.5px; color: #475569; font-family: Arial, sans-serif;">
                GEO TRANSIT
              </div>
            </div>
          `
              : `
            <!-- Footer GEO TRANSIT for Intermediate Pages -->
            <div style="flex-shrink: 0; text-align: center; margin-top: 10px; font-size: 10px; font-weight: bold; letter-spacing: 1.5px; color: #475569; font-family: Arial, sans-serif;">
              GEO TRANSIT &bull; Page ${pageIdx + 1} of ${totalPages}
            </div>
          `
          }
        </div>
      `;
    })
    .join('');
}

/**
 * Generate A4 PDF for Personal Goods Declaration Note
 *
 * Captures pristine unscaled 794px A4 container in browser environments for pixel-perfect fidelity,
 * or cleanly falls back to vector jsPDF generation with exact text-wrapping and 15-row A4 capacity.
 */
export async function generatePersonalDeclarationPdf(
  data: PersonalDeclarationPdfData
): Promise<jsPDF> {
  if (!isValidPersonalDeclarationSignature(data.signatureBase64)) {
    throw new Error(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
  }

  // Ensure signature is tightly cropped to its handwritten boundaries
  let optimizedData = data;
  if (data.signatureBase64 && typeof window !== 'undefined') {
    try {
      const croppedSig = await cropSignatureDataUrl(data.signatureBase64);
      if (croppedSig && croppedSig !== data.signatureBase64) {
        optimizedData = { ...data, signatureBase64: croppedSig };
      }
    } catch {
      // Continue with original
    }
  }

  // If in browser, create dedicated pristine unscaled A4 container (transform: none)
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // Exactly 210mm at 96 DPI
    container.style.background = '#FFFFFF';
    container.style.color = '#000000';
    container.style.zIndex = '-9999';
    container.style.transform = 'none'; // Crucial: Absolutely NO CSS scaling transforms
    container.innerHTML = generatePersonalDeclarationHtml(optimizedData, { isInteractive: false });

    document.body.appendChild(container);

    try {
      // 1. Wait for document fonts to be ready
      if (document.fonts) {
        await document.fonts.ready;
      }

      // 2. Allow any embedded signature image to fully decode
      const images = container.querySelectorAll('img');
      if (images.length > 0) {
        await Promise.all(
          Array.from(images).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(resolve, 300);
            });
          })
        );
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const pages = container.querySelectorAll<HTMLElement>('.personal-declaration-a4-page');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          doc.addPage('a4', 'portrait');
        }

        const pageEl = pages[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2.5, // 240-300 DPI crisp print resolution
          useCORS: true,
          backgroundColor: '#FFFFFF',
          logging: false,
          windowWidth: 794,
        });

        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      return doc;
    } catch (err) {
      console.warn('DOM capture fallback to vector jsPDF for personal declaration:', err);
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  // Pure Vector jsPDF Generator Fallback (Used in Node.js or if DOM capture is unavailable)
  return generateVectorPersonalDeclarationPdf(optimizedData);
}

/**
 * Helper function for Pure Vector jsPDF to render a bold label followed immediately by value on the same line,
 * wrapping naturally to next lines if needed without any unwanted underlines.
 */
function renderFieldWithInlineLabel(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  startY: number,
  colWidth: number,
  isValueBold = false
): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  const labelWithSpace = label + ' ';
  const labelW = doc.getTextWidth(labelWithSpace);
  const textVal = value || '__________________________________';

  doc.setFont('helvetica', isValueBold ? 'bold' : 'normal');
  doc.setFontSize(8.5);

  const firstLineAvailW = colWidth - labelW;
  const fullValW = doc.getTextWidth(textVal);

  if (fullValW <= firstLineAvailW) {
    // Fits on single line
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text(label, x, startY);

    doc.setFont('helvetica', isValueBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.text(textVal, x + labelW, startY);
    return startY + 4.5;
  }

  // Label on first line
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(label, x, startY);

  // Split words to wrap textVal across lines
  doc.setFont('helvetica', isValueBold ? 'bold' : 'normal');
  doc.setFontSize(8.5);

  const words = textVal.split(' ');
  let line1 = '';
  let wordIdx = 0;

  while (wordIdx < words.length) {
    const candidate = line1 ? `${line1} ${words[wordIdx]}` : words[wordIdx];
    if (doc.getTextWidth(candidate) <= firstLineAvailW) {
      line1 = candidate;
      wordIdx++;
    } else {
      break;
    }
  }

  doc.text(line1, x + labelW, startY);
  let nextY = startY + 4;

  const remaining = words.slice(wordIdx).join(' ');
  if (remaining) {
    const remainingLines = doc.splitTextToSize(remaining, colWidth);
    for (const rLine of remainingLines) {
      doc.text(rLine, x, nextY);
      nextY += 4;
    }
  }
  return nextY + 0.5;
}

/**
 * Pure Vector jsPDF Generator for Personal Goods Declaration Note
 * Implements strict text-wrapping, 15-row Page 1 capacity, and dynamic multi-page continuation.
 */
export function generateVectorPersonalDeclarationPdf(
  data: PersonalDeclarationPdfData
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let curY = margin + 2;

  // 1. Top-Right Date (Indian Format DD/MM/YYYY)
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  const formattedDate = formatIndianDate(data.declarationDate);
  const dateStr = `Date : ${formattedDate || '..................................'}`;
  doc.text(dateStr, pageWidth - margin, curY, { align: 'right' });

  curY += 4.5;

  // 2. Centered Prominent Main Heading: GOODS DECLARATION NOTE (Largest font size)
  doc.setFont('times', 'bold');
  doc.setFontSize(15.5);
  doc.text('GOODS DECLARATION NOTE', pageWidth / 2, curY, { align: 'center' });

  // ~3% additional vertical spacing relative to printable width (182mm * 0.03 = ~5.5mm; 6 + 4.5 = 10.5mm)
  curY += 10.5;

  // 3. Centered Subheading: TO WHOM SO EVER IT MAY CONCERN (Smaller font size)
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('TO WHOM SO EVER IT MAY CONCERN', pageWidth / 2, curY, { align: 'center' });

  curY += 8.5;

  // 4. Consignor and Consignee Columns (Balanced 2-Column Grid)
  const colWidth = 84;
  const leftColX = margin;
  const rightColX = margin + colWidth + 14; // 14 + 84 + 14 = 112mm, fits within 196mm
  const colStartY = curY;

  // Section Headers
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text("CONSIGNOR'S DETAILS", leftColX, colStartY);
  doc.text("CONSIGNEE'S DETAILS", rightColX, colStartY);

  let leftY = colStartY + 5;
  let rightY = colStartY + 5;

  // Address lines composition with duplicate PIN code cleanup
  const consignorDisplayName = data.consignorName
    ? (data.consignorContact && !data.consignorName.includes(data.consignorContact)
        ? `${data.consignorName} - ${data.consignorContact}`
        : data.consignorName)
    : '';
  const rawConsignorAddress = [data.consignorAddressLine1, data.consignorAddressLine2]
    .filter(Boolean)
    .join(', ');
  const cleanedConsignorAddress = removeDuplicatePincodeFromAddress(
    rawConsignorAddress,
    data.consignorPincode || ''
  );

  const consigneeDisplayName = data.consigneeName
    ? (data.consigneeContact && !data.consigneeName.includes(data.consigneeContact)
        ? `${data.consigneeName} - ${data.consigneeContact}`
        : data.consigneeName)
    : '';
  const rawConsigneeAddress = [data.consigneeAddressLine1, data.consigneeAddressLine2]
    .filter(Boolean)
    .join(', ');
  const cleanedConsigneeAddress = removeDuplicatePincodeFromAddress(
    rawConsigneeAddress,
    data.consigneePincode || ''
  );

  const cleanedResidentialAddress = removeDuplicatePincodeFromAddress(
    data.residentialAddress || '',
    data.consignorPincode || ''
  );
  const cleanedDestinationAddress = removeDuplicatePincodeFromAddress(
    data.destinationAddress || '',
    data.consigneePincode || ''
  );

  // Left Column: Consignor
  leftY = renderFieldWithInlineLabel(doc, "Consignor's Name:", consignorDisplayName, leftColX, leftY, colWidth, true);
  leftY = renderFieldWithInlineLabel(doc, "Address:", cleanedConsignorAddress, leftColX, leftY, colWidth, false);

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('Pin Code', leftColX, leftY);
  doc.text(':', leftColX + 26, leftY);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(data.consignorPincode || '____________________', leftColX + 29, leftY);
  leftY += 4.5;

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('Contact Number', leftColX, leftY);
  doc.text(':', leftColX + 26, leftY);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(data.consignorContact || '____________________', leftColX + 29, leftY);
  leftY += 4.5;

  // Right Column: Consignee
  rightY = renderFieldWithInlineLabel(doc, "Consignee's Name:", consigneeDisplayName, rightColX, rightY, colWidth, true);
  rightY = renderFieldWithInlineLabel(doc, "Address:", cleanedConsigneeAddress, rightColX, rightY, colWidth, false);

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('Pin Code', rightColX, rightY);
  doc.text(':', rightColX + 26, rightY);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(data.consigneePincode || '____________________', rightColX + 29, rightY);
  rightY += 4.5;

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('Contact Number', rightColX, rightY);
  doc.text(':', rightColX + 26, rightY);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text(data.consigneeContact || '____________________', rightColX + 29, rightY);
  rightY += 4.5;

  curY = Math.max(leftY, rightY) + 3;

  // 4. Salutation & Declaration Intro Paragraph
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('Dear Sir/Madam,', margin, curY);
  curY += 4.5;

  const custName = data.customerName || '________________________';
  const resAddr = cleanedResidentialAddress || '------------------------------------------------------------------';
  const idNo = data.identificationNumber || '---------------------------------------------------';
  const destAddr = cleanedDestinationAddress || '________________________________________';

  const introP1 = `I ${custName} a resident of ${resAddr}`;
  const splitP1 = doc.splitTextToSize(introP1, contentWidth);
  doc.text(splitP1, margin, curY);
  curY += splitP1.length * 4.2;

  const introP2 = `Identification Number ${idNo}`;
  const splitP2 = doc.splitTextToSize(introP2, contentWidth);
  doc.text(splitP2, margin, curY);
  curY += splitP2.length * 4.2;

  const introP3 = `Want to send the below mentioned goods to ${destAddr}.`;
  const splitP3 = doc.splitTextToSize(introP3, contentWidth);
  doc.text(splitP3, margin, curY);
  curY += splitP3.length * 4.2;

  doc.text('The goods to be transported are:', margin, curY);
  curY += 4.5;

  // 5. Items Table (15 rows fit on Page 1)
  const tableX = margin;
  const col1W = 14; // S. No.
  const col3W = 30; // Amount
  const col2W = contentWidth - col1W - col3W; // 138mm Description
  const rowH = 5.2;
  const headerH = 5.5;

  const rawItems =
    data.items && data.items.length > 0
      ? data.items
      : Array.from({ length: 10 }, (_, i) => ({ sNo: i + 1, description: '', amount: '' }));

  const totalAmount = rawItems.reduce((sum, item) => {
    const num = parseFloat(String(item.amount).replace(/[^0-9.]/g, ''));
    return sum + (isNaN(num) || num < 0 ? 0 : num);
  }, 0);

  const drawTableHeader = (y: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.rect(tableX, y, contentWidth, headerH);
    doc.line(tableX + col1W, y, tableX + col1W, y + headerH);
    doc.line(tableX + col1W + col2W, y, tableX + col1W + col2W, y + headerH);

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text('S. No.', tableX + col1W / 2, y + 3.8, { align: 'center' });
    doc.text('List / Description of Items', tableX + col1W + col2W / 2, y + 3.8, { align: 'center' });
    doc.text('Amount', tableX + col1W + col2W + col3W / 2, y + 3.8, { align: 'center' });
  };

  drawTableHeader(curY);
  curY += headerH;

  const PAGE_1_LIMIT = 15;
  let currentPage = 1;

  for (let i = 0; i < rawItems.length; i++) {
    // If we exceed 15 rows on Page 1, split to Page 2
    if (currentPage === 1 && i >= PAGE_1_LIMIT) {
      doc.addPage('a4', 'portrait');
      currentPage++;
      curY = margin + 2;

      // Continuation header
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.text(`PERSONAL GOODS DECLARATION NOTE - (Page ${currentPage})`, margin, curY);
      doc.setFont('times', 'normal');
      doc.text(`Date : ${formattedDate}`, pageWidth - margin, curY, { align: 'right' });
      curY += 5;

      drawTableHeader(curY);
      curY += headerH;
    } else if (currentPage > 1 && curY + rowH > pageHeight - margin - 40) {
      doc.addPage('a4', 'portrait');
      currentPage++;
      curY = margin + 2;

      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.text(`PERSONAL GOODS DECLARATION NOTE - (Page ${currentPage})`, margin, curY);
      doc.setFont('times', 'normal');
      doc.text(`Date : ${formattedDate}`, pageWidth - margin, curY, { align: 'right' });
      curY += 5;

      drawTableHeader(curY);
      curY += headerH;
    }

    const item = rawItems[i] || { sNo: i + 1, description: '', amount: '' };
    doc.setLineWidth(0.2);
    doc.rect(tableX, curY, contentWidth, rowH);
    doc.line(tableX + col1W, curY, tableX + col1W, curY + rowH);
    doc.line(tableX + col1W + col2W, curY, tableX + col1W + col2W, curY + rowH);

    // S. No.
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(item.sNo || i + 1), tableX + col1W / 2, curY + 3.7, { align: 'center' });

    // Description (auto-wrap inside cell without clipping)
    if (item.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const descLines = doc.splitTextToSize(item.description, col2W - 3);
      doc.text(descLines[0] || '', tableX + col1W + 1.5, curY + 3.7);
    }

    // Amount (center-aligned in column)
    if (item.amount) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(8.5);
      doc.text(String(item.amount), tableX + col1W + col2W + col3W / 2, curY + 3.7, { align: 'center' });
    }

    curY += rowH;
  }

  // Total Amount Row & Amount in Words Row
  if (totalAmount > 0) {
    doc.setLineWidth(0.25);
    doc.rect(tableX, curY, contentWidth, rowH);
    doc.line(tableX + col1W + col2W, curY, tableX + col1W + col2W, curY + rowH);

    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('TOTAL AMOUNT:', tableX + col1W + col2W - 3, curY + 3.7, { align: 'right' });

    doc.setFont('courier', 'bold');
    doc.text(`Rs. ${formatIndianCurrency(totalAmount)}`, tableX + col1W + col2W + col3W / 2, curY + 3.7, {
      align: 'center',
    });
    curY += rowH;

    const words = convertAmountToWordsPersonalDeclaration(totalAmount);
    if (words) {
      doc.setLineWidth(0.25);
      doc.rect(tableX, curY, contentWidth, rowH);

      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.text('AMOUNT IN WORDS:', tableX + 2, curY + 3.7);
      const labelW = doc.getTextWidth('AMOUNT IN WORDS:');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const splitWords = doc.splitTextToSize(words, contentWidth - labelW - 5);
      doc.text(splitWords[0] || '', tableX + labelW + 3, curY + 3.7);
      curY += rowH;
    }
  }

  // 6. DECLARATION Section (Heading & Sentence together on same line)
  curY += 6;
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  const headingText = 'DECLARATION: ';
  const headingW = doc.getTextWidth(headingText);
  const underlineW = doc.getTextWidth('DECLARATION:');
  doc.text(headingText, margin, curY);
  doc.setLineWidth(0.25);
  doc.line(margin, curY + 0.6, margin + underlineW, curY + 0.6);

  const docketText = data.docketNumber || (data as any).consignmentNumber || '_____________________________________';
  const fullStatement = `I hereby declare that the shipment booked vide Docket Number ${docketText} is for Personal use only and does not have any commercial value.`;

  const remainingWords = fullStatement.split(' ');
  let firstLineStr = '';
  while (remainingWords.length > 0) {
    const testLine = firstLineStr ? `${firstLineStr} ${remainingWords[0]}` : remainingWords[0];
    if (doc.getTextWidth(testLine) <= contentWidth - headingW) {
      firstLineStr = testLine;
      remainingWords.shift();
    } else {
      break;
    }
  }

  doc.text(firstLineStr, margin + headingW, curY);

  if (remainingWords.length > 0) {
    const restText = remainingWords.join(' ');
    const splitRest = doc.splitTextToSize(restText, contentWidth);
    for (let r = 0; r < splitRest.length; r++) {
      curY += 4.5;
      doc.text(splitRest[r], margin, curY);
    }
  }
  curY += 4.5;

  // 7. Signature Section (Bottom Right) - Shifted ~3% (9mm) upwards
  const sigY = pageHeight - margin - 27;
  const sigX = pageWidth - margin - 5;

  if (data.signatureBase64 && data.signatureBase64.startsWith('data:image')) {
    try {
      doc.addImage(data.signatureBase64, 'PNG', sigX - 44, sigY - 14, 42, 13);
    } catch {
      // Ignored
    }
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text("Customer's Signature", sigX, sigY, { align: 'right' });

  // 8. Centered Footer: GEO TRANSIT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('GEO TRANSIT', pageWidth / 2, pageHeight - margin + 2, { align: 'center' });

  return doc;
}

/**
 * Trigger immediate client-side download of the personal declaration PDF
 */
export async function downloadPersonalDeclarationPdf(
  data: PersonalDeclarationPdfData,
  fileName?: string
): Promise<void> {
  if (!isValidPersonalDeclarationSignature(data.signatureBase64)) {
    throw new Error(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
  }
  const doc = await generatePersonalDeclarationPdf(data);
  const docketClean = (data.docketNumber || (data as any).consignmentNumber || data.customerName || 'NOTE').replace(
    /[^a-zA-Z0-9_-]/g,
    ''
  );
  const name =
    fileName ||
    `PERSONAL_GOODS_DECLARATION_${docketClean || 'NOTE'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
}

/**
 * Print Personal Declaration Document cleanly using an in-DOM isolated iframe
 * with @page { margin: 0; } to strictly suppress browser-generated headers/footers
 * ('about:blank', date/time, document title, page numbers) while enforcing exact
 * A4 dimensions and 100% visual parity with the Master Template and Live Preview.
 */
export async function printPersonalDeclarationDocument(
  data: PersonalDeclarationPdfData
): Promise<void> {
  if (typeof window === 'undefined') return;

  if (!isValidPersonalDeclarationSignature(data.signatureBase64)) {
    throw new Error(PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE);
  }

  let optimizedData = data;
  if (data.signatureBase64) {
    try {
      const croppedSig = await cropSignatureDataUrl(data.signatureBase64);
      if (croppedSig && croppedSig !== data.signatureBase64) {
        optimizedData = { ...data, signatureBase64: croppedSig };
      }
    } catch {
      // Keep existing
    }
  }

  const htmlContent = generatePersonalDeclarationHtml(optimizedData, { isInteractive: false });

  // Clean up any existing print iframe
  const iframeId = 'personal-declaration-print-frame';
  const existingIframe = document.getElementById(iframeId);
  if (existingIframe && existingIframe.parentNode) {
    existingIframe.parentNode.removeChild(existingIframe);
  }

  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const printDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!printDoc) {
    window.print();
    return;
  }

  printDoc.open();
  printDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Personal Goods Declaration Note</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .personal-declaration-a4-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            min-height: 297mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            background: #FFFFFF !important;
          }
          .personal-declaration-a4-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
        body {
          margin: 0;
          padding: 0;
          background: #FFFFFF;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `);
  printDoc.close();

  setTimeout(() => {
    try {
      iframe.focus();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Error invoking iframe print for personal declaration:', e);
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 60000);
    }
  }, 350);
}
