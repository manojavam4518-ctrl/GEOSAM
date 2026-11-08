import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ShippingLabelTemplateData, parsePackageCount, formatPackageSequence } from '@/lib/shippingLabel';

export interface GenerateLabelPdfOptions {
  template: ShippingLabelTemplateData;
  data: Record<string, any>;
  qrDataUrl?: string;
  barcodeDataUrl?: string;
}

/**
 * Draws a single thermal shipping label page into the jsPDF document.
 */
function drawSingleShippingLabel(
  doc: jsPDF,
  template: ShippingLabelTemplateData,
  data: Record<string, any>,
  qrDataUrl?: string,
  barcodeDataUrl?: string
): void {
  const widthMm = template.widthMm || 101.6;
  const heightMm = template.heightMm || 152.4;

  const is4x6 = heightMm >= 130;
  const is4x4 = heightMm >= 85 && heightMm < 130;
  const is4x25 = heightMm >= 56 && heightMm < 85;
  const is4x2 = heightMm < 56;

  const margin = is4x2 ? 2 : is4x25 ? 2.5 : is4x4 ? 3 : 4;
  const contentWidth = widthMm - margin * 2;
  const contentHeight = heightMm - margin * 2;

  // 1. Draw outer border
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, contentWidth, contentHeight);

  // ----------------------------------------------------
  // SECTION 1: HEADER & SHIP TO
  // ----------------------------------------------------
  const sec1Height = is4x2 ? 15.5 : is4x25 ? 19.5 : is4x4 ? 27 : 44;
  doc.line(margin, margin + sec1Height, margin + contentWidth, margin + sec1Height);

  // SHIP TO Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is4x2 ? 5 : is4x25 ? 5.5 : is4x4 ? 7 : 8);
  doc.setTextColor(50, 50, 50);
  doc.text('SHIP TO:', margin + (is4x2 ? 1.5 : 3), margin + (is4x2 ? 2.5 : is4x4 ? 4 : 5));

  // Recipient Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is4x2 ? 6.5 : is4x25 ? 7.5 : is4x4 ? 11 : 13);
  doc.setTextColor(0, 0, 0);
  const recipientName = String(data.recipient_name || 'RECIPIENT NAME').toUpperCase();
  const contactPerson =
    Boolean(data.include_contact_person_on_label) && data.contact_person_name
      ? String(data.contact_person_name).trim().toUpperCase()
      : '';
  doc.text(recipientName, margin + (is4x2 ? 1.5 : 3), margin + (is4x2 ? 5.5 : is4x4 ? 8 : 10.5));

  // Address
  const addr1 = data.address_line_1 || '';
  const addr2 = data.address_line_2 || '';
  const cityState = [data.city, data.state].filter(Boolean).join(', ');
  const pinText = data.pincode ? String(data.pincode).trim() : '';

  if (is4x2 || is4x25) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is4x2 ? 5.0 : 5.8);
    doc.setTextColor(30, 30, 30);
    const maxTextWidth = contentWidth - (is4x2 ? 26 : 24);
    let currentY = margin + (is4x2 ? 8.2 : 9.2);

    if (contactPerson) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(is4x2 ? 4.8 : 5.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`ATTN: ${contactPerson}`, margin + (is4x2 ? 1.5 : 3), currentY);
      currentY += (is4x2 ? 2.2 : 2.6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(is4x2 ? 5.0 : 5.8);
      doc.setTextColor(30, 30, 30);
    }

    if (addr1) {
      const lines = doc.splitTextToSize(addr1, maxTextWidth);
      doc.text(lines[0] || '', margin + (is4x2 ? 1.5 : 3), currentY);
      currentY += (is4x2 ? 2.3 : 2.7);
      if (lines[1]) {
        doc.text(lines[1], margin + (is4x2 ? 1.5 : 3), currentY);
        currentY += (is4x2 ? 2.3 : 2.7);
      }
    }

    if (addr2) {
      const lines = doc.splitTextToSize(addr2, maxTextWidth);
      doc.text(lines[0] || '', margin + (is4x2 ? 1.5 : 3), currentY);
      currentY += (is4x2 ? 2.3 : 2.7);
    }

    if (cityState) {
      doc.setFont('helvetica', 'bold');
      doc.text(cityState.toUpperCase(), margin + (is4x2 ? 1.5 : 3), currentY);
      currentY += (is4x2 ? 2.3 : 2.7);
    }

    // Mobile & Pincode on bottom line of Section 1
    const mobPinY = margin + sec1Height - 1.2;
    const mobX = margin + (is4x2 ? 1.5 : 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is4x2 ? 5.7 : 6.8);
    doc.setTextColor(0, 0, 0);
    doc.text('MOB: ', mobX, mobPinY);
    const mobLabelW = doc.getTextWidth('MOB: ');
    doc.setFont('helvetica', 'bold');
    doc.text(String(data.mobile || 'N/A'), mobX + mobLabelW, mobPinY);
    const mobValW = doc.getTextWidth(String(data.mobile || 'N/A'));

    const pinX = mobX + mobLabelW + mobValW + (is4x2 ? 3 : 4);
    doc.setFont('helvetica', 'normal');
    doc.text('PIN: ', pinX, mobPinY);
    const pinLabelW = doc.getTextWidth('PIN: ');
    doc.setFont('helvetica', 'bold');
    doc.text(pinText || 'N/A', pinX + pinLabelW, mobPinY);
  } else {
    // 4x6 and 4x4 layout
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is4x4 ? 8.5 : 9.5);
    doc.setTextColor(30, 30, 30);
    const cityState = [data.city, data.state].filter(Boolean).join(', ');

    let currentY = margin + (is4x4 ? 12 : 15.5);
    const maxAddressWidth = contentWidth - (is4x4 ? 32 : 40);

    if (contactPerson) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(is4x4 ? 8 : 9.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`ATTN: ${contactPerson}`, margin + 3, currentY);
      currentY += is4x4 ? 3.5 : 4.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(is4x4 ? 8.5 : 9.5);
      doc.setTextColor(30, 30, 30);
    }

    if (addr1) {
      const lines = doc.splitTextToSize(addr1, maxAddressWidth);
      lines.forEach((line: string) => {
        doc.text(line, margin + 3, currentY);
        currentY += is4x4 ? 3.5 : 4.2;
      });
    }
    if (addr2) {
      const lines = doc.splitTextToSize(addr2, maxAddressWidth);
      lines.forEach((line: string) => {
        doc.text(line, margin + 3, currentY);
        currentY += is4x4 ? 3.5 : 4.2;
      });
    }
    if (cityState) {
      doc.setFont('helvetica', 'bold');
      doc.text(cityState.toUpperCase(), margin + 3, currentY);
    }

    // Mobile + PIN on same row
    const mobPinY = margin + sec1Height - (is4x4 ? 2.5 : 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is4x4 ? 10.5 : 12);
    doc.setTextColor(0, 0, 0);
    doc.text('MOB: ', margin + 3, mobPinY);
    const mobLabelW = doc.getTextWidth('MOB: ');
    doc.setFont('helvetica', 'bold');
    doc.text(String(data.mobile || 'N/A'), margin + 3 + mobLabelW, mobPinY);
    const mobValW = doc.getTextWidth(String(data.mobile || 'N/A'));

    const pinX = margin + 3 + mobLabelW + mobValW + (is4x4 ? 6 : 8);
    doc.setFont('helvetica', 'normal');
    doc.text('PIN: ', pinX, mobPinY);
    const pinLabelW = doc.getTextWidth('PIN: ');
    doc.setFont('helvetica', 'bold');
    doc.text(String(data.pincode || 'N/A'), pinX + pinLabelW, mobPinY);
  }

  // Top Right Logo / Branding & Package Count
  const courierName = data.courier_company || template.headerText || 'GEO TRANSIT';
  const logoW = is4x2 ? 16 : is4x25 ? 20 : is4x4 ? 26 : 32;
  const logoH = is4x2 ? 6 : is4x25 ? 8 : is4x4 ? 10 : 13;
  const logoX = margin + contentWidth - logoW - 2;
  const logoCenterX = logoX + logoW / 2;

  if (template.logoUrl) {
    try {
      doc.addImage(template.logoUrl, 'PNG', logoX, margin + 2, logoW, logoH);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(is4x2 ? 6 : courierName.length > 15 ? 7.5 : 9);
      doc.setTextColor(15, 76, 58);
      doc.text(courierName.toUpperCase(), logoCenterX, margin + 7, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 6 : courierName.length > 15 ? 7.5 : 9);
    doc.setTextColor(15, 76, 58);
    doc.text(courierName.toUpperCase(), logoCenterX, margin + 7, { align: 'center' });
  }

  // Package Count under Logo (normal PKG label, bold enlarged count)
  if (!is4x2 && !is4x25) {
    const pkgLabelY = margin + 2 + logoH + (is4x4 ? 3 : 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(is4x4 ? 7 : 8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PKG', logoCenterX, pkgLabelY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x4 ? 12 : 16);
    doc.setTextColor(0, 0, 0);
    doc.text(String(data.package_count || '001 / 001'), logoCenterX, pkgLabelY + (is4x4 ? 4.5 : 6), { align: 'center' });
  }

  // ----------------------------------------------------
  // SECTION 2: QR CODE & SERVICE MATRIX
  // ----------------------------------------------------
  const sec2Y = margin + sec1Height;
  const sec2Height = is4x2 ? 12.5 : is4x25 ? 15.5 : is4x4 ? 28 : 44;
  doc.line(margin, sec2Y + sec2Height, margin + contentWidth, sec2Y + sec2Height);

  // QR Code on Left
  const qrSize = is4x2 ? 11 : is4x25 ? 14 : is4x4 ? 22 : 34;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', margin + (is4x2 ? 1.5 : 3), sec2Y + (is4x2 ? 1.5 : 3), qrSize, qrSize);
    } catch (err) {
      console.error('Failed to embed QR code:', err);
    }
  }

  // Vertical separator between QR and Service Details
  const sepX = margin + qrSize + (is4x2 ? 3 : 5);
  doc.setLineWidth(0.3);
  doc.line(sepX, sec2Y, sepX, sec2Y + sec2Height);

  const hideAdditional = Boolean(data.hide_additional_details || data.hideAdditionalDetails);

  if (!hideAdditional) {
    // Service Details Grid on Right
    const rightX = sepX + 2.5;
    let infoY = sec2Y + (is4x2 ? 3 : is4x25 ? 3.5 : is4x4 ? 4 : 5);

    // Row 1: SERVICE & SERVICE TYPE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 5 : is4x25 ? 5.5 : 7.5);
    doc.setTextColor(75, 107, 148);
    doc.text('SERVICE', rightX, infoY);
    doc.text('SERVICE TYPE', rightX + (is4x2 ? 18 : 24), infoY);

    infoY += is4x2 ? 3 : is4x4 ? 3.5 : 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 6.5 : is4x25 ? 7.5 : is4x4 ? 9.5 : 11);
    doc.setTextColor(0, 0, 0);
    doc.text(String(data.service || 'LITE').toUpperCase(), rightX, infoY);
    doc.text(String(data.service_type || 'STD EXP-A').toUpperCase(), rightX + (is4x2 ? 18 : 24), infoY);

    infoY += is4x2 ? 3.5 : is4x4 ? 4.5 : 6;
    // Row 2: ORIGIN CODE & DESTINATION CODE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 5 : is4x25 ? 5.5 : 7.5);
    doc.setTextColor(75, 107, 148);
    doc.text('ORG CODE', rightX, infoY);
    doc.text('DST CODE', rightX + (is4x2 ? 18 : 24), infoY);

    infoY += is4x2 ? 3 : is4x4 ? 3.5 : 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 6.5 : is4x25 ? 8 : is4x4 ? 10.5 : 13);
    doc.setTextColor(0, 0, 0);
    doc.text(String(data.origin_code || 'BOM').toUpperCase(), rightX, infoY);
    doc.text(String(data.destination_code || 'DEL').toUpperCase(), rightX + (is4x2 ? 18 : 24), infoY);

    // Payment Status & Tracking Number
    if (!is4x2) {
      infoY += is4x25 ? 3.5 : 5.5;
      const payStatus = String(data.payment_status || 'PREPAID').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(is4x25 ? 5.5 : is4x4 ? 6.5 : 7.5);
      doc.setTextColor(75, 107, 148);
      doc.text('PAYMENT STATUS', rightX, infoY);

      infoY += is4x25 ? 3 : is4x4 ? 3.5 : 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(is4x25 ? 6.5 : is4x4 ? 9 : 11.5);
      doc.setTextColor(payStatus === 'COD' ? 180 : 15, payStatus === 'COD' ? 40 : 76, 58);
      if (payStatus === 'COD') {
        doc.text(`COD - ₹${Number(data.amount_to_collect || 0).toLocaleString('en-IN')}`, rightX, infoY);
      } else {
        doc.text(payStatus, rightX, infoY);
      }

      if (!is4x25) {
        infoY += is4x4 ? 4 : 5.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(is4x4 ? 6.5 : 7.5);
        doc.setTextColor(75, 107, 148);
        doc.text('TRACKING NO', rightX, infoY);

        infoY += is4x4 ? 3.5 : 4.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(is4x4 ? 8.5 : 11);
        doc.setTextColor(0, 0, 0);
        doc.text(String(data.tracking_number || '').toUpperCase(), rightX, infoY);
      }
    }
  } else {
    // Reflowed layout when Additional Details are hidden
    const rightX = sepX + 2.5;
    let infoY = sec2Y + (is4x2 ? 3.5 : is4x25 ? 4.5 : is4x4 ? 7 : 11);

    const payStatus = String(data.payment_status || 'PREPAID').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 5.5 : is4x25 ? 6 : is4x4 ? 7.5 : 9);
    doc.setTextColor(75, 107, 148);
    doc.text('PAYMENT STATUS', rightX, infoY);

    infoY += is4x2 ? 3 : is4x25 ? 4 : is4x4 ? 5.5 : 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 7 : is4x25 ? 8 : is4x4 ? 11 : 14);
    doc.setTextColor(payStatus === 'COD' ? 180 : 15, payStatus === 'COD' ? 40 : 76, 58);
    if (payStatus === 'COD') {
      doc.text(`COD - ₹${Number(data.amount_to_collect || 0).toLocaleString('en-IN')}`, rightX, infoY);
    } else {
      doc.text(payStatus, rightX, infoY);
    }

    infoY += is4x2 ? 3.5 : is4x25 ? 4.5 : is4x4 ? 6.5 : 8.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 5.5 : is4x25 ? 6 : is4x4 ? 7.5 : 9);
    doc.setTextColor(75, 107, 148);
    doc.text('TRACKING NO', rightX, infoY);

    infoY += is4x2 ? 3 : is4x25 ? 4 : is4x4 ? 5.5 : 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 7 : is4x25 ? 8 : is4x4 ? 10.5 : 13);
    doc.setTextColor(0, 0, 0);
    doc.text(String(data.tracking_number || '').toUpperCase(), rightX, infoY);
  }

  // ----------------------------------------------------
  // SECTION 3: BARCODE
  // ----------------------------------------------------
  const sec3Y = sec2Y + sec2Height;
  const sec3Height = is4x2 ? 8.5 : is4x25 ? 10.5 : is4x4 ? 18 : 26;
  doc.line(margin, sec3Y + sec3Height, margin + contentWidth, sec3Y + sec3Height);

  if (barcodeDataUrl) {
    try {
      const isQr = (data as any)?.barcode_type === 'QR';
      const bHeight = is4x2 ? 5.5 : is4x25 ? 7 : is4x4 ? 11 : 16;
      const barcodeWidth = isQr ? bHeight : (is4x25 ? contentWidth - 26 : contentWidth - 10);
      const barcodeX = isQr ? margin + (contentWidth - barcodeWidth) / 2 : (margin + (is4x25 ? 3 : 5));
      doc.addImage(barcodeDataUrl, 'PNG', barcodeX, sec3Y + 1.5, barcodeWidth, bHeight);
    } catch (err) {
      console.error('Failed to embed Barcode:', err);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is4x2 ? 6.5 : is4x25 ? 7 : is4x4 ? 9.5 : 12);
  doc.setTextColor(0, 0, 0);
  const trackX = is4x25 ? margin + 3 + (contentWidth - 26) / 2 : margin + contentWidth / 2;
  doc.text(
    String(data.tracking_number || '').toUpperCase(),
    trackX,
    sec3Y + sec3Height - (is4x2 ? 1 : 2),
    { align: 'center' }
  );

  // In 4x2.5, draw PKG: 01 / 03 in the right area beside the barcode
  if (is4x25) {
    const pkgLabel = 'PKG: ';
    const pkgNum = String(data.package_count || '01 / 01');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(pkgNum, margin + contentWidth - 3, sec3Y + sec3Height / 2 + 1, { align: 'right' });
    const numWidth = doc.getTextWidth(pkgNum);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(70, 70, 70);
    doc.text(pkgLabel, margin + contentWidth - 3 - numWidth - 1, sec3Y + sec3Height / 2 + 1, { align: 'right' });
  }

  // ----------------------------------------------------
  // SECTION 4: WEIGHT, DATE, MODE
  // ----------------------------------------------------
  const footerReserved = is4x2 ? 2.5 : is4x25 ? 3 : is4x4 ? 4 : 5;
  const sec4Y = sec3Y + sec3Height;
  const sec4Height = contentHeight - (sec1Height + sec2Height + sec3Height) - footerReserved;

  const colW = contentWidth / 3;

  if (sec4Height > 4) {
    // Dividers between 3 bottom columns
    doc.setLineWidth(0.3);
    doc.line(margin + colW, sec4Y, margin + colW, sec4Y + sec4Height);
    doc.line(margin + colW * 2, sec4Y, margin + colW * 2, sec4Y + sec4Height);

    // Col 1: WEIGHT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 4.5 : is4x25 ? 5 : is4x4 ? 5.5 : 7);
    doc.setTextColor(75, 107, 148);
    doc.text('WEIGHT', margin + 1.5, sec4Y + (is4x2 ? 2.5 : 3.5));
    doc.setFontSize(is4x2 ? 5.5 : is4x25 ? 6.5 : is4x4 ? 8.5 : 11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${Number(data.weight || 1.0).toFixed(2)} KG`, margin + 1.5, sec4Y + (is4x2 ? 5.5 : 7.5));

    // Col 2: DATE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 4.5 : is4x25 ? 5 : is4x4 ? 5.5 : 7);
    doc.setTextColor(75, 107, 148);
    doc.text('DATE', margin + colW + 1.5, sec4Y + (is4x2 ? 2.5 : 3.5));
    doc.setFontSize(is4x2 ? 5.5 : is4x25 ? 6.5 : is4x4 ? 8 : 9.5);
    doc.setTextColor(0, 0, 0);
    const dateStr = data.date ? new Date(data.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    doc.text(dateStr, margin + colW + 1.5, sec4Y + (is4x2 ? 5.5 : 7.5));

    // Col 3: MODE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(is4x2 ? 4.5 : is4x25 ? 5 : is4x4 ? 5.5 : 7);
    doc.setTextColor(75, 107, 148);
    doc.text('MODE', margin + colW * 2 + 1.5, sec4Y + (is4x2 ? 2.5 : 3.5));
    doc.setFontSize(is4x2 ? 5.5 : is4x25 ? 6.5 : is4x4 ? 8.5 : 10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(String(data.mode || 'SURFACE').toUpperCase(), margin + colW * 2 + 1.5, sec4Y + (is4x2 ? 5.5 : 7.5));
  }

  // Bottom Footer Bar
  doc.setLineWidth(0.2);
  doc.line(margin, margin + contentHeight - footerReserved, margin + contentWidth, margin + contentHeight - footerReserved);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is4x2 ? 4.5 : is4x25 ? 5 : is4x4 ? 5.5 : 6.5);
  doc.setTextColor(100, 100, 100);
  const footerText = template.footerText || 'GEO TRANSIT LOGISTICS NETWORK • TRACK AT WWW.GEOTRANSIT.COM';
  doc.text(footerText, margin + contentWidth / 2, margin + contentHeight - (footerReserved / 3), { align: 'center' });
}

/**
 * Generates a high-precision, true-to-size PDF for thermal shipping labels (e.g. 4x6 inch, A6).
 * Generates multiple pages corresponding to the entered Package Count.
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

  const totalCount = parsePackageCount(data.package_count);

  for (let i = 0; i < totalCount; i++) {
    if (i > 0) {
      doc.addPage([widthMm, heightMm], orientation);
    }
    const pageData = {
      ...data,
      package_count: formatPackageSequence(i + 1, totalCount),
    };
    drawSingleShippingLabel(doc, template, pageData, qrDataUrl, barcodeDataUrl);
  }

  return doc;
}

/**
 * Generates a combined multi-page PDF containing all bulk shipping labels
 * with exact thermal dimensions and package counts.
 */
export async function generateBulkShippingLabelsPDF({
  template,
  items,
}: {
  template: ShippingLabelTemplateData;
  items: Array<{
    data: Record<string, any>;
    qrDataUrl?: string;
    barcodeDataUrl?: string;
  }>;
}): Promise<jsPDF> {
  const widthMm = template.widthMm || 101.6;
  const heightMm = template.heightMm || 152.4;
  const orientation = template.orientation === 'LANDSCAPE' ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  let isFirstPage = true;

  for (const item of items) {
    const totalCount = parsePackageCount(item.data.package_count);
    for (let i = 0; i < totalCount; i++) {
      if (!isFirstPage) {
        doc.addPage([widthMm, heightMm], orientation);
      }
      isFirstPage = false;
      const pageData = {
        ...item.data,
        package_count: formatPackageSequence(i + 1, totalCount),
      };
      drawSingleShippingLabel(doc, template, pageData, item.qrDataUrl, item.barcodeDataUrl);
    }
  }

  return doc;
}


/**
 * Downloads high resolution PNG image(s) of the shipping label(s) using html2canvas-pro.
 */
export async function downloadShippingLabelPNG(
  elementIdOrIds: string | string[],
  trackingNumber: string
): Promise<boolean> {
  const ids = Array.isArray(elementIdOrIds) ? elementIdOrIds : [elementIdOrIds];
  let allSuccess = true;

  for (let i = 0; i < ids.length; i++) {
    const elementId = ids[i];
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID ${elementId} not found.`);
      allSuccess = false;
      continue;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 3, // 300 DPI high resolution for thermal printing
        useCORS: true,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const suffix = ids.length > 1 ? `-pkg-${String(i + 1).padStart(2, '0')}` : '';
      link.download = `shipping-label-${trackingNumber || 'consignment'}${suffix}.png`;
      link.href = imgData;
      link.click();

      if (i < ids.length - 1) {
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (error) {
      console.error(`Failed to download shipping label PNG for ${elementId}:`, error);
      allSuccess = false;
    }
  }

  return allSuccess;
}

/**
 * Clean isolated print dialog for the shipping label(s).
 */
export function printShippingLabel(
  elementIdOrIds: string | string[],
  widthInches: number = 4,
  heightInches: number = 6
): void {
  const ids = Array.isArray(elementIdOrIds) ? elementIdOrIds : [elementIdOrIds];
  const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

  if (elements.length === 0) {
    console.error('No printable elements found.');
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

  const isA4 = widthInches >= 8.0 || heightInches >= 10.0;
  const headStyles = typeof document !== 'undefined'
    ? Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((node) => node.outerHTML)
        .join('\n')
    : '';

  const pagesHtml = elements
    .map((el) => `<div class="label-page">${el.outerHTML}</div>`)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Shipping Label</title>
        ${headStyles}
        <style>
          @page {
            size: ${isA4 ? 'A4 portrait' : `${widthInches}in ${heightInches}in`};
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            height: 100%;
          }
          .label-page {
            width: ${widthInches}in;
            height: ${heightInches}in;
            max-height: ${heightInches}in;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto;
            box-sizing: border-box;
            overflow: hidden;
          }
          .label-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
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
