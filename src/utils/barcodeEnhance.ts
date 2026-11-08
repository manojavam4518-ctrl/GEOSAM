/**
 * Barcode & QR Code Enhancement Utility
 * Handles CODE128 and 2D QR code generation with inch-based dimensions,
 * multi-entry parsing, Excel/CSV spreadsheet importing, PDF export, PNG export, and sharing.
 */

import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export type BarcodeFormat = 'CODE128' | 'QR';

export interface BarcodeGenerateOptions {
  text: string;
  type: BarcodeFormat;
  widthInches?: number;
  heightInches?: number;
}

export interface BarcodeGenerationResult {
  success: boolean;
  text: string;
  pngDataUrl: string;
  svgString?: string;
  error?: string;
  widthInches: number;
  heightInches: number;
  widthPx: number;
  heightPx: number;
  type: BarcodeFormat;
}

// Inch-based dimension standards and preset definitions
export const INCH_SIZES = {
  CODE128: {
    standard: { width: 2.75, height: 0.65 },
    large: { width: 3.50, height: 0.85 },
    minWidth: 1.00,
    maxWidth: 6.50,
    minHeight: 0.25,
    maxHeight: 2.50,
  },
  QR: {
    standard: { width: 1.50, height: 1.50 },
    large: { width: 2.25, height: 2.25 },
    minWidth: 0.60,
    maxWidth: 5.00,
    minHeight: 0.60,
    maxHeight: 5.00,
  },
};

/**
 * Validates dimensions in inches
 */
export function validateBarcodeDimensionsInches(
  type: BarcodeFormat,
  widthInches: number,
  heightInches: number
): { valid: boolean; error?: string } {
  if (isNaN(widthInches) || isNaN(heightInches)) {
    return { valid: false, error: 'Width and Height must be valid numbers.' };
  }
  if (widthInches <= 0 || heightInches <= 0) {
    return { valid: false, error: 'Width and Height must be greater than zero.' };
  }

  const limits = INCH_SIZES[type];
  if (widthInches < limits.minWidth || widthInches > limits.maxWidth) {
    return {
      valid: false,
      error: `Width must be between ${limits.minWidth.toFixed(2)} in and ${limits.maxWidth.toFixed(2)} in for ${type === 'CODE128' ? 'CODE128' : '2D QR'}.`,
    };
  }
  if (heightInches < limits.minHeight || heightInches > limits.maxHeight) {
    return {
      valid: false,
      error: `Height must be between ${limits.minHeight.toFixed(2)} in and ${limits.maxHeight.toFixed(2)} in for ${type === 'CODE128' ? 'CODE128' : '2D QR'}.`,
    };
  }

  return { valid: true };
}

/**
 * Splits comma-separated or newline-separated input string into distinct, trimmed non-empty values
 */
