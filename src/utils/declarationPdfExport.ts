import jsPDF from 'jspdf';
import { formatIndianCurrency } from '@/utils/numberToWords';
import { DeclarationInput, DeclarationRecord } from '@/lib/declarationDb';

export type DeclarationPdfData = (DeclarationInput | DeclarationRecord) & {
  declarationNumber?: string;
  organizationName?: string;
};

export interface GoodsDeclarationRenderOptions {
  isInteractive?: boolean;
}

export const SIGNATURE_REQUIRED_ERROR_MESSAGE =
  "Please provide the Consignor's signature before downloading the Declaration Note PDF.";

/**
 * Strict validator for Consignor Signature data.
 * Considers null, undefined, empty string, non-data URI, or blank canvas data as unsigned.
 */
export function isValidDeclarationSignature(signature?: string | null): boolean {
  if (!signature || typeof signature !== 'string') return false;
  const trimmed = signature.trim();
  if (!trimmed.startsWith('data:image')) return false;
  // A non-blank digital signature stroke has at least 250 base64 characters
  if (trimmed.length < 250) return false;
  return true;
}

/**
 * Automatically crops a canvas to the tight bounding box of its drawn pixels
 * with a small, natural breathing margin to remove all excess transparent space.
 */
export function cropCanvasToBoundingBox(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const alpha = data[(rowOffset + x) * 4 + 3];
      if (alpha > 18) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no strokes found, return original data URL
  if (maxX < minX || maxY < minY) {
    return canvas.toDataURL('image/png');
  }

  // Add small natural margin (12px) around the stroke extremities
  const pad = 12;

  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(width - cropX, (maxX - minX) + pad * 2);
  const cropH = Math.min(height - cropY, (maxY - minY) + pad * 2);

  if (cropW <= 0 || cropH <= 0) {
    return canvas.toDataURL('image/png');
  }

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;

  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) {
    return canvas.toDataURL('image/png');
  }

  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = 'high';

  croppedCtx.drawImage(
    canvas,
    cropX, cropY, cropW, cropH,
    0, 0, cropW, cropH
  );

  return croppedCanvas.toDataURL('image/png');
}

/**
 * Ensures any base64 signature image is tightly cropped to its handwritten boundaries.
 * If running in a non-browser environment or on an invalid URL, safely returns original dataUrl.
 */
export function cropSignatureDataUrl(dataUrl: string): Promise<string> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !dataUrl ||
    !dataUrl.startsWith('data:image')
  ) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);
        const cropped = cropCanvasToBoundingBox(canvas);
        resolve(cropped);
      } catch (e) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Strips HTML tags for clean text rendering
 */
function stripHtml(html: string = ''): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
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
 * Splits a long receiver address into up to 3 lines matching the template's designated address lines
 */
function splitAddressLines(address: string = ''): [string, string, string] {
  const clean = stripHtml(address).trim();
  if (!clean) return ['', '', ''];

  const words = clean.split(/\s+/);
  const lines: string[] = ['', '', ''];
  let lineIdx = 0;

  for (const word of words) {
    // Line 1 is preceded by " Receiver Address: ", so max ~32 chars
    // Line 2 and 3 can take ~46 chars each
    const maxLen = lineIdx === 0 ? 32 : 46;
    const testLine = lines[lineIdx] ? `${lines[lineIdx]} ${word}` : word;
    if (testLine.length <= maxLen) {
      lines[lineIdx] = testLine;
    } else {
      if (lineIdx < 2) {
        lineIdx++;
        lines[lineIdx] = word;
      } else {
        lines[2] = lines[2] ? `${lines[2]} ${word}` : word;
      }
    }
  }

  return [lines[0] || '', lines[1] || '', lines[2] || ''];
}

/**
 * Generates exact 1:1 standalone unscaled A4 HTML representation of the Goods Declaration Note
 * faithfully matching the master reference template (DECLARATION_NOTE_NEW.docx).
 *
 * Sequence of 24 items:
 *  1. GOODS/SHIPMENT – DECLARATION NOTE
 *  2. TO WHOM SO EVER IT MAY CONCERN
 *  3. Consignment Number
 *  4. Consignee's Name
 *  5. Receiver Address (3 designated lines)
 *  6. PIN Code
 *  7. Contact Number
 *  8. Consignor Details
 *  9. Name
 * 10. GST Registered – Yes / No & GST Number
 * 11. Content
 * 12. HSN Code
 * 13. Reason for Transportation
 * 14. Commercial Nature – Yes / No
 * 15. Value of Consignment
 * 16. Amount in Words & Rs. Box
 * 17. Invoice – Yes / No & Invoice Number
 * 18. Challan – Yes / No & Challan Number
 * 19. Declaration statement
 * 20. Signature of the Consignor
 * 21. Date
 * 22. Address (last line of document)
 *
 * Dimensions: 794px width x 1123px height (Standard A4 at 96 DPI: 210mm x 297mm)
 * Margins: 46px top/bottom, 48px left/right (matching Word 720 dxa = 0.5in)
 * Font: Calibri, 'Segoe UI', Arial, sans-serif
 */
