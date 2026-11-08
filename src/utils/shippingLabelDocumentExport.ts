import ExcelJS from 'exceljs';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  PageOrientation,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import JsBarcode from 'jsbarcode';
import { formatPackageSequence } from '@/lib/shippingLabel';

export interface ShippingLabelExportData {
  // TO (Recipient) Section
  toName: string;
  toContactPerson?: string;
  toIncludeContactPerson?: boolean;
  toAddress: string;
  toAddressHtml?: string;
  toCity?: string;
  toState?: string;
  toPincode?: string;
  toMobile?: string;

  // FROM (Sender) Section
  fromName: string;
  fromContactPerson?: string;
  fromIncludeContactPerson?: boolean;
  fromAddress: string;
  fromAddressHtml?: string;
  fromCity?: string;
  fromState?: string;
  fromPincode?: string;
  fromMobile?: string;

  // Metadata
  trackingNumber?: string;
  courierCompany?: string;
  quantity?: number;
  barcodeDataUrl?: string;
}

/**
 * Strips HTML tags and preserves line breaks
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generates an in-memory PNG barcode data URL for Code 128
 */
export function generateBarcodeDataUrl(text: string): string | undefined {
  if (!text || typeof document === 'undefined') return undefined;
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text.trim(), {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      height: 48,
      width: 2.2,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

/**
 * Converts base64 data URL to Uint8Array safely across browser and node
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const base64Index = dataUrl.indexOf(',');
    const base64 = base64Index !== -1 ? dataUrl.slice(base64Index + 1) : dataUrl;
    if (typeof atob === 'function') {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } else if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(base64, 'base64'));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper to download Blob in browser
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ============================================================================
// 1. EXCEL EXPORT (.xlsx)
// ============================================================================

interface ExcelLabelDrawOptions {
  sheet: ExcelJS.Worksheet;
  startRow: number;
  data: ShippingLabelExportData;
  sequenceText: string;
}

/**
 * Draws a professionally formatted shipping label card inside an Excel worksheet
 */
function drawExcelShippingLabelCard({
  sheet,
  startRow,
  data,
  sequenceText,
}: ExcelLabelDrawOptions): number {
  const courierName = data.courierCompany || 'GEO TRANSIT EXPRESS LOGISTICS';
  const cleanTracking = data.trackingNumber ? data.trackingNumber.trim() : '';

  const toCleanAddress = data.toAddressHtml
    ? htmlToPlainText(data.toAddressHtml)
    : data.toAddress || 'Address Line 1';
  const fromCleanAddress = data.fromAddressHtml
    ? htmlToPlainText(data.fromAddressHtml)
    : data.fromAddress || 'Address Line 1';

  const toContact =
    data.toIncludeContactPerson && data.toContactPerson ? data.toContactPerson.trim() : '';
  const fromContact =
    data.fromIncludeContactPerson && data.fromContactPerson ? data.fromContactPerson.trim() : '';

  let r = startRow;

  // 1. Courier Branding Banner (Row r)
  sheet.mergeCells(`B${r}:D${r}`);
  const titleCell = sheet.getCell(`B${r}`);
  titleCell.value = courierName.toUpperCase();
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F4C3A' }, // Deep Emerald
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(r).height = 32;

  // 2. Tracking & Sequence Row (Row r+1)
  r++;
  sheet.mergeCells(`B${r}:C${r}`);
  const trackCell = sheet.getCell(`B${r}`);
  trackCell.value = cleanTracking ? `CONSIGNMENT NO: ${cleanTracking}` : 'CONSIGNMENT NO: PENDING / DIRECT';
  trackCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  trackCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  trackCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const pkgCell = sheet.getCell(`D${r}`);
  pkgCell.value = sequenceText ? `PKG: ${sequenceText}` : 'PKG: 01 / 01';
  pkgCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  pkgCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  pkgCell.alignment = { vertical: 'middle', horizontal: 'right' };
  sheet.getRow(r).height = 24;

  // 3. TO SECTION HEADER (Row r+1)
  r++;
  sheet.mergeCells(`B${r}:D${r}`);
  const toHeader = sheet.getCell(`B${r}`);
  toHeader.value = 'TO (RECIPIENT)';
  toHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  toHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Deep Blue
  };
  toHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(r).height = 24;

  // 4. TO Recipient Name (Row r+1)
  r++;
  sheet.getCell(`B${r}`).value = 'Name:';
  sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  sheet.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.mergeCells(`C${r}:D${r}`);
  const toNameCell = sheet.getCell(`C${r}`);
  toNameCell.value = data.toName || 'Recipient / Company Name';
  toNameCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
  toNameCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(r).height = 24;

  // 5. TO Contact Person (if provided)
  if (toContact) {
    r++;
    sheet.getCell(`B${r}`).value = 'Attention:';
    sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
    sheet.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.mergeCells(`C${r}:D${r}`);
    const toAttnCell = sheet.getCell(`C${r}`);
    toAttnCell.value = toContact;
    toAttnCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF334155' } };
    toAttnCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(r).height = 22;
  }

  // 6. TO Address
  r++;
  sheet.getCell(`B${r}`).value = 'Address:';
  sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  sheet.getCell(`B${r}`).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
  sheet.mergeCells(`C${r}:D${r}`);
  const toAddrCell = sheet.getCell(`C${r}`);
  toAddrCell.value = toCleanAddress;
  toAddrCell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
  toAddrCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  const toAddrLines = toCleanAddress.split('\n').length;
  sheet.getRow(r).height = Math.max(28, Math.min(80, toAddrLines * 18 + 10));

  // 7. TO City, State & Pincode
  r++;
  sheet.getCell(`B${r}`).value = 'City/State:';
  sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  sheet.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  const toCityState = [data.toCity, data.toState].filter(Boolean).join(', ');
  sheet.getCell(`C${r}`).value = toCityState || 'City, State';
  sheet.getCell(`C${r}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
  sheet.getCell(`C${r}`).alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getCell(`D${r}`).value = data.toPincode ? `PIN: ${data.toPincode.trim()}` : '';
  sheet.getCell(`D${r}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
  sheet.getCell(`D${r}`).alignment = { vertical: 'middle', horizontal: 'right' };
  sheet.getRow(r).height = 24;

  // 8. TO Mobile
  r++;
  sheet.getCell(`B${r}`).value = 'Mobile:';
  sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  sheet.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.mergeCells(`C${r}:D${r}`);
  const toMobCell = sheet.getCell(`C${r}`);
  toMobCell.value = data.toMobile || '—';
  toMobCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
  toMobCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(r).height = 24;

  // 9. Standard Gap Between TO and FROM Sections (matches 30mm gap)
  r++;
  sheet.getRow(r).height = 14;
  r++;
  sheet.getRow(r).height = 14;

  // 10. FROM SECTION HEADER
  r++;
  sheet.mergeCells(`B${r}:D${r}`);
  const fromHeader = sheet.getCell(`B${r}`);
  fromHeader.value = 'FROM (SENDER)';
  fromHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  fromHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' }, // Slate-700
  };
  fromHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(r).height = 24;

  // 11. FROM Sender Name
  r++;
  sheet.getCell(`B${r}`).value = 'Name:';
  sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  sheet.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.mergeCells(`C${r}:D${r}`);
  const fromNameCell = sheet.getCell(`C${r}`);
  fromNameCell.value = data.fromName || 'Sender / Company Name';
  fromNameCell.font = { name: 'Calibri', size: 11.5, bold: true, color: { argb: 'FF000000' } };
  fromNameCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(r).height = 24;

  // 12. FROM Contact Person (if provided)
  if (fromContact) {
    r++;
    sheet.getCell(`B${r}`).value = 'Attention:';
    sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
    sheet.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    sheet.mergeCells(`C${r}:D${r}`);
    const fromAttnCell = sheet.getCell(`C${r}`);
    fromAttnCell.value = fromContact;
    fromAttnCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF334155' } };
    fromAttnCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(r).height = 22;
  }

  // 13. FROM Address
  r++;
  sheet.getCell(`B${r}`).value = 'Address:';
  sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  sheet.getCell(`B${r}`).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
  sheet.mergeCells(`C${r}:D${r}`);
  const fromAddrCell = sheet.getCell(`C${r}`);
  fromAddrCell.value = fromCleanAddress;
  fromAddrCell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
  fromAddrCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  const fromAddrLines = fromCleanAddress.split('\n').length;
  sheet.getRow(r).height = Math.max(28, Math.min(80, fromAddrLines * 18 + 10));

  // 14. FROM City, State & Pincode
  r++;
  sheet.getCell(`B${r}`).value = 'City/State:';
  sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  sheet.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  const fromCityState = [data.fromCity, data.fromState].filter(Boolean).join(', ');
  sheet.getCell(`C${r}`).value = fromCityState || 'City, State';
  sheet.getCell(`C${r}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
  sheet.getCell(`C${r}`).alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getCell(`D${r}`).value = data.fromPincode ? `PIN: ${data.fromPincode.trim()}` : '';
  sheet.getCell(`D${r}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
  sheet.getCell(`D${r}`).alignment = { vertical: 'middle', horizontal: 'right' };
  sheet.getRow(r).height = 24;

  // 15. FROM Mobile
  r++;
  sheet.getCell(`B${r}`).value = 'Mobile:';
  sheet.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  sheet.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.mergeCells(`C${r}:D${r}`);
  const fromMobCell = sheet.getCell(`C${r}`);
  fromMobCell.value = data.fromMobile || '—';
  fromMobCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
  fromMobCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(r).height = 24;

  // 16. Label Footer Note
  r++;
  sheet.mergeCells(`B${r}:D${r}`);
  const footerCell = sheet.getCell(`B${r}`);
  footerCell.value = 'GEO TRANSIT LOGISTICS • OFFICIAL ADDRESS SHIPPING LABEL';
  footerCell.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(r).height = 22;

  // 17. Apply clean inner borders & outer container frame
  const endRow = r;
  const thinBorder: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFE2E8F0' } };

  for (let rowIdx = startRow; rowIdx <= endRow; rowIdx++) {
    for (const colLetter of ['B', 'C', 'D']) {
      const cell = sheet.getCell(`${colLetter}${rowIdx}`);
      const curBorder = cell.border || {};

      cell.border = {
        top: rowIdx === startRow ? { style: 'medium', color: { argb: 'FF0F4C3A' } } : curBorder.top || thinBorder,
        bottom: rowIdx === endRow ? { style: 'medium', color: { argb: 'FF0F4C3A' } } : curBorder.bottom || thinBorder,
        left: colLetter === 'B' ? { style: 'medium', color: { argb: 'FF0F4C3A' } } : curBorder.left || thinBorder,
        right: colLetter === 'D' ? { style: 'medium', color: { argb: 'FF0F4C3A' } } : curBorder.right || thinBorder,
      };
    }
  }

  return endRow;
}

/**
 * Configure standard page setup for A4 printing on an Excel worksheet
 */
function applyA4SheetPrintSetup(sheet: ExcelJS.Worksheet): void {
  sheet.columns = [
    { width: 3 },  // Col A: Left margin
    { width: 14 }, // Col B: Label headers
    { width: 44 }, // Col C: Main content
    { width: 24 }, // Col D: Right content / PIN
    { width: 3 },  // Col E: Right margin
  ];

  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
    showGridLines: false,
  };
}

/**
 * Downloads the generated shipping label in Excel (.xlsx) format
 * Supports single and multiple label copies based on multiple-print quantity.
 */
export async function exportShippingLabelToExcel(data: ShippingLabelExportData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GEO TRANSIT Shipping Label Engine';
  workbook.created = new Date();

  const totalQuantity = Math.max(1, Math.min(100, Math.floor(Number(data.quantity) || 1)));

  if (totalQuantity === 1) {
    // Single Label
    const sheet = workbook.addWorksheet('Shipping Label');
    applyA4SheetPrintSetup(sheet);
    drawExcelShippingLabelCard({
      sheet,
      startRow: 2,
      data,
      sequenceText: '01 / 01',
    });
  } else {
    // Multi-copy mode:
    // 1. Sheet 1 contains all copies stacked with page breaks for seamless multi-page A4 printing
    const continuousSheet = workbook.addWorksheet('All Labels (Printable)');
    applyA4SheetPrintSetup(continuousSheet);

    let currentRow = 2;
    for (let i = 0; i < totalQuantity; i++) {
      const seqText = formatPackageSequence(i + 1, totalQuantity);
      const endRow = drawExcelShippingLabelCard({
        sheet: continuousSheet,
        startRow: currentRow,
        data,
        sequenceText: seqText,
      });

      // Insert page break after each label (except the last)
      if (i < totalQuantity - 1) {
        continuousSheet.getRow(endRow).addPageBreak();
        currentRow = endRow + 3; // Space before next label on following page
      }
    }

    // 2. Also create individual tabs for each label copy so users can inspect/print individually
    for (let i = 0; i < totalQuantity; i++) {
      const seqText = formatPackageSequence(i + 1, totalQuantity);
      const copySheet = workbook.addWorksheet(`Label ${i + 1}`);
      applyA4SheetPrintSetup(copySheet);
      drawExcelShippingLabelCard({
        sheet: copySheet,
        startRow: 2,
        data,
        sequenceText: seqText,
      });
    }
  }

  const cleanTracking = data.trackingNumber ? data.trackingNumber.trim() : 'consignment';
  const qtySuffix = totalQuantity > 1 ? `-qty-${totalQuantity}` : '';
  const filename = `shipping-label-${cleanTracking}${qtySuffix}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBrowserDownload(blob, filename);
}

// ============================================================================
// 2. MICROSOFT WORD EXPORT (.docx)
// ============================================================================

/**
 * Downloads the generated shipping label in Microsoft Word (.docx) format
 * Maintains exact layout and structure matching the live address label preview:
 * - Top scannable barcode & tracking number
 * - TO (Recipient) section
 * - 30mm vertical gap
 * - FROM (Sender) section
 * - A4 printing format with clean margins and support for multiple labels in a single document
 */
export async function exportShippingLabelToWord(data: ShippingLabelExportData): Promise<void> {
  const totalQuantity = Math.max(1, Math.min(100, Math.floor(Number(data.quantity) || 1)));
  const cleanTracking = data.trackingNumber ? data.trackingNumber.trim() : '';

  // Generate barcode image if tracking number is present
  const barcodeDataUrl = data.barcodeDataUrl || (cleanTracking ? generateBarcodeDataUrl(cleanTracking) : undefined);
  const barcodeBytes = barcodeDataUrl ? dataUrlToUint8Array(barcodeDataUrl) : null;

  const toCleanAddress = data.toAddressHtml
    ? htmlToPlainText(data.toAddressHtml)
    : data.toAddress || 'Address Line 1';
  const fromCleanAddress = data.fromAddressHtml
    ? htmlToPlainText(data.fromAddressHtml)
    : data.fromAddress || 'Address Line 1';

  const toContact =
    data.toIncludeContactPerson && data.toContactPerson ? data.toContactPerson.trim() : '';
  const fromContact =
    data.fromIncludeContactPerson && data.fromContactPerson ? data.fromContactPerson.trim() : '';

  const docChildren: (Paragraph | Table)[] = [];

  for (let i = 0; i < totalQuantity; i++) {
    const isFirst = i === 0;
    const seqText = totalQuantity > 1 ? formatPackageSequence(i + 1, totalQuantity) : '01 / 01';

    // Page Break between multiple labels
    if (!isFirst) {
      docChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    // Label card container elements
    const labelElements: Paragraph[] = [];

    // TOP ROUTING BARCODE & TRACKING NUMBER (Rendered when tracking number is present)
    if (cleanTracking) {
      if (barcodeBytes) {
        labelElements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            children: [
              new ImageRun({
                data: barcodeBytes,
                type: 'png',
                transformation: {
                  width: 250,
                  height: 48,
                },
              }),
            ],
          })
        );
      }

      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 180 },
          children: [
            new TextRun({
              text: cleanTracking,
              font: 'Consolas',
              size: 24, // 12pt
              bold: true,
              color: '000000',
            }),
            ...(totalQuantity > 1
              ? [
                  new TextRun({
                    text: `   [PKG: ${seqText}]`,
                    font: 'Calibri',
                    size: 20, // 10pt
                    bold: true,
                    color: '475569',
                  }),
                ]
              : []),
          ],
        })
      );
    }

    // ----------------------------------------------------
    // SECTION 1: TO (RECIPIENT)
    // ----------------------------------------------------
    // Heading: TO
    labelElements.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 100, after: 60 },
        children: [
          new TextRun({
            text: 'TO',
            font: 'Calibri',
            size: 28, // 14pt
            bold: true,
            color: '000000',
          }),
        ],
      })
    );

    // Recipient Name
    labelElements.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: data.toName || 'Recipient / Company Name',
            font: 'Calibri',
            size: 26, // 13pt
            bold: true,
            color: '000000',
          }),
        ],
      })
    );

    // Contact Person (if provided)
    if (toContact) {
      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({
              text: `Attn: ${toContact}`,
              font: 'Calibri',
              size: 21, // 10.5pt
              bold: true,
              color: '334155',
            }),
          ],
        })
      );
    }

    // Address Lines
    const toAddressLines = toCleanAddress.split('\n').filter(Boolean);
    if (toAddressLines.length === 0) {
      toAddressLines.push('Address Line 1');
    }
    toAddressLines.forEach((line) => {
      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 30 },
          children: [
            new TextRun({
              text: line,
              font: 'Calibri',
              size: 21, // 10.5pt
              color: '0F172A',
            }),
          ],
        })
      );
    });

    // City, State & Pincode
    const toCityState = [data.toCity, data.toState].filter(Boolean).join(', ');
    const toPinText = data.toPincode ? (toCityState ? ` - ${data.toPincode.trim()}` : `PIN: ${data.toPincode.trim()}`) : '';
    if (toCityState || toPinText) {
      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 40, after: 40 },
          children: [
            ...(toCityState
              ? [
                  new TextRun({
                    text: toCityState,
                    font: 'Calibri',
                    size: 22, // 11pt
                    bold: true,
                    color: '000000',
                  }),
                ]
              : []),
            ...(toPinText
              ? [
                  new TextRun({
                    text: toPinText,
                    font: 'Calibri',
                    size: 22, // 11pt
                    bold: true,
                    color: '000000',
                  }),
                ]
              : []),
          ],
        })
      );
    }

    // Mobile Number
    if (data.toMobile && data.toMobile.trim() !== '—') {
      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 40, after: 80 },
          children: [
            new TextRun({
              text: 'Mobile: ',
              font: 'Calibri',
              size: 21,
              bold: true,
              color: '000000',
            }),
            new TextRun({
              text: data.toMobile,
              font: 'Consolas',
              size: 21,
              bold: true,
              color: '000000',
            }),
          ],
        })
      );
    }

    // ----------------------------------------------------
    // EXACT 30MM VERTICAL GAP BETWEEN TO AND FROM SECTIONS
    // (Matches the live address label preview layout)
    // 30mm = ~1700 twips
    // ----------------------------------------------------
    labelElements.push(
      new Paragraph({
        spacing: { before: 1700, after: 0 },
        children: [],
      })
    );

    // ----------------------------------------------------
    // SECTION 2: FROM (SENDER)
    // ----------------------------------------------------
    // Heading: FROM
    labelElements.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: 'FROM',
            font: 'Calibri',
            size: 28, // 14pt
            bold: true,
            color: '000000',
          }),
        ],
      })
    );

    // Sender Name
    labelElements.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: data.fromName || 'Sender / Company Name',
            font: 'Calibri',
            size: 25, // 12.5pt
            bold: true,
            color: '000000',
          }),
        ],
      })
    );

    // Contact Person (if provided)
    if (fromContact) {
      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({
              text: `Attn: ${fromContact}`,
              font: 'Calibri',
              size: 21, // 10.5pt
              bold: true,
              color: '334155',
            }),
          ],
        })
      );
    }

    // Address Lines
    const fromAddressLines = fromCleanAddress.split('\n').filter(Boolean);
    if (fromAddressLines.length === 0) {
      fromAddressLines.push('Address Line 1');
    }
    fromAddressLines.forEach((line) => {
      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 30 },
          children: [
            new TextRun({
              text: line,
              font: 'Calibri',
              size: 21, // 10.5pt
              color: '0F172A',
            }),
          ],
        })
      );
    });

    // City, State & Pincode
    const fromCityState = [data.fromCity, data.fromState].filter(Boolean).join(', ');
    const fromPinText = data.fromPincode ? (fromCityState ? ` - ${data.fromPincode.trim()}` : `PIN: ${data.fromPincode.trim()}`) : '';
    if (fromCityState || fromPinText) {
      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 40, after: 40 },
          children: [
            ...(fromCityState
              ? [
                  new TextRun({
                    text: fromCityState,
                    font: 'Calibri',
                    size: 22, // 11pt
                    bold: true,
                    color: '000000',
                  }),
                ]
              : []),
            ...(fromPinText
              ? [
                  new TextRun({
                    text: fromPinText,
                    font: 'Calibri',
                    size: 22, // 11pt
                    bold: true,
                    color: '000000',
                  }),
                ]
              : []),
          ],
        })
      );
    }

    // Mobile Number
    if (data.fromMobile && data.fromMobile.trim() !== '—') {
      labelElements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 40, after: 80 },
          children: [
            new TextRun({
              text: 'Mobile: ',
              font: 'Calibri',
              size: 21,
              bold: true,
              color: '000000',
            }),
            new TextRun({
              text: data.fromMobile,
              font: 'Consolas',
              size: 21,
              bold: true,
              color: '000000',
            }),
          ],
        })
      );
    }

    // Push all label elements directly to document children
    labelElements.forEach((el) => docChildren.push(el));
  }

  // Construct A4 Word Document with Standard Printable Margins (1440 twips = 1.0 inch, 25mm padding)
  const doc = new Document({
    creator: 'GEO TRANSIT Shipping Label Engine',
    title: 'Shipping Address Label',
    description: 'Generated shipping label formatted for Microsoft Word and A4 printing',
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: 1417,    // ~25mm
              right: 1417,  // ~25mm
              bottom: 1417, // ~25mm
              left: 1417,   // ~25mm
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const cleanTrackingName = cleanTracking || 'consignment';
  const qtySuffix = totalQuantity > 1 ? `-qty-${totalQuantity}` : '';
  const filename = `shipping-label-${cleanTrackingName}${qtySuffix}.docx`;

  const blob = await Packer.toBlob(doc);
  triggerBrowserDownload(blob, filename);
}