export function parseBarcodeEntries(rawInput: string): string[] {
  if (!rawInput) return [];
  return rawInput
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Generates single barcode/QR result with inch-based dimensions
 */
export async function generateBarcodeData(
  options: BarcodeGenerateOptions
): Promise<BarcodeGenerationResult> {
  const { text, type } = options;
  const rawText = (text || '').trim();

  const defaultWidth = INCH_SIZES[type].standard.width;
  const defaultHeight = INCH_SIZES[type].standard.height;
  const widthInches = options.widthInches && options.widthInches > 0 ? options.widthInches : defaultWidth;
  const heightInches = options.heightInches && options.heightInches > 0 ? options.heightInches : defaultHeight;

  // Render pixels for internal rasterization at 150 DPI for crisp readability
  const dpi = 150;
  const widthPx = Math.round(widthInches * dpi);
  const heightPx = Math.round(heightInches * dpi);

  if (!rawText) {
    return {
      success: false,
      text: '',
      pngDataUrl: '',
      error: 'Please enter barcode or tracking data to generate code.',
      widthInches,
      heightInches,
      widthPx,
      heightPx,
      type,
    };
  }

  const validation = validateBarcodeDimensionsInches(type, widthInches, heightInches);
  if (!validation.valid) {
    return {
      success: false,
      text: rawText,
      pngDataUrl: '',
      error: validation.error,
      widthInches,
      heightInches,
      widthPx,
      heightPx,
      type,
    };
  }

  if (type === 'CODE128') {
    return generateCode128(rawText, widthInches, heightInches, widthPx, heightPx);
  } else {
    return generateQr(rawText, widthInches, heightInches, widthPx, heightPx);
  }
}

/**
 * Generates multiple barcode items from parsed string list
 */
export async function generateMultipleBarcodes(
  entries: string[],
  type: BarcodeFormat,
  widthInches: number,
  heightInches: number
): Promise<BarcodeGenerationResult[]> {
  const results: BarcodeGenerationResult[] = [];
  for (const entry of entries) {
    const res = await generateBarcodeData({
      text: entry,
      type,
      widthInches,
      heightInches,
    });
    results.push(res);
  }
  return results;
}

/**
 * Generate CODE128 linear barcode
 */
function generateCode128(
  text: string,
  widthInches: number,
  heightInches: number,
  widthPx: number,
  heightPx: number
): BarcodeGenerationResult {
  if (typeof window === 'undefined') {
    return {
      success: false,
      text,
      pngDataUrl: '',
      error: 'Client-side rendering only.',
      widthInches,
      heightInches,
      widthPx,
      heightPx,
      type: 'CODE128',
    };
  }

  try {
    // 1. Calculate barcode bars dimensions
    // Allocate ~65% of the total height for the barcode bars, leaving room for spacing and human-readable text
    const barHeight = Math.max(20, Math.round(heightPx * 0.65));
    const estimatedModules = Math.max(45, text.length * 11 + 35);
    const availableWidth = Math.max(50, widthPx - 20); // 10px padding each side
    const barWidthMultiplier = Math.max(1, Math.min(4.5, Math.floor((availableWidth / estimatedModules) * 10) / 10));

    // 2. Generate pure CODE128 barcode bars on intermediate canvas without text (displayValue: false)
    const tempCanvas = document.createElement('canvas');
    JsBarcode(tempCanvas, text, {
      format: 'CODE128',
      displayValue: false, // NO text rendered by JsBarcode; we render custom proportional text once!
      margin: 0,
      width: barWidthMultiplier,
      height: barHeight,
      background: '#ffffff',
      lineColor: '#000000',
    });

    const actualBarcodeWidth = tempCanvas.width;
    const actualBarcodeHeight = tempCanvas.height;

    // 3. Setup final canvas
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Draw barcode bars centered horizontally
    const barX = Math.max(0, Math.round((widthPx - actualBarcodeWidth) / 2));
    const barY = Math.max(4, Math.round((heightPx - actualBarcodeHeight) * 0.18));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, barX, barY);

    // 4. Calculate dynamic font size so text width is approximately 80% of barcode width
    const targetTextWidth = actualBarcodeWidth * 0.80;
    const availableTextHeight = heightPx - (barY + actualBarcodeHeight);

    // Use a reference font size to measure text width
    const refFontSize = 24;
    ctx.font = `bold ${refFontSize}px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, monospace, sans-serif`;
    const measuredRefWidth = ctx.measureText(text).width || (text.length * refFontSize * 0.6);

    let optimalFontSize = Math.round(refFontSize * (targetTextWidth / measuredRefWidth));

    // Constrain by available vertical height
    const maxVerticalFont = Math.max(11, Math.floor(availableTextHeight * 0.72));
    optimalFontSize = Math.min(optimalFontSize, maxVerticalFont);
    optimalFontSize = Math.max(10, optimalFontSize);

    // Ensure text does not exceed 85% of barcode width
    ctx.font = `bold ${optimalFontSize}px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, monospace, sans-serif`;
    while (ctx.measureText(text).width > actualBarcodeWidth * 0.85 && optimalFontSize > 9) {
      optimalFontSize -= 1;
      ctx.font = `bold ${optimalFontSize}px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, monospace, sans-serif`;
    }

    // 5. Draw the tracking number EXACTLY ONCE directly below the barcode bars
    const textSpacing = Math.max(3, Math.round((availableTextHeight - optimalFontSize) / 2));
    const textY = barY + actualBarcodeHeight + textSpacing;

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, widthPx / 2, textY);

    const pngDataUrl = canvas.toDataURL('image/png');

    // 6. Generate SVG representation with exact same layout (bars + text once)
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgNode.setAttribute('width', `${widthPx}`);
    svgNode.setAttribute('height', `${heightPx}`);
    svgNode.setAttribute('viewBox', `0 0 ${widthPx} ${heightPx}`);
    svgNode.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Background rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', `${widthPx}`);
    bgRect.setAttribute('height', `${heightPx}`);
    bgRect.setAttribute('fill', '#ffffff');
    svgNode.appendChild(bgRect);

    // Temp SVG for barcode bars
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(tempSvg, text, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: barWidthMultiplier,
      height: barHeight,
      background: '#ffffff',
      lineColor: '#000000',
    });

    const barcodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    barcodeGroup.setAttribute('transform', `translate(${barX}, ${barY})`);
    while (tempSvg.firstChild) {
      barcodeGroup.appendChild(tempSvg.firstChild);
    }
    svgNode.appendChild(barcodeGroup);

    // Text in SVG directly below bars - ONCE
    const textSvg = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textSvg.setAttribute('x', `${widthPx / 2}`);
    textSvg.setAttribute('y', `${textY + optimalFontSize * 0.85}`);
    textSvg.setAttribute('text-anchor', 'middle');
    textSvg.setAttribute('font-family', '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, monospace, sans-serif');
    textSvg.setAttribute('font-size', `${optimalFontSize}`);
    textSvg.setAttribute('font-weight', 'bold');
    textSvg.setAttribute('fill', '#000000');
    textSvg.textContent = text;
    svgNode.appendChild(textSvg);

    const svgString = new XMLSerializer().serializeToString(svgNode);

    return {
      success: true,
      text,
      pngDataUrl,
      svgString,
      widthInches,
      heightInches,
      widthPx,
      heightPx,
      type: 'CODE128',
    };
  } catch (err: any) {
    const message = err?.message || String(err);
    let friendlyError = 'Failed to generate CODE128 barcode.';
    if (message.includes('not a valid input on CODE128') || message.includes('character')) {
      friendlyError =
        'Unsupported character in text. CODE128 supports standard ASCII letters, numbers, and symbols. Switch to 2D QR or adjust input.';
    }
    return {
      success: false,
      text,
      pngDataUrl: '',
      error: friendlyError,
      widthInches,
      heightInches,
      widthPx,
      heightPx,
      type: 'CODE128',
    };
  }
}

