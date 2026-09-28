import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ShippingLabelTemplateData } from '@/lib/shippingLabel';

export interface GenerateLabelPdfOptions {
  template: ShippingLabelTemplateData;
  data: Record<string, any>;
  qrDataUrl?: string;
  barcodeDataUrl?: string;
}

/**
 * Generates a high-precision, true-to-size PDF for thermal shipping labels (e.g. 4x6 inch, A6).
 */
export async function generateShippingLabelPDF({
  template,
  data,
  qrDataUrl,
  barcodeDataUrl,
}: GenerateLabelPdfOptions): Promise<jsPDF> {
  const widthMm = template.widthMm || 101.6;
  const heightMm = template.heightMm || 152.4;
  const orientation = template.orientation === 'LANDSCAPE' ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  const margin = 4;
  const contentWidth = widthMm - margin * 2;
  const contentHeight = heightMm - margin * 2;

  // 1. Draw outer border
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, contentWidth, contentHeight);

  // ----------------------------------------------------
  // SECTION 1: HEADER & SHIP TO (Top ~45mm)
  // ----------------------------------------------------
  const sec1Height = 44;
  doc.line(margin, margin + sec1Height, margin + contentWidth, margin + sec1Height);

  // SHIP TO Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text('SHIP TO:', margin + 3, margin + 5);

  // Recipient Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const recipientName = String(data.recipient_name || 'RECIPIENT NAME').toUpperCase();
  doc.text(recipientName, margin + 3, margin + 10);

  // Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  const addr1 = data.address_line_1 || '';
  const addr2 = data.address_line_2 || '';
  const cityStatePin = [
    data.city,
    data.state,
    data.pincode ? `- ${data.pincode}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  let currentY = margin + 15;
  if (addr1) {
    const lines = doc.splitTextToSize(addr1, contentWidth - 35);
    doc.text(lines, margin + 3, currentY);
    currentY += lines.length * 3.8;
  }
  if (addr2 && currentY < margin + 28) {
    const lines = doc.splitTextToSize(addr2, contentWidth - 35);
    doc.text(lines, margin + 3, currentY);
    currentY += lines.length * 3.8;
  }
  if (cityStatePin) {
    doc.text(cityStatePin.toUpperCase(), margin + 3, currentY);
    currentY += 4.5;
  }

  // Mobile
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`MOBILE: ${data.mobile || 'N/A'}`, margin + 3, margin + sec1Height - 3);

  // Top Right Logo / Branding
  if (template.logoUrl) {
    try {
      doc.addImage(template.logoUrl, 'PNG', margin + contentWidth - 32, margin + 3, 30, 14);
    } catch {
      // Fallback text if image data URL cannot be parsed
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 76, 58);
      doc.text('GEO TRANSIT', margin + contentWidth - 28, margin + 8);
    }
  }

  // ----------------------------------------------------
  // SECTION 2: QR CODE & SERVICE MATRIX (~48mm)
  // ----------------------------------------------------
  const sec2Y = margin + sec1Height;
  const sec2Height = 44;
  doc.line(margin, sec2Y + sec2Height, margin + contentWidth, sec2Y + sec2Height);

  // QR Code on Left
  const qrSize = 34;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', margin + 3, sec2Y + 4, qrSize, qrSize);
    } catch (err) {
      console.error('Failed to embed QR code:', err);
    }
  }

  // Vertical separator between QR and Service Details
  const sepX = margin + qrSize + 6;
  doc.setLineWidth(0.3);
  doc.line(sepX, sec2Y, sepX, sec2Y + sec2Height);

  // Service Details Grid on Right
  const rightX = sepX + 3;
  let infoY = sec2Y + 5;

  // Row 1: SERVICE & SERVICE TYPE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text('SERVICE', rightX, infoY);
  doc.text('SERVICE TYPE', rightX + 26, infoY);

  infoY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.service || 'LITE').toUpperCase(), rightX, infoY);
  doc.text(String(data.service_type || 'STD EXP-A').toUpperCase(), rightX + 26, infoY);

  infoY += 6;
  // Row 2: ORIGIN CODE & DESTINATION CODE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text('ORG CODE', rightX, infoY);
  doc.text('DST CODE', rightX + 26, infoY);

  infoY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.origin_code || 'BOM').toUpperCase(), rightX, infoY);
  doc.text(String(data.destination_code || 'DEL').toUpperCase(), rightX + 26, infoY);

  infoY += 6;
  // Row 3: PAYMENT STATUS
  const payStatus = String(data.payment_status || 'PREPAID').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(payStatus === 'COD' ? 180 : 15, payStatus === 'COD' ? 40 : 76, 58);
  if (payStatus === 'COD') {
    doc.text(`PAYMENT: COD (₹${Number(data.amount_to_collect || 0).toLocaleString('en-IN')})`, rightX, infoY);
  } else {
    doc.text(`PAYMENT: ${payStatus}`, rightX, infoY);
  }

  infoY += 5.5;
  // Row 4: Tracking Number & Piece Count
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text('TRACKING NO / PKG COUNT', rightX, infoY);

  infoY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`${data.tracking_number || ''}  [${data.package_count || '001 / 001'}]`, rightX, infoY);

  // ----------------------------------------------------
  // SECTION 3: BARCODE (~28mm)
  // ----------------------------------------------------
  const sec3Y = sec2Y + sec2Height;
  const sec3Height = 26;
  doc.line(margin, sec3Y + sec3Height, margin + contentWidth, sec3Y + sec3Height);

  if (barcodeDataUrl) {
    try {
      const barcodeWidth = contentWidth - 10;
      doc.addImage(barcodeDataUrl, 'PNG', margin + 5, sec3Y + 3, barcodeWidth, 16);
    } catch (err) {
      console.error('Failed to embed Barcode:', err);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.tracking_number || '').toUpperCase(), margin + contentWidth / 2, sec3Y + 23, {
    align: 'center',
  });

  // ----------------------------------------------------
  // SECTION 4: ROUTING, WEIGHT, DATE, MODE (~24mm)
  // ----------------------------------------------------
  const sec4Y = sec3Y + sec3Height;
  const sec4Height = contentHeight - (sec1Height + sec2Height + sec3Height);

  const colW = contentWidth / 4;

  // Dividers between 4 bottom columns
  doc.setLineWidth(0.3);
  doc.line(margin + colW, sec4Y, margin + colW, sec4Y + sec4Height - 5);
  doc.line(margin + colW * 2, sec4Y, margin + colW * 2, sec4Y + sec4Height - 5);
  doc.line(margin + colW * 3, sec4Y, margin + colW * 3, sec4Y + sec4Height - 5);

  // Col 1: ROUTE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('ROUTE / HUB', margin + 2, sec4Y + 4);
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.route_location || 'NORTH HUB').toUpperCase(), margin + 2, sec4Y + 9);

  // Col 2: WEIGHT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('WEIGHT (KG)', margin + colW + 2, sec4Y + 4);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`${Number(data.weight || 1.0).toFixed(2)} KG`, margin + colW + 2, sec4Y + 9);

  // Col 3: DATE / TIME
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('DATE / TIME', margin + colW * 2 + 2, sec4Y + 4);
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  const dateStr = data.date ? new Date(data.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  doc.text(dateStr, margin + colW * 2 + 2, sec4Y + 9);
  if (data.time) {
    doc.text(data.time, margin + colW * 2 + 2, sec4Y + 13);
  }

  // Col 4: MODE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('MODE', margin + colW * 3 + 2, sec4Y + 4);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(String(data.mode || 'SURFACE').toUpperCase(), margin + colW * 3 + 2, sec4Y + 9);

  // Bottom Footer Bar
  doc.setLineWidth(0.2);
  doc.line(margin, margin + contentHeight - 5, margin + contentWidth, margin + contentHeight - 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  const footerText = template.footerText || 'GEO TRANSIT LOGISTICS NETWORK • TRACK AT WWW.GEOTRANSIT.COM';
  doc.text(footerText, margin + contentWidth / 2, margin + contentHeight - 1.5, { align: 'center' });

  return doc;
}

/**
 * Downloads high resolution PNG image of the shipping label using html2canvas-pro.
 */
export async function downloadShippingLabelPNG(elementId: string, trackingNumber: string): Promise<boolean> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID ${elementId} not found.`);
      return false;
    }

    const canvas = await html2canvas(element, {
      scale: 3, // 300 DPI high resolution for thermal printing
      useCORS: true,
      backgroundColor: '#FFFFFF',
    });

    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `shipping-label-${trackingNumber || 'consignment'}.png`;
    link.href = imgData;
    link.click();
    return true;
  } catch (error) {
    console.error('Failed to download shipping label PNG:', error);
    return false;
  }
}

/**
 * Clean isolated print dialog for the shipping label.
 */
export function printShippingLabel(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Shipping Label</title>
        <style>
          @page {
            size: 4in 6in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #fff;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 300);
}