export function generateGoodsDeclarationPrintHtml(
  data: DeclarationPdfData,
  options: GoodsDeclarationRenderOptions = {}
): string {
  const isGstYes = Boolean(data.isGstRegistered);
  const isGstNo = data.isGstRegistered === false;

  const isCommYes = Boolean(data.isCommercial);
  const isCommNo = data.isCommercial === false;

  const isInvYes = Boolean(data.hasInvoice);
  const isInvNo = data.hasInvoice === false;

  const isChlYes = Boolean(data.hasChallan);
  const isChlNo = data.hasChallan === false;

  const consignmentNo = (data.consignmentNumber || '').trim();
  const cleanConsignee = stripHtml(data.consigneeNameHtml || data.consigneeName || '');
  const cleanReceiverAddress = stripHtml(
    data.receiverAddressHtml || data.receiverAddress || ''
  ).trim();
  const cleanPin = (data.pinCode || '').trim();
  const contactNo = (data.contactNumber || '').trim();
  const cleanConsignor = stripHtml(data.consignorNameHtml || data.consignorName || '');
  const gstNo = (data.gstNumber || '').trim();
  const cleanContent = stripHtml(data.contentHtml || data.content || '');
  const hsnCode = (data.hsnCode || '').trim();
  const cleanReason = stripHtml(
    data.reasonForTransportationHtml || data.reasonForTransportation || ''
  );
  const valueInrFormatted =
    data.valueInr !== undefined && data.valueInr !== null
      ? formatIndianCurrency(data.valueInr)
      : '';
  const amountWords = (data.amountInWords || '').trim();
  const invoiceVal = (data.invoiceNumber || '').trim();
  const challanVal = (data.challanNumber || '').trim();
  const dateStr = (data.declarationDate || '').trim();
  const cleanConsignorAddr = stripHtml(
    data.consignorAddressHtml || data.consignorAddress || ''
  );

  // Exact checkbox style matching Microsoft Word v:rect with strokecolor #f79646
  const boxStyle =
    'display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 13px; border: 1.5px solid #f79646; background: #FFFFFF; vertical-align: middle; margin-left: 5px; font-size: 11px; font-weight: bold; color: #000000; line-height: 1;';

  const valueBoxStyle =
    'display: inline-flex; align-items: center; justify-content: flex-start; padding: 2px 8px; min-width: 120px; height: 26px; border: 1.5px solid #f79646; background: #FFFFFF; vertical-align: middle; margin-left: 6px; font-size: 13px; font-weight: normal; color: #000000; box-sizing: border-box;';

  return `
    <div style="
      width: 794px;
      min-height: 1123px;
      max-height: 1123px;
      box-sizing: border-box;
      padding: 42px 48px;
      background: #FFFFFF;
      color: #000000;
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.25;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      position: relative;
    ">
      <div>
        <!-- 1. GOODS/SHIPMENT – DECLARATION NOTE -->
        <div style="text-align: center; margin-bottom: 6px;">
          <span style="
            font-size: 24pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #000000;
          ">
            GOODS/SHIPMENT – DECLARATION NOTE
          </span>
        </div>

        <!-- 2. TO WHOM SO EVER IT MAY CONCERN -->
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="
            font-size: 13pt;
            font-weight: bold;
            color: #000000;
          ">
            TO WHOM SO EVER IT MAY CONCERN
          </span>
        </div>

        <!-- 3. Consignment No -->
        <div style="margin-bottom: 11px; font-size: 14pt;">
          <span style="font-weight: bold;">Consignment No:</span>
          ${consignmentNo ? `
            <span style="font-weight: normal; margin-left: 6px;">
              ${escapeHtml(consignmentNo)}
            </span>
          ` : ''}
        </div>

        <!-- 4. Consignee's Name -->
        <div style="margin-bottom: 9px; font-size: 11pt;">
          <span style="font-weight: bold; text-decoration: underline;">Consignee's Name:</span>
          ${cleanConsignee ? `
            <span style="font-weight: normal; margin-left: 6px;">
              ${escapeHtml(cleanConsignee)}
            </span>
          ` : ''}
        </div>

        <!-- 5. Receiver Address -->
        <div style="margin-bottom: 6px; font-size: 11pt; display: flex; align-items: flex-start;">
          <span style="font-weight: bold; white-space: nowrap; margin-right: 6px;">Receiver Address:</span>
          ${cleanReceiverAddress ? `
            <span style="font-weight: normal; word-break: break-word; flex: 1;">
              ${escapeHtml(cleanReceiverAddress)}
            </span>
          ` : ''}
        </div>

        <!-- 6. Pin Code -->
        <div style="margin-bottom: 8px; font-size: 11pt;">
          <span style="font-weight: bold;">Pin Code:</span>
          ${cleanPin ? `
            <span style="font-weight: normal; margin-left: 6px;">
              ${escapeHtml(cleanPin)}
            </span>
          ` : ''}
        </div>

        <!-- 7. Contact Number -->
        <div style="margin-bottom: 13px; font-size: 11pt;">
          <span style="font-weight: bold;">Contact Number:</span>
          ${contactNo ? `
            <span style="font-weight: normal; margin-left: 6px;">
              ${escapeHtml(contactNo)}
            </span>
          ` : ''}
        </div>

        <!-- 8. Consignor Details -->
        <div style="margin-bottom: 8px; font-size: 11pt;">
          <span style="font-weight: bold; text-decoration: underline;">Consignor Details:</span>
        </div>

        <!-- 9. Name -->
        <div style="margin-bottom: 10px; font-size: 14pt;">
          <span style="font-weight: bold;">Name:</span>
          ${cleanConsignor ? `
            <span style="font-weight: normal; margin-left: 6px;">
              ${escapeHtml(cleanConsignor)}
            </span>
          ` : ''}
        </div>

        <!-- 10. GST Registered: Yes / No & GST Number -->
        <div style="margin-bottom: 2px; font-size: 14pt; display: flex; align-items: center;">
          <span style="font-weight: bold; width: 140px;">GST Registered: </span>
          <span style="font-size: 11pt; font-weight: normal; display: inline-flex; align-items: center; width: 75px;">
            Yes <span style="${boxStyle}">${isGstYes ? '✓' : ''}</span>
          </span>
          <span style="font-size: 11pt; margin-left: 20px;">
            <span style="font-weight: bold;">If Yes, GST No:</span> ${gstNo ? `<span style="font-weight: normal; margin-left: 4px;">${escapeHtml(gstNo)}</span>` : ''}
          </span>
        </div>
        <div style="margin-bottom: 10px; font-size: 11pt; display: flex; align-items: center;">
          <span style="width: 140px;"></span>
          <span style="font-weight: normal; display: inline-flex; align-items: center; width: 75px;">
            No <span style="${boxStyle}">${isGstNo ? '✓' : ''}</span>
          </span>
        </div>

        <!-- 11. Content -->
        <div style="margin-bottom: 10px; font-size: 14pt;">
          <span style="font-weight: bold;">Content:</span>
          ${cleanContent ? `
            <span style="font-size: 11pt; font-weight: normal; margin-left: 6px;">
              ${escapeHtml(cleanContent)}
            </span>
          ` : ''}
        </div>

        <!-- 12. HSN Code -->
        <div style="margin-bottom: 10px; font-size: 11pt;">
          <span style="font-weight: bold;">If Consignor or Consignee is GST Registered, mention HSN Code:</span>
          ${hsnCode ? `
            <span style="font-weight: normal; margin-left: 6px;">${escapeHtml(hsnCode)}</span>
          ` : ''}
        </div>

        <!-- 13. Reason for Transportation -->
        <div style="margin-bottom: 10px; font-size: 14pt;">
          <span style="font-weight: bold;">Reason for Transportation:</span>
          ${cleanReason ? `
            <span style="font-size: 11pt; font-weight: normal; margin-left: 6px;">
              ${escapeHtml(cleanReason)}
            </span>
          ` : ''}
        </div>

        <!-- 14. Commercial Nature -->
        <div style="margin-bottom: 10px; font-size: 14pt; display: flex; align-items: center;">
          <span style="font-weight: bold;">If this consignment is of commercial nature:</span>
          <span style="font-size: 11pt; font-weight: normal; display: inline-flex; align-items: center; margin-left: 18px;">
            Yes <span style="${boxStyle}">${isCommYes ? '✓' : ''}</span>
          </span>
          <span style="font-size: 11pt; font-weight: normal; display: inline-flex; align-items: center; margin-left: 36px;">
            No <span style="${boxStyle}">${isCommNo ? '✓' : ''}</span>
          </span>
        </div>

        <!-- 15. Value of Consignment -->
        <div style="margin-bottom: 4px;">
          <span style="font-size: 14pt; font-weight: bold;">Value of Consignment:</span>
          <span style="font-size: 10pt; font-weight: normal;"> (Irrespective of the commercial/Non-commercial nature of consignment)</span>
        </div>

        <!-- 16. Amount in Words & Rs. Box -->
        <div style="margin-bottom: 10px; display: flex; align-items: center;">
          <span style="font-size: 11pt; margin-left: 24px; font-weight: bold;">Rs.</span>
          <span style="${valueBoxStyle}">${valueInrFormatted ? `Rs. ${escapeHtml(valueInrFormatted)}` : ''}</span>
          <span style="font-size: 11pt; margin-left: 18px; font-weight: normal;">
            (Rupees ${amountWords ? `<span style="font-style: italic; font-weight: normal;">${escapeHtml(amountWords)}</span>` : ''})
          </span>
        </div>

        <!-- 17. Invoice: Yes / No & Invoice Number (Preserves horizontal writing line) -->
        <div style="margin-bottom: 2px; font-size: 14pt; display: flex; align-items: center;">
          <span style="font-weight: bold; width: 140px;">Invoice: </span>
          <span style="font-size: 11pt; font-weight: normal; display: inline-flex; align-items: center; width: 75px;">
            Yes <span style="${boxStyle}">${isInvYes ? '✓' : ''}</span>
          </span>
          <span style="font-size: 11pt; margin-left: 20px; display: inline-flex; align-items: baseline;">
            <span style="font-weight: bold;">If Yes, Invoice No:</span>&nbsp;<span style="display: inline-block; min-width: 170px; border-bottom: 1.5px solid #000000; font-weight: normal; padding: 0 4px; vertical-align: baseline;">${invoiceVal ? escapeHtml(invoiceVal) : '&nbsp;'}</span>
          </span>
        </div>
        <div style="margin-bottom: 10px; font-size: 11pt; display: flex; align-items: center;">
          <span style="width: 140px;"></span>
          <span style="font-weight: normal; display: inline-flex; align-items: center; width: 75px;">
            No <span style="${boxStyle}">${isInvNo ? '✓' : ''}</span>
          </span>
        </div>

        <!-- 18. Challan: Yes / No & Challan Number (Preserves horizontal writing line) -->
        <div style="margin-bottom: 2px; font-size: 14pt; display: flex; align-items: center;">
          <span style="font-weight: bold; width: 140px;">Challan: </span>
          <span style="font-size: 11pt; font-weight: normal; display: inline-flex; align-items: center; width: 75px;">
            Yes <span style="${boxStyle}">${isChlYes ? '✓' : ''}</span>
          </span>
          <span style="font-size: 11pt; margin-left: 20px; display: inline-flex; align-items: baseline;">
            <span style="font-weight: bold;">If Yes, Challan No:</span>&nbsp;<span style="display: inline-block; min-width: 170px; border-bottom: 1.5px solid #000000; font-weight: normal; padding: 0 4px; vertical-align: baseline;">${challanVal ? escapeHtml(challanVal) : '&nbsp;'}</span>
          </span>
        </div>
        <div style="margin-bottom: 14px; font-size: 11pt; display: flex; align-items: center;">
          <span style="width: 140px;"></span>
          <span style="font-weight: normal; display: inline-flex; align-items: center; width: 75px;">
            No <span style="${boxStyle}">${isChlNo ? '✓' : ''}</span>
          </span>
        </div>

        <!-- 19. Declaration statement -->
        <div style="margin-bottom: 14px; font-size: 11pt; line-height: 1.35; font-weight: normal;">
          <span>The above is true to the best of my knowledge and if found false, I/we will only be responsible for all cost and consequences arising out of this declaration.</span>
        </div>

        <!-- 20. Signature of the Consignor -->
        <div style="margin-bottom: 12px; width: 340px;">
          <div
            data-signature-trigger="true"
            style="
              height: 82px;
              display: flex;
              align-items: flex-end;
              justify-content: flex-start;
              padding-left: 10px;
              margin-bottom: 2px;
              cursor: ${options.isInteractive ? 'pointer' : 'default'};
            "
          >
            ${data.signatureBase64 && data.signatureBase64.startsWith('data:image') ? `
              <img
                src="${data.signatureBase64}"
                alt="Signature of the Consignor"
                style="
                  max-height: 80px;
                  max-width: 280px;
                  width: auto;
                  height: auto;
                  object-fit: contain;
                  display: block;
                  image-rendering: -webkit-optimize-contrast;
                  filter: contrast(1.15);
                "
              />
            ` : (options.isInteractive ? `
              <span style="font-size: 11px; color: #94A3B8; font-style: italic; padding-bottom: 8px;">
                [Click to Sign Consignor Signature]
              </span>
            ` : '')}
          </div>
          <div style="font-weight: bold; font-size: 11pt; line-height: 1;">
            _____________________________________
          </div>
          <div style="font-weight: bold; font-size: 11pt; padding-left: 48px; margin-top: 4px;">
            Signature of the Consignor
          </div>
        </div>

        <!-- 21. Date -->
        <div style="margin-bottom: 10px; font-size: 11pt;">
          <span style="font-weight: bold;">Date: </span>
          <span style="font-weight: normal; margin-left: 4px;">${dateStr || ''}</span>
        </div>

        <!-- 22. Address (Last Line of Document) -->
        <div style="font-size: 13pt;">
          <span style="font-weight: bold;">Address: </span>
          ${cleanConsignorAddr ? `
            <span style="font-size: 11pt; font-weight: normal; margin-left: 4px;">
              ${escapeHtml(cleanConsignorAddr)}
            </span>
          ` : ''}
        </div>

        <!-- Optional Subtle OTP Verification Stamp if verified -->
        ${data.mobileVerified ? `
          <div style="
            margin-top: 14px;
            padding: 5px 10px;
            border-radius: 4px;
            background-color: #ECFDF5;
            border: 1px solid #A7F3D0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 10px;
            font-family: Arial, sans-serif;
          ">
            <span style="font-weight: bold; color: #065F46;">
              ✓ Consignor Mobile OTP Verified: +91 ${escapeHtml(data.verifiedMobileNumber || data.contactNumber || '')}
            </span>
            <span style="font-weight: 600; color: #64748B;">
              ${data.otpVerifiedAt ? new Date(data.otpVerifiedAt).toLocaleDateString('en-IN') : ''}
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Pure Vector jsPDF Generator (Fallback or Node environment)
 * Faithful to the 24 items of DECLARATION_NOTE_NEW.docx.
 */
export function generateVectorDeclarationPdf(data: DeclarationPdfData): jsPDF {
  if (!isValidDeclarationSignature(data.signatureBase64)) {
    throw new Error(SIGNATURE_REQUIRED_ERROR_MESSAGE);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12.7; // 0.5 inches matching Word 720 dxa
  const contentWidth = pageWidth - margin * 2; // 184.6mm
  const leftX = margin;

  let curY = margin + 10;

  // 1. GOODS/SHIPMENT – DECLARATION NOTE (Centered, bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  const titleText = 'GOODS/SHIPMENT - DECLARATION NOTE';
  doc.text(titleText, pageWidth / 2, curY, { align: 'center' });

  curY += 8;

  // 2. TO WHOM SO EVER IT MAY CONCERN (Centered, bold)
  doc.setFontSize(12);
  doc.text('TO WHOM SO EVER IT MAY CONCERN', pageWidth / 2, curY, { align: 'center' });

  curY += 10;

  // Helper for check box in vector PDF
  const drawCheckbox = (x: number, y: number, checked: boolean) => {
    doc.setDrawColor(247, 150, 70); // #f79646
    doc.setLineWidth(0.35);
    doc.rect(x, y - 3.2, 5.5, 3.8);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('✓', x + 1.2, y - 0.4);
    }
  };

  const lineGap = 6.0;

  // 3. Consignment No
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Consignment No: ', leftX, curY);
  const cnW = doc.getTextWidth('Consignment No: ');
  doc.setFont('helvetica', 'normal');
  doc.text(data.consignmentNumber || '', leftX + cnW, curY);

  curY += lineGap + 1;

  // 4. Consignee's Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const cNameText = "Consignee's Name:";
  doc.text(cNameText, leftX, curY);
  const cNameW = doc.getTextWidth(cNameText);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(leftX, curY + 0.8, leftX + cNameW, curY + 0.8);

  const cleanConsignee = stripHtml(data.consigneeNameHtml || data.consigneeName);
  doc.setFont('helvetica', 'normal');
  doc.text(cleanConsignee || '', leftX + cNameW + 2, curY);

  curY += lineGap;

  // 5. Receiver Address
  const rAddrLabel = 'Receiver Address: ';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(rAddrLabel, leftX, curY);
  const ralW = doc.getTextWidth(rAddrLabel);
  const addrX = leftX + ralW;
  const maxAddrWidth = contentWidth - ralW;

  const cleanAddr = stripHtml(data.receiverAddressHtml || data.receiverAddress).trim();
  doc.setFont('helvetica', 'normal');
  if (cleanAddr) {
    const addrLines: string[] = doc.splitTextToSize(cleanAddr, maxAddrWidth);
    addrLines.forEach((line: string, idx: number) => {
      if (idx > 0) {
        curY += 5;
      }
      doc.text(line, addrX, curY);
    });
  }

  curY += lineGap;

  // 6. Pin Code
  doc.setFont('helvetica', 'bold');
  doc.text('Pin Code: ', leftX, curY);
  const pinW = doc.getTextWidth('Pin Code: ');
  doc.setFont('helvetica', 'normal');
  doc.text((data.pinCode || '').trim(), leftX + pinW, curY);

  curY += lineGap;

  // 7. Contact Number
  doc.setFont('helvetica', 'bold');
  doc.text('Contact Number: ', leftX, curY);
  const cntW = doc.getTextWidth('Contact Number: ');
  doc.setFont('helvetica', 'normal');
  doc.text(data.contactNumber || '', leftX + cntW, curY);

  curY += lineGap + 1;

  // 8. Consignor Details:
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const cdtLabel = 'Consignor Details:';
  doc.text(cdtLabel, leftX, curY);
  const cdtW = doc.getTextWidth(cdtLabel);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(leftX, curY + 0.8, leftX + cdtW, curY + 0.8);

  curY += lineGap;

  // 9. Name:
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Name: ', leftX, curY);
  const nW = doc.getTextWidth('Name: ');
  const cleanConsignor = stripHtml(data.consignorNameHtml || data.consignorName);
  doc.setFont('helvetica', 'normal');
  doc.text(cleanConsignor || '', leftX + nW, curY);

  curY += lineGap + 1;

  // 10. GST Registered: Yes / No
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('GST Registered: ', leftX, curY);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Yes', leftX + 42, curY);
  drawCheckbox(leftX + 51, curY, Boolean(data.isGstRegistered));

  const ifGstLabel = 'If Yes, GST No: ';
  doc.setFont('helvetica', 'bold');
  doc.text(ifGstLabel, leftX + 68, curY);
  const ifGstW = doc.getTextWidth(ifGstLabel);
  doc.setFont('helvetica', 'normal');
  doc.text(data.gstNumber || '', leftX + 68 + ifGstW, curY);

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('No', leftX + 42, curY);
  drawCheckbox(leftX + 51, curY, data.isGstRegistered === false);

  curY += lineGap + 1;

  // 11. Content:
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Content: ', leftX, curY);
  const ctW = doc.getTextWidth('Content: ');
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  const cleanContent = stripHtml(data.contentHtml || data.content);
  doc.text(cleanContent || '', leftX + ctW, curY);

  curY += lineGap;

  // 12. HSN Code
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  const hsnLabel = 'If Consignor or Consignee is GST Registered, mention HSN Code: ';
  doc.text(hsnLabel, leftX, curY);
  const hsnLblW = doc.getTextWidth(hsnLabel);
  doc.setFont('helvetica', 'normal');
  doc.text(data.hsnCode || '', leftX + hsnLblW, curY);

  curY += lineGap;

  // 13. Reason for Transportation:
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Reason for Transportation: ', leftX, curY);
  const rftW = doc.getTextWidth('Reason for Transportation: ');
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  const cleanReason = stripHtml(data.reasonForTransportationHtml || data.reasonForTransportation);
  doc.text(cleanReason || '', leftX + rftW, curY);

  curY += lineGap + 1;

  // 14. Commercial Nature
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('If this consignment is of commercial nature: ', leftX, curY);
  const cmnW = doc.getTextWidth('If this consignment is of commercial nature: ');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Yes', leftX + cmnW + 4, curY);
  drawCheckbox(leftX + cmnW + 13, curY, Boolean(data.isCommercial));

  doc.text('No', leftX + cmnW + 28, curY);
  drawCheckbox(leftX + cmnW + 36, curY, data.isCommercial === false);

  curY += lineGap + 1;

  // 15. Value of Consignment :(
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Value of Consignment: ', leftX, curY);
  const vocW = doc.getTextWidth('Value of Consignment: ');
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('(Irrespective of the commercial/Non-commercial nature of consignment)', leftX + vocW, curY);

  curY += 6;

  // 16. Rs. Box & Amount in words
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Rs. ', leftX + 6, curY);
  const inrValStr = data.valueInr ? `Rs. ${formatIndianCurrency(data.valueInr)}` : '';
  doc.setDrawColor(247, 150, 70);
  doc.setLineWidth(0.35);
  doc.rect(leftX + 14, curY - 4.5, 30, 6.5);
  if (inrValStr) {
    doc.setFont('helvetica', 'normal');
    doc.text(inrValStr, leftX + 16, curY - 0.2);
  }

  doc.setFont('helvetica', 'italic');
  doc.text('(Rupees ' + (data.amountInWords || '') + ')', leftX + 48, curY);

  curY += lineGap + 1;

  // 17. Invoice: Yes / No (Preserves horizontal writing line)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice: ', leftX, curY);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Yes', leftX + 42, curY);
  drawCheckbox(leftX + 51, curY, Boolean(data.hasInvoice));

  const invLbl = 'If Yes, Invoice No: ';
  doc.setFont('helvetica', 'bold');
  doc.text(invLbl, leftX + 68, curY);
  const invLblW = doc.getTextWidth(invLbl);
  const invLineX = leftX + 68 + invLblW;
  const invLineW = 45;
  doc.setLineWidth(0.35);
  doc.setDrawColor(0, 0, 0);
  doc.line(invLineX, curY + 0.8, invLineX + invLineW, curY + 0.8);
  if (data.invoiceNumber) {
    doc.setFont('helvetica', 'normal');
    doc.text(String(data.invoiceNumber), invLineX + 1, curY);
  }

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('No', leftX + 42, curY);
  drawCheckbox(leftX + 51, curY, data.hasInvoice === false);

  curY += lineGap + 1;

  // 18. Challan: Yes / No (Preserves horizontal writing line)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Challan: ', leftX, curY);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Yes', leftX + 42, curY);
  drawCheckbox(leftX + 51, curY, Boolean(data.hasChallan));

  const chlLbl = 'If Yes, Challan No: ';
  doc.setFont('helvetica', 'bold');
  doc.text(chlLbl, leftX + 68, curY);
  const chlLblW = doc.getTextWidth(chlLbl);
  const chlLineX = leftX + 68 + chlLblW;
  const chlLineW = 45;
  doc.setLineWidth(0.35);
  doc.setDrawColor(0, 0, 0);
  doc.line(chlLineX, curY + 0.8, chlLineX + chlLineW, curY + 0.8);
  if (data.challanNumber) {
    doc.setFont('helvetica', 'normal');
    doc.text(String(data.challanNumber), chlLineX + 1, curY);
  }

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('No', leftX + 42, curY);
  drawCheckbox(leftX + 51, curY, data.hasChallan === false);

  curY += lineGap + 2;

  // 19. Declaration statement
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  const declText =
    'The above is true to the best of my knowledge and if found false, I/we will only be responsible for all cost and consequences arising out of this declaration.';
  const declLines = doc.splitTextToSize(declText, contentWidth);
  doc.text(declLines, leftX, curY);
  curY += declLines.length * 4.8 + 5;

  // 20. Signature of the Consignor (Enhanced dimensions, sharp resolution, natural placement)
  const maxSigW = 70; // mm (~265-280px equivalent on A4)
  const maxSigH = 22; // mm (~80-85px equivalent on A4)
  if (data.signatureBase64 && data.signatureBase64.startsWith('data:image')) {
    try {
      let renderW = maxSigW;
      let renderH = maxSigH;
      try {
        const imgProps = (doc as any).getImageProperties(data.signatureBase64);
        if (imgProps && imgProps.width && imgProps.height) {
          const aspect = imgProps.width / imgProps.height;
          if (aspect > maxSigW / maxSigH) {
            renderW = maxSigW;
            renderH = maxSigW / aspect;
          } else {
            renderH = maxSigH;
            renderW = maxSigH * aspect;
          }
        }
      } catch {
        // Fallback to max dimensions
      }
      // Place signature resting directly above the underline
      const sigY = curY + (maxSigH - renderH);
      doc.addImage(data.signatureBase64, 'PNG', leftX + 4, sigY, renderW, renderH, undefined, 'FAST');
    } catch (e) {
      // ignore
    }
  }
  curY += maxSigH + 1.5;
  doc.setFont('helvetica', 'bold');
  doc.text('_____________________________________', leftX, curY);
  curY += 4.5;
  doc.text('            Signature of the Consignor', leftX, curY);

  curY += lineGap + 1;

  // 21. Date:
  doc.setFont('helvetica', 'bold');
  doc.text(' Date: ', leftX, curY);
  const dtW = doc.getTextWidth(' Date: ');
  doc.setFont('helvetica', 'normal');
  doc.text(data.declarationDate || '', leftX + dtW, curY);

  curY += lineGap + 1;

  // 22. Address (Last line)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Address: ', leftX, curY);
  const addrWL = doc.getTextWidth('Address: ');
  doc.setFontSize(10.5);
  const cleanCsAddr = stripHtml(data.consignorAddressHtml || data.consignorAddress);
  doc.text(cleanCsAddr || '', leftX + addrWL, curY);

  return doc;
}

/**
 * Generate A4 PDF for Goods Declaration Note using high-resolution unscaled DOM rasterization
 * with 100% vector fallback.
 */
export async function generateDeclarationPdf(data: DeclarationPdfData): Promise<jsPDF> {
  if (!isValidDeclarationSignature(data.signatureBase64)) {
    throw new Error(SIGNATURE_REQUIRED_ERROR_MESSAGE);
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
      // Keep existing
    }
  }

  // If in browser, create dedicated pristine unscaled A4 container
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // Exactly 210mm at 96 DPI
    container.style.background = '#FFFFFF';
    container.style.color = '#000000';
    container.style.zIndex = '-9999';
    container.style.transform = 'none'; // CRUCIAL: Absolutely NO scaling transforms!
    container.innerHTML = generateGoodsDeclarationPrintHtml(optimizedData);

    document.body.appendChild(container);

    try {
      // 1. Wait for document fonts to be ready
      if (document.fonts) {
        await document.fonts.ready;
      }

      // 2. Allow any embedded signature image to fully decode
      const img = container.querySelector('img');
      if (img && !img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 300);
        });
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(container, {
        scale: 2.5, // 240-300 DPI crisp print resolution without memory overload
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: 794,
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight, undefined, 'FAST');
      } else {
        const maxChunkHeightPx = Math.floor((canvas.width * pageHeight) / pageWidth);
        let renderedHeightPx = 0;
        let pageIndex = 0;

        while (renderedHeightPx < canvas.height) {
          if (pageIndex > 0) {
            doc.addPage('a4', 'portrait');
          }

          const currentChunkHeightPx = Math.min(maxChunkHeightPx, canvas.height - renderedHeightPx);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = currentChunkHeightPx;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0, renderedHeightPx, canvas.width, currentChunkHeightPx,
              0, 0, canvas.width, currentChunkHeightPx
            );
          }

          const chunkImgData = pageCanvas.toDataURL('image/png');
          const chunkMmHeight = (currentChunkHeightPx * pageWidth) / canvas.width;
          doc.addImage(chunkImgData, 'PNG', 0, 0, pageWidth, chunkMmHeight, undefined, 'FAST');

          renderedHeightPx += currentChunkHeightPx;
          pageIndex++;
        }
      }

      return doc;
    } catch (err) {
      console.warn('DOM capture fallback to vector jsPDF for declaration note:', err);
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  // Fallback to pure vector jsPDF
  return generateVectorDeclarationPdf(data);
}