/**
 * Generate 2D QR Code
 */
async function generateQr(
  text: string,
  widthInches: number,
  heightInches: number,
  widthPx: number,
  heightPx: number
): Promise<BarcodeGenerationResult> {
  try {
    const qrSize = Math.min(widthPx, heightPx);

    const rawSvg = await QRCode.toString(text, {
      type: 'svg',
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    const rawPngUrl = await QRCode.toDataURL(text, {
      width: qrSize,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    let pngDataUrl = rawPngUrl;
    if (widthPx !== heightPx && typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, widthPx, heightPx);

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const dx = (widthPx - qrSize) / 2;
            const dy = (heightPx - qrSize) / 2;
            ctx.drawImage(img, dx, dy, qrSize, qrSize);
            resolve();
          };
          img.onerror = reject;
          img.src = rawPngUrl;
        });
        pngDataUrl = canvas.toDataURL('image/png');
      }
    }

    return {
      success: true,
      text,
      pngDataUrl,
      svgString: rawSvg,
      widthInches,
      heightInches,
      widthPx,
      heightPx,
      type: 'QR',
    };
  } catch (err: any) {
    return {
      success: false,
      text,
      pngDataUrl: '',
      error: `Failed to generate 2D QR Code: ${err?.message || 'Invalid input'}`,
      widthInches,
      heightInches,
      widthPx,
      heightPx,
      type: 'QR',
    };
  }
}

/**
 * Parses uploaded Excel (.xlsx, .xls) or CSV file and extracts barcode/tracking strings
 */
export const MAX_BARCODE_LIMIT = 500;

export async function parseBarcodeFile(
  file: File,
  maxLimit: number = MAX_BARCODE_LIMIT
): Promise<{
  success: boolean;
  entries: string[];
  totalCount?: number;
  trimmed?: boolean;
  error?: string;
}> {
  try {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return {
        success: false,
        entries: [],
        error: 'Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.',
      };
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, entries: [], error: 'Uploaded spreadsheet is empty.' };
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

    if (!rows || rows.length === 0) {
      return { success: false, entries: [], error: 'The uploaded file contains no data rows.' };
    }

    // Determine target column containing barcodes
    let targetCol = 0;
    let startRow = 0;

    const firstRow = rows[0] || [];
    const headerIdx = firstRow.findIndex((cell: any) =>
      /tracking|barcode|consignment|awb|code|number|no/i.test(String(cell || '').trim())
    );

    if (headerIdx !== -1) {
      targetCol = headerIdx;
      startRow = 1;
    } else {
      // Find the first column containing non-empty text
      for (let c = 0; c < 15; c++) {
        if (rows.some((r) => r[c] && String(r[c]).trim().length > 0)) {
          targetCol = c;
          break;
        }
      }
    }

    const extracted: string[] = [];
    const seen = new Set<string>();

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const rawCell = row[targetCol];
      if (rawCell === undefined || rawCell === null) continue;

      const cleaned = String(rawCell).trim();
      if (!cleaned) continue;

      // Preserve exact alphanumeric characters and avoid duplicates
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        extracted.push(cleaned);
      }
    }

    if (extracted.length === 0) {
      return {
        success: false,
        entries: [],
        error: 'No valid barcode or tracking values found in the uploaded file.',
      };
    }

    const totalCount = extracted.length;
    const trimmed = totalCount > maxLimit;
    const finalEntries = trimmed ? extracted.slice(0, maxLimit) : extracted;

    return {
      success: true,
      entries: finalEntries,
      totalCount,
      trimmed,
    };
  } catch (err: any) {
    return {
      success: false,
      entries: [],
      error: `Error reading file: ${err?.message || 'Invalid or corrupted file.'}`,
    };
  }
}