/**
 * Trigger immediate client-side download of the declaration PDF
 */
export async function downloadDeclarationPdf(
  data: DeclarationPdfData,
  fileName?: string
): Promise<void> {
  if (!isValidDeclarationSignature(data.signatureBase64)) {
    throw new Error(SIGNATURE_REQUIRED_ERROR_MESSAGE);
  }

  const doc = await generateDeclarationPdf(data);
  const name =
    fileName ||
    `GOODS_DECLARATION_NOTE_${data.consignmentNumber ? data.consignmentNumber.replace(/[^a-zA-Z0-9_-]/g, '') : 'NOTE'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
}

/**
 * Print the Goods Declaration Document cleanly using an in-DOM isolated iframe
 * with @page { margin: 0; } to strictly suppress browser-generated headers/footers
 * ('about:blank', date/time, document title, page numbers) while enforcing exact
 * A4 dimensions and 100% visual parity with the Master Template and Live Preview.
 */
export async function printDeclarationDocument(data: DeclarationPdfData): Promise<void> {
  if (typeof window === 'undefined') return;

  if (!isValidDeclarationSignature(data.signatureBase64)) {
    throw new Error(SIGNATURE_REQUIRED_ERROR_MESSAGE);
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

  const htmlContent = generateGoodsDeclarationPrintHtml(optimizedData);

  // Clean up any existing print iframe
  const iframeId = 'goods-declaration-print-frame';
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
    <html>
      <head>
        <title></title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          *, *:before, *:after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            background: #FFFFFF !important;
            font-family: Calibri, 'Segoe UI', Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-page-wrapper {
            width: 210mm !important;
            min-height: 297mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            background: #FFFFFF !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-doc-frame {
            width: 100% !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
        </style>
      </head>
      <body>
        <div class="print-page-wrapper">
          <div class="print-doc-frame">
            ${htmlContent}
          </div>
        </div>
      </body>
    </html>
  `);
  printDoc.close();

  const printWindow = iframe.contentWindow;
  if (!printWindow) return;

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.warn('Direct iframe print error, fallback to window.print:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2500);
    }
  };

  const images = printDoc.images;
  if (images.length > 0) {
    let loadedCount = 0;
    const totalCount = images.length;
    let finished = false;

    const onImageSettled = () => {
      loadedCount++;
      if (loadedCount >= totalCount && !finished) {
        finished = true;
        setTimeout(triggerPrint, 200);
      }
    };

    for (let i = 0; i < totalCount; i++) {
      if (images[i].complete) {
        onImageSettled();
      } else {
        images[i].onload = onImageSettled;
        images[i].onerror = onImageSettled;
      }
    }

    setTimeout(() => {
      if (!finished) {
        finished = true;
        triggerPrint();
      }
    }, 1200);
  } else {
    setTimeout(triggerPrint, 150);
  }
}