export type BarcodePdfLayout = 'column' | 'row';

/**
 * Generates and downloads a clean, scannable PDF containing the barcode(s)
 * Supports 'column' (default, single vertical column) and 'row' (horizontal grid rows)
 */
export function downloadBarcodesPdf({
  results,
  type,
  widthInches,
  heightInches,
  filename,
  margin = 0.105,
  spacing = 0.14,
  gapX,
  gapY,
  layout = 'row',
}: {
  results: BarcodeGenerationResult[];
  type: BarcodeFormat;
  widthInches: number;
  heightInches: number;
  filename?: string;
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
  spacing?: number;
  gapX?: number;
  gapY?: number;
  layout?: BarcodePdfLayout;
}): boolean {
  if (typeof window === 'undefined' || !results || results.length === 0) return false;

  const validItems = results.filter((r) => r.success && r.pngDataUrl);
  if (validItems.length === 0) return false;

  try {
    const doc = new jsPDF({
      unit: 'in',
      format: 'letter', // 8.5 x 11 in
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Resolve margins dynamically (supports uniform number or individual side offsets)
    // Reduced by ~30% (from 0.15 in to 0.105 in) for a tighter, compact print layout
    const defaultMargin = 0.105;
    const marginTop =
      typeof margin === 'object' && margin !== null
        ? (margin.top ?? defaultMargin)
        : typeof margin === 'number'
        ? margin
        : defaultMargin;
    const marginRight =
      typeof margin === 'object' && margin !== null
        ? (margin.right ?? defaultMargin)
        : typeof margin === 'number'
        ? margin
        : defaultMargin;
    const marginBottom =
      typeof margin === 'object' && margin !== null
        ? (margin.bottom ?? defaultMargin)
        : typeof margin === 'number'
        ? margin
        : defaultMargin;
    const marginLeft =
      typeof margin === 'object' && margin !== null
        ? (margin.left ?? defaultMargin)
        : typeof margin === 'number'
        ? margin
        : defaultMargin;

    // Printable boundaries
    const printableWidth = Math.max(0.1, pageWidth - marginLeft - marginRight);
    const printableHeight = Math.max(0.1, pageHeight - marginTop - marginBottom);
    const maxRight = pageWidth - marginRight;
    const maxBottom = pageHeight - marginBottom;

    // Maintain consistent horizontal and vertical spacing between barcodes
    // In Row Wise layout, horizontal gap is reduced by ~30% (from 0.10 in to 0.07 in)
    // Vertical gap between rows is reduced by ~30% (from 0.20 in to 0.14 in)
    const horizontalGap = layout === 'row' ? (gapX ?? 0.07) : (gapX ?? spacing);
    const verticalGap = gapY ?? spacing;

    // Dimensions of each barcode block with overflow prevention
    const textExtraHeight = type === 'QR' ? 0.20 : 0;
    const blockWidth = Math.min(widthInches, printableWidth);
    const blockHeight = Math.min(heightInches + textExtraHeight, printableHeight);
    const renderImageHeight = Math.max(0.05, blockHeight - textExtraHeight);

    // Calculate how many barcodes can fit horizontally across the page
    // If layout is 'row', calculate dynamic columns across the available printable width.
    // If layout is 'column' (default), use single vertical column arrangement.
    let columns = 1;
    if (layout === 'row') {
      if (blockWidth > 0 && printableWidth >= blockWidth) {
        columns = Math.max(
          1,
          Math.floor((printableWidth + horizontalGap + 0.001) / (blockWidth + horizontalGap))
        );
      }
    } else {
      // Column Wise: preserve vertical single-column arrangement
      columns = 1;
    }

    // Row-wise placement: fill left-to-right across the row, then proceed to the next row
    let col = 0;
    let currentY = marginTop;

    validItems.forEach((item) => {
      // When current row is filled, advance to the next row
      if (col >= columns) {
        col = 0;
        currentY += blockHeight + verticalGap;
      }

      // Automatic page wrapping: if row exceeds available vertical space, continue onto next PDF page
      if (currentY + blockHeight > maxBottom + 0.001) {
        doc.addPage();
        col = 0;
        currentY = marginTop;
      }

      // Current horizontal position in the row
      const currentX = marginLeft + col * (blockWidth + horizontalGap);

      // Draw barcode image cleanly starting at current position
      try {
        doc.addImage(item.pngDataUrl, 'PNG', currentX, currentY, blockWidth, renderImageHeight);
      } catch (err) {
        console.error('Failed to embed barcode in PDF:', err);
      }

      // Draw tracking number text centered below ONLY for 2D QR codes (CODE128 already has text)
      if (type === 'QR') {
        doc.setFont('courier', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        const textX = currentX + blockWidth / 2;
        const textY = currentY + renderImageHeight + 0.14;
        doc.text(item.text, textX, textY, { align: 'center' });
      }

      // Advance column horizontally to the right for the next barcode
      col++;
    });

    const defaultName =
      validItems.length === 1
        ? `${type.toLowerCase()}-${validItems[0].text.replace(/[^a-zA-Z0-9_\-]/g, '_')}`
        : `${type.toLowerCase()}-barcodes-${validItems.length}-items`;

    const finalName = filename || defaultName;
    doc.save(finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    return false;
  }
}

/**
 * Downloads a single PNG file
 */
export function downloadBarcodePng({
  dataUrl,
  filename,
}: {
  dataUrl: string;
  filename: string;
}): boolean {
  if (typeof window === 'undefined' || !dataUrl) return false;

  const cleanFilename = (filename || 'barcode').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = cleanFilename.endsWith('.png') ? cleanFilename : `${cleanFilename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

/**
 * Downloads all generated PNGs with sequential delays to prevent browser blocking
 */
export function downloadAllBarcodesPng(
  results: BarcodeGenerationResult[],
  type: BarcodeFormat,
  widthInches: number,
  heightInches: number
): void {
  const valid = results.filter((r) => r.success && r.pngDataUrl);
  valid.forEach((item, index) => {
    setTimeout(() => {
      const sanitized = item.text.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${type.toLowerCase()}-${sanitized}-${widthInches}x${heightInches}in.png`;
      downloadBarcodePng({
        dataUrl: item.pngDataUrl,
        filename,
      });
    }, index * 200);
  });
}

/**
 * Native Device Web Share API handler
 */
export async function shareBarcodeItem({
  dataUrl,
  text,
  type,
  filename,
}: {
  dataUrl: string;
  text: string;
  type: BarcodeFormat;
  filename: string;
}): Promise<{ success: boolean; message: string; method?: 'native' | 'fallback' }> {
  const displayType = type === 'CODE128' ? 'CODE128 Barcode' : '2D QR Code';
  const cleanFilename = (filename || 'barcode').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const fullFilename = cleanFilename.endsWith('.png') ? cleanFilename : `${cleanFilename}.png`;

  if (typeof navigator !== 'undefined' && navigator.share && dataUrl) {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], fullFilename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Shipment ${displayType}: ${text}`,
          text: `Shipment Consignment ${displayType}: ${text}`,
          files: [file],
        });
        return { success: true, message: 'Shared successfully via device.', method: 'native' };
      } else {
        await navigator.share({
          title: `Shipment ${displayType}: ${text}`,
          text: `Shipment Consignment ${displayType}: ${text}`,
        });
        return { success: true, message: 'Shared details via device.', method: 'native' };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Sharing cancelled.' };
      }
    }
  }

  // Fallback download
  if (dataUrl) {
    downloadBarcodePng({
      dataUrl,
      filename: fullFilename,
    });
    return {
      success: true,
      message: 'Native sharing not supported. Barcode downloaded automatically!',
      method: 'fallback',
    };
  }

  return { success: false, message: 'No barcode data available to share.' };
}

/**
 * Generate direct WhatsApp share link
 */
export function getWhatsAppShareUrl(text: string, type: BarcodeFormat): string {
  const label = type === 'CODE128' ? 'CODE128 Barcode' : '2D QR Code';
  const msg = `Shipment Consignment ${label}:\n*${text}*\n\nGenerated with Geo Transit Shipping Label Generator`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}

/**
 * Generate direct Email share link
 */
export function getEmailShareUrl(
  text: string,
  type: BarcodeFormat,
  widthInches: number,
  heightInches: number
): string {
  const label = type === 'CODE128' ? 'CODE128 Barcode' : '2D QR Code';
  const subject = `Shipment Consignment ${label}: ${text}`;
  const body = `Hello,\n\nPlease find the shipment consignment ${label} details below:\n\n• Consignment Number / Data: ${text}\n• Format: ${label}\n• Dimensions: ${widthInches.toFixed(2)} × ${heightInches.toFixed(2)} in\n\nGenerated with Geo Transit Shipping Label Generator.`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Converts a base64 Data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const binaryString = atob(parts[1]);
  const length = binaryString.length;
  const u8arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    u8arr[i] = binaryString.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Prepares a complete PNG image blob for a barcode or QR item.
 * Includes barcode bars/QR matrix and the tracking text below it on a clean white background.
 */
export async function getBarcodeImageBlob(
  item: BarcodeGenerationResult
): Promise<Blob> {
  if (!item.pngDataUrl) {
    throw new Error('No barcode image data available to copy.');
  }

  // CODE128 already includes barcode bars, centered tracking number, and white background
  if (item.type === 'CODE128') {
    return dataUrlToBlob(item.pngDataUrl);
  }

  // For QR codes, composite the QR square and the tracking number below it onto a clean white canvas
  return new Promise<Blob>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(dataUrlToBlob(item.pngDataUrl));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const qrSize = img.width || 300;
        const fontSize = Math.max(14, Math.min(22, Math.round(qrSize * 0.055)));
        const textHeight = Math.round(fontSize * 1.8);
        const padding = 12;
        const canvasWidth = qrSize + padding * 2;
        const canvasHeight = qrSize + textHeight + padding * 2;

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrlToBlob(item.pngDataUrl));
          return;
        }

        // 1. Clean white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 2. Draw QR code centered
        ctx.drawImage(img, padding, padding, qrSize, qrSize);

        // 3. Draw tracking number text centered below QR code
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${fontSize}px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, monospace, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.text, canvasWidth / 2, padding + qrSize + textHeight / 2);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(dataUrlToBlob(item.pngDataUrl));
          }
        }, 'image/png');
      } catch {
        resolve(dataUrlToBlob(item.pngDataUrl));
      }
    };
    img.onerror = () => {
      resolve(dataUrlToBlob(item.pngDataUrl));
    };
    img.src = item.pngDataUrl;
  });
}

/**
 * Copies the complete rendered barcode or QR code as an image directly to the clipboard.
 * Allows instant pasting (Ctrl + V) into Word, WhatsApp, Excel, Google Docs/Sheets, etc.
 */
export async function copyBarcodeImageToClipboard(
  item: BarcodeGenerationResult
): Promise<{ success: boolean; method: 'image' | 'text' | 'html'; error?: string }> {
  if (!item.success || !item.pngDataUrl) {
    throw new Error('Barcode is not ready or failed to generate.');
  }

  // 1. Modern Async Clipboard API with image/png
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const blob = await getBarcodeImageBlob(item);
      const clipboardItem = new ClipboardItem({
        'image/png': blob,
      });
      await navigator.clipboard.write([clipboardItem]);
      return { success: true, method: 'image' };
    } catch (err: any) {
      console.warn('Direct image clipboard write failed, attempting HTML fallback:', err);
      // Fallback 1: Try HTML format with embedded image
      try {
        const htmlContent = `<img src="${item.pngDataUrl}" alt="${item.text}" />`;
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const htmlClipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
        });
        await navigator.clipboard.write([htmlClipboardItem]);
        return { success: true, method: 'html' };
      } catch (htmlErr) {
        console.warn('HTML clipboard write failed:', htmlErr);
      }
    }
  }

  // Fallback 2: Text copy if image clipboard write is not supported or blocked
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(item.text);
      return { success: true, method: 'text' };
    } catch (textErr: any) {
      return { success: false, method: 'text', error: textErr?.message || 'Clipboard access denied' };
    }
  }

  return { success: false, method: 'text', error: 'Clipboard not supported in this browser' };
}
