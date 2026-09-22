import { formatDateIndian, formatDateTimeIndian } from './dateUtils';

function getLogoDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ width: 100, height: 100 });
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 100, height: 100 });
    };
    img.src = base64;
  });
}

export async function exportToPDF(
  calculation: any,
  userName: string,
  options?: {
    template?: any;
    customer?: any;
    route?: any;
    quoteDetails?: any;
  }
) {
  if (typeof window === 'undefined') return;

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    const tmpl = options?.template || {
      companyName: 'GEO TRANSIT',
      companyTagline: 'Enterprise Logistics Tools & Calculations',
      address: 'Corporate Office, Mumbai, India',
      phone: '+91 9999999999',
      email: 'support@geotransit.com',
      website: 'www.geotransit.com',
      logo: null,
    };
    const customer = options?.customer || null;
    const route = options?.route || null;
    const quoteDetails = options?.quoteDetails || {
      documentType: 'REPORT',
      quoteNumber: `CR-${calculation.id || Date.now()}`,
      createdAt: new Date(calculation.createdAt || Date.now()).toISOString(),
      validityDays: 30,
      paymentTerms: 'Net 30 days',
    };

    // 1. Branding Header - Top Accent Line
    doc.setFillColor(15, 76, 58); // Deep Green brand accent
    doc.rect(15, 10, 180, 1.5, 'F');

    // Logo resolution and scaling
    let logoH = 0;
    let logoW = 0;
    if (tmpl.logo) {
      try {
        const imgDim = await getLogoDimensions(tmpl.logo);
        const maxW = 45;
        const maxH = 15;
        logoW = imgDim.width;
        logoH = imgDim.height;
        const ratio = logoW / logoH;
        if (logoW > maxW) {
          logoW = maxW;
          logoH = logoW / ratio;
        }
        if (logoH > maxH) {
          logoH = maxH;
          logoW = logoH * ratio;
        }
        
        let format = 'PNG';
        if (tmpl.logo.includes('image/jpeg') || tmpl.logo.includes('image/jpg')) {
          format = 'JPEG';
        } else if (tmpl.logo.includes('image/webp')) {
          format = 'WEBP';
        }
        
        doc.addImage(tmpl.logo, format, 15, 15, logoW, logoH);
      } catch (err) {
        console.error('Failed to render logo in PDF:', err);
      }
    }

    const textY = 16 + (logoH > 0 ? logoH + 5 : 0);

    // Left Column: Sender Branding Details
    doc.setTextColor(15, 76, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(tmpl.companyName, 15, textY);

    if (tmpl.companyTagline) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 130, 125);
      doc.text(tmpl.companyTagline, 15, textY + 4.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(28, 46, 36);
    doc.text(tmpl.address, 15, textY + (tmpl.companyTagline ? 9.5 : 5.5));
    doc.text(`Phone: ${tmpl.phone} | Email: ${tmpl.email}`, 15, textY + (tmpl.companyTagline ? 13.5 : 9.5));
    if (tmpl.website) {
      doc.text(`Website: ${tmpl.website}`, 15, textY + (tmpl.companyTagline ? 17.5 : 13.5));
    }

    // Right Column: Quotation Metadata
    const rightX = 130;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 76, 58);
    doc.text(quoteDetails.documentType === 'QUOTATION' ? 'SHIPPING QUOTATION' : 'CALCULATION REPORT', rightX, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 130, 125);

    const labelY = 28;
    doc.text('Doc Number:', rightX, labelY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 46, 36);
    doc.text(quoteDetails.quoteNumber, rightX + 25, labelY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 130, 125);
    doc.text('Date:', rightX, labelY + 4.5);
    doc.setTextColor(28, 46, 36);
    doc.text(formatDateIndian(quoteDetails.createdAt), rightX + 25, labelY + 4.5);

    if (quoteDetails.documentType === 'QUOTATION') {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 130, 125);
      doc.text('Valid Until:', rightX, labelY + 9);
      const validDate = formatDateIndian(new Date(quoteDetails.createdAt).getTime() + quoteDetails.validityDays * 24 * 60 * 60 * 1000);
      doc.setTextColor(28, 46, 36);
      doc.text(validDate, rightX + 25, labelY + 9);
    }

    if (tmpl.gstNumber) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 130, 125);
      doc.text('GSTIN:', rightX, labelY + 13.5);
      doc.setTextColor(28, 46, 36);
      doc.text(tmpl.gstNumber, rightX + 25, labelY + 13.5);
    }

    // Divider Line
    const dividerY = textY + (tmpl.companyTagline ? 23 : 19);
    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.3);
    doc.line(15, dividerY, 195, dividerY);

    // 2. Customer and Shipment Summary Blocks
    const blockY = dividerY + 6;
    
    // Left: Customer Details
    if (customer && customer.name) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 76, 58);
      doc.text('PREPARED FOR:', 15, blockY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(28, 46, 36);
      doc.text(customer.name, 15, blockY + 5);

      let custY = blockY + 9.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 90, 85);

      if (customer.company) {
        doc.text(customer.company, 15, custY);
        custY += 4;
      }
      if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, 15, custY);
        custY += 4;
      }
      if (customer.email) {
        doc.text(`Email: ${customer.email}`, 15, custY);
        custY += 4;
      }
      if (customer.billingAddress) {
        doc.setFont('helvetica', 'bold');
        doc.text('Billing Address:', 15, custY);
        doc.setFont('helvetica', 'normal');
        custY += 3.5;
        const lines = doc.splitTextToSize(customer.billingAddress, 75);
        doc.text(lines, 15, custY);
      }
    } else {
      // Default placeholder if no customer
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 76, 58);
      doc.text('PREPARED BY:', 15, blockY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(28, 46, 36);
      doc.text(userName, 15, blockY + 5);
    }

    // Right: Shipment Routing Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 76, 58);
    doc.text('SHIPMENT DETAILS:', rightX, blockY);

    let routeY = blockY + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 90, 85);

    if (route && (route.originCity || route.originPincode || route.destCity || route.destPincode)) {
      const originStr = `${route.originCity || ''} ${route.originPincode || ''}`.trim();
      const destStr = `${route.destCity || ''} ${route.destPincode || ''}`.trim();
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(28, 46, 36);
      doc.text(`${originStr || 'Origin'} → ${destStr || 'Destination'}`, rightX, routeY);
      routeY += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 90, 85);
    } else if (calculation.destination) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(28, 46, 36);
      doc.text(`Destination: ${calculation.destination}`, rightX, routeY);
      routeY += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 90, 85);
    }

    const mode = route?.serviceType || (calculation.divisor === 4000 ? 'Surface' : calculation.divisor === 4500 ? 'Air' : calculation.divisor === 5000 ? 'International' : 'Custom');
    doc.text(`Shipment Mode: ${mode} Cargo`, rightX, routeY);
    routeY += 3.5;

    const courier = route?.courierName || calculation.rateCardName;
    if (courier) {
      doc.text(`Courier Service: ${courier}`, rightX, routeY);
      routeY += 3.5;
    }

    doc.text(`Package Count: ${calculation.packageCount}`, rightX, routeY);
    routeY += 3.5;
    doc.text(`Actual Weight: ${calculation.actualWeight} KG | Volumetric Weight: ${calculation.volumetricWeight} KG`, rightX, routeY);
    routeY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 76, 58);
    doc.text(`Final Chargeable Weight: ${calculation.chargeableWeight} KG`, rightX, routeY);

    // 3. Package Details Table
    const tableStartY = dividerY + 45;
    doc.setFillColor(244, 247, 246); // Surface light green
    doc.rect(15, tableStartY, 180, 8, 'F');
    doc.setTextColor(15, 76, 58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('#', 18, tableStartY + 5.5);
    doc.text(`Dimensions (${calculation.unit || 'CM'})`, 28, tableStartY + 5.5);
    doc.text('Act Wt (KG)', 75, tableStartY + 5.5);
    doc.text('Vol Wt (KG)', 105, tableStartY + 5.5);
    doc.text('Qty', 135, tableStartY + 5.5);
    doc.text('Total Chargeable (KG)', 150, tableStartY + 5.5);

    doc.setTextColor(28, 46, 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const packages = Array.isArray(calculation.packages) ? calculation.packages : [];
    let startY = tableStartY + 8;

    packages.forEach((pkg: any, idx: number) => {
      // Manage page overflow
      if (startY > 255) {
        doc.addPage();
        // Top accent line on new page
        doc.setFillColor(15, 76, 58);
        doc.rect(15, 10, 180, 1.5, 'F');
        startY = 20;

        // Re-draw table headers on new page
        doc.setFillColor(244, 247, 246);
        doc.rect(15, startY, 180, 8, 'F');
        doc.setTextColor(15, 76, 58);
        doc.setFont('helvetica', 'bold');
        doc.text('#', 18, startY + 5.5);
        doc.text(`Dimensions (${calculation.unit || 'CM'})`, 28, startY + 5.5);
        doc.text('Act Wt (KG)', 75, startY + 5.5);
        doc.text('Vol Wt (KG)', 105, startY + 5.5);
        doc.text('Qty', 135, startY + 5.5);
        doc.text('Total Chargeable (KG)', 150, startY + 5.5);

        doc.setTextColor(28, 46, 36);
        doc.setFont('helvetica', 'normal');
        startY += 8;
      }

      // Draw alternating row backgrounds
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 250);
        doc.rect(15, startY, 180, 8, 'F');
      }

      const dimStr = `${pkg.length ?? 0} x ${pkg.width ?? 0} x ${pkg.height ?? 0}`;
      doc.text((idx + 1).toString(), 18, startY + 5.5);
      doc.text(dimStr, 28, startY + 5.5);
      doc.text(`${pkg.actualWeight ?? 0} kg`, 75, startY + 5.5);
      doc.text(`${pkg.volumetricWeightPerUnit ?? 0} kg`, 105, startY + 5.5);
      doc.text(String(pkg.quantity ?? 1), 135, startY + 5.5);
      doc.text(`${pkg.totalChargeableWeight ?? 0} kg`, 150, startY + 5.5);
      
      startY += 8;
    });

    // 4. Rate Breakdown & Pricing Summary Card
    const hasPricing = route?.pricingDetails || (calculation.shippingCost && calculation.shippingCost > 0);
    
    if (hasPricing) {
      if (startY > 215) {
        doc.addPage();
        doc.setFillColor(15, 76, 58);
        doc.rect(15, 10, 180, 1.5, 'F');
        startY = 20;
      }

      startY += 5;
      doc.setFillColor(244, 247, 246);
      doc.rect(15, startY, 180, 28, 'F');
      doc.setDrawColor(220, 225, 222);
      doc.setLineWidth(0.3);
      doc.rect(15, startY, 180, 28, 'S');

      if (route?.pricingDetails) {
        const pd = route.pricingDetails;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 90, 85);
        doc.text(`Base Shipping Rate:`, 20, startY + 10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(28, 46, 36);
        doc.text(`INR ${pd.baseRate.toFixed(2)}`, 70, startY + 10);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 90, 85);
        doc.text(`Other/Fuel Surcharges:`, 20, startY + 18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(28, 46, 36);
        doc.text(`INR ${pd.additionalCharges.toFixed(2)}`, 70, startY + 18);

        // Highlight Green Box for Grand Total
        doc.setFillColor(15, 76, 58);
        doc.rect(115, startY, 80, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('TOTAL QUOTED SHIPPING COST', 120, startY + 10);
        doc.setFontSize(13);
        doc.text(`INR ${pd.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 120, startY + 20);
      } else {
        // Fallback simple pricing
        doc.setFillColor(15, 76, 58);
        doc.rect(15, startY, 180, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('TOTAL SHIPPING CHARGE:', 20, startY + 10.5);
        doc.setFontSize(12);
        doc.text(`INR ${calculation.shippingCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 130, startY + 10.5);
      }
      
      startY += 34;
    } else {
      startY += 6;
    }

    // 5. Terms and Conditions Section
    if (tmpl.terms) {
      if (startY > 230) {
        doc.addPage();
        doc.setFillColor(15, 76, 58);
        doc.rect(15, 10, 180, 1.5, 'F');
        startY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 76, 58);
      doc.text('TERMS & CONDITIONS', 15, startY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 125);
      
      const termLines = doc.splitTextToSize(tmpl.terms, 180);
      doc.text(termLines, 15, startY + 4);
      startY += 6 + termLines.length * 3.5;
    }

    // 6. Professional Footer Block (always pinned at bottom of last page)
    const footerY = 265;
    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.3);
    doc.line(15, footerY, 195, footerY);

    // Left: Configured Footer Note
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 125);
    doc.text(tmpl.footerText || 'Thank you for choosing us.', 15, footerY + 5);
    doc.text(`This document is generated via Geo Transit SaaS cargo calculation system.`, 15, footerY + 8.5);

    // Right: Authorized designees
    if (tmpl.authorizedPerson) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(28, 46, 36);
      doc.text('Authorized Representative:', 135, footerY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(tmpl.authorizedPerson, 135, footerY + 9);
      doc.text(tmpl.companyName, 135, footerY + 12);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Generated By: ${userName}`, 135, footerY + 5);
    }

    const filename = `${quoteDetails.quoteNumber}.pdf`;
    doc.save(filename);
    return { doc, blob: doc.output('blob'), filename };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
}

export async function takeScreenshot(elementId: string, filename: string) {
  if (typeof window === 'undefined') return;

  try {
    const html2canvas = (await import('html2canvas-pro')).default;
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id ${elementId} not found`);
      return;
    }

    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: 2, // High resolution
      backgroundColor: '#ffffff',
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error generating screenshot:', error);
  }
}

export async function exportInvoiceToPDF(invoice: any) {
  if (typeof window === 'undefined') return;

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    const billing = invoice.billingDetails || {};

    // 1. Header Branding
    doc.setFillColor(15, 76, 58); // Deep Green
    doc.rect(0, 0, 210, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('GEO TRANSIT', 15, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Enterprise Logistics Solutions', 15, 28);
    doc.text('Invoice Support: support@geotransit.com', 15, 34);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', 140, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 140, 30);
    doc.text(`Date: ${formatDateIndian(invoice.date || invoice.createdAt)}`, 140, 36);

    // 2. Billing details vs Supplier details
    doc.setTextColor(28, 46, 36);
    doc.setFontSize(10);

    // Supplier Box
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier Details:', 15, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('GEO TRANSIT Private Limited', 15, 66);
    doc.text('GSTIN: 27AAACG1234F1Z0 (Sample)', 15, 72);
    doc.text('Corporate Office, Mumbai, India', 15, 78);

    // Bill To Box
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To (Customer Details):', 115, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(billing.fullName || 'N/A', 115, 66);
    doc.text(billing.companyName || 'N/A', 115, 72);
    doc.text(`${billing.address || ''}, ${billing.city || ''}`, 115, 78);
    doc.text(`${billing.state || ''}, ${billing.country || ''} - ${billing.pincode || ''}`, 115, 84);
    if (billing.gstin) {
      doc.setFont('helvetica', 'bold');
      doc.text(`GSTIN: ${billing.gstin}`, 115, 90);
      doc.setFont('helvetica', 'normal');
    }

    // Divider Line
    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.5);
    doc.line(15, 98, 195, 98);

    // 3. Purchase Details Table
    doc.setFont('helvetica', 'bold');
    doc.text('Item Description', 15, 108);

    let startY = 115;
    doc.setFillColor(244, 247, 246);
    doc.rect(15, startY, 180, 8, 'F');
    doc.setTextColor(15, 76, 58);
    doc.setFontSize(9);
    doc.text('Product Name & Plan description', 18, startY + 5);
    doc.text('Device Limit', 95, startY + 5);
    doc.text('Duration', 125, startY + 5);
    doc.text('Base Price (INR)', 155, startY + 5);

    doc.setTextColor(28, 46, 36);
    doc.setFont('helvetica', 'normal');

    startY += 8;
    doc.text(invoice.planName, 18, startY + 5);
    doc.text(`${invoice.deviceLimit} Devices`, 95, startY + 5);
    doc.text(`${invoice.duration} Months`, 125, startY + 5);
    doc.text(invoice.baseAmount.toFixed(2), 155, startY + 5);

    // Bottom Border
    doc.line(15, startY + 10, 195, startY + 10);

    // 4. Financial Calculations Box
    let calcY = startY + 18;
    doc.setFontSize(10);
    doc.text('Subtotal (Base Amount):', 115, calcY);
    doc.text(`INR ${invoice.baseAmount.toFixed(2)}`, 165, calcY);

    calcY += 6;
    doc.text('GST (Goods & Services Tax):', 115, calcY);
    doc.text(`INR ${invoice.gstAmount.toFixed(2)}`, 165, calcY);

    calcY += 8;
    doc.setFillColor(232, 245, 233);
    doc.rect(112, calcY - 5, 83, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 76, 58);
    doc.text('TOTAL AMOUNT PAID:', 115, calcY + 1);
    doc.text(`INR ${invoice.totalAmount.toFixed(2)}`, 165, calcY + 1);

    // 5. Subscription terms
    doc.setTextColor(28, 46, 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Subscription Terms:', 15, calcY + 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`• Active Duration: ${formatDateIndian(invoice.startDate)} to ${formatDateIndian(invoice.endDate)}`, 15, calcY + 26);
    doc.text(`• Reference Payment UTR: ${invoice.paymentRef || 'Verified'}`, 15, calcY + 32);

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 125);
    doc.text('Thank you for choosing GEO TRANSIT. This is a computer-generated tax invoice and requires no signature.', 15, 275);
    doc.text('GEO TRANSIT Solutions PVT LTD.', 150, 275);

    doc.save(`geotransit-invoice-${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    console.error('Error generating Invoice PDF:', error);
  }
}

export async function exportRateQuoteToPDF(
  quote: any,
  template: any
) {
  if (typeof window === 'undefined') return;

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    const primaryColor = [15, 76, 58];
    const secondaryColor = [80, 90, 85];
    const textColorDark = [28, 46, 36];
    
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, 10, 180, 1.5, 'F');

    let logoH = 0;
    let logoW = 0;
    if (template.logo) {
      try {
        const imgDim = await getLogoDimensions(template.logo);
        const maxW = 45;
        const maxH = 15;
        logoW = imgDim.width;
        logoH = imgDim.height;
        const ratio = logoW / logoH;
        if (logoW > maxW) {
          logoW = maxW;
          logoH = logoW / ratio;
        }
        if (logoH > maxH) {
          logoH = maxH;
          logoW = logoH * ratio;
        }
        
        let format = 'PNG';
        if (template.logo.includes('image/jpeg') || template.logo.includes('image/jpg')) {
          format = 'JPEG';
        } else if (template.logo.includes('image/webp')) {
          format = 'WEBP';
        }
        doc.addImage(template.logo, format, 15, 15, logoW, logoH);
      } catch (err) {
        console.error('Failed to render logo in PDF:', err);
      }
    }

    const textY = 16 + (logoH > 0 ? logoH + 5 : 0);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(template.companyName || 'GEO TRANSIT', 15, textY);

    if (template.companyTagline) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(template.companyTagline, 15, textY + 4.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(template.address || '', 15, textY + (template.companyTagline ? 9.5 : 5.5));
    doc.text(`Phone: ${template.phone || ''} | Email: ${template.email || ''}`, 15, textY + (template.companyTagline ? 13.5 : 9.5));
    if (template.website) {
      doc.text(`Website: ${template.website}`, 15, textY + (template.companyTagline ? 17.5 : 13.5));
    }

    const rightX = 135;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('SHIPPING QUOTATION', rightX, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

    const labelY = 28;
    doc.text('Quotation No:', rightX, labelY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(quote.quoteNumber, rightX + 25, labelY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Date:', rightX, labelY + 4.5);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(formatDateIndian(quote.createdAt), rightX + 25, labelY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Valid Until:', rightX, labelY + 9);
    const validDate = formatDateIndian(new Date(quote.createdAt).getTime() + (parseInt(quote.validityDays) || 30) * 24 * 60 * 60 * 1000);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(validDate, rightX + 25, labelY + 9);

    if (template.gstNumber) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('GSTIN:', rightX, labelY + 13.5);
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(template.gstNumber, rightX + 25, labelY + 13.5);
    }

    const dividerY = textY + (template.companyTagline ? 23 : 19);
    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.3);
    doc.line(15, dividerY, 195, dividerY);

    let blockY = dividerY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TO:', 15, blockY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(quote.customerName, 15, blockY + 4.5);

    let custY = blockY + 8.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

    if (quote.customerCompany) {
      doc.text(quote.customerCompany, 15, custY);
      custY += 4;
    }
    if (quote.customerPhone) {
      doc.text(`Phone: ${quote.customerPhone}`, 15, custY);
      custY += 4;
    }
    if (quote.customerEmail) {
      doc.text(`Email: ${quote.customerEmail}`, 15, custY);
      custY += 4;
    }
    if (quote.customerAddress) {
      const addrLines = doc.splitTextToSize(quote.customerAddress, 85);
      doc.text(addrLines, 15, custY);
      custY += addrLines.length * 3.5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const subjectText = quote.subject || 'SUBJECT: Quotation for Courier Service';
    doc.text(subjectText, 15, custY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    const introMsg = quote.intro || 'Thank you for showing interest in our services.\n\nBased on the shipment details provided, we are pleased to offer the following shipping quotation.';
    const introLines = doc.splitTextToSize(introMsg, 180);
    doc.text(introLines, 15, custY + 8);

    let tableStartY = custY + 12 + (introLines.length * 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SHIPMENT DETAILS', 15, tableStartY);

    doc.setFillColor(244, 247, 246);
    doc.rect(15, tableStartY + 2.5, 180, 42, 'F');
    doc.setDrawColor(220, 225, 222);
    doc.rect(15, tableStartY + 2.5, 180, 42, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

    const col1X = 20;
    const col2X = 110;
    let detailY = tableStartY + 8;

    const details = [
      { label: 'Courier Company', value: quote.courier || 'N/A' },
      { label: 'Service Name', value: quote.service || 'N/A' },
      { label: 'Service Type', value: quote.serviceType || 'Domestic' },
      { label: 'Origin City', value: quote.originInfo?.city || 'N/A' },
      { label: 'Destination City', value: quote.destInfo?.city || 'N/A' },
      { label: 'Destination Region', value: quote.detectedRegion || 'N/A' },
    ];

    const details2 = [
      { label: 'Origin Pincode', value: quote.originPincode || 'N/A' },
      { label: 'Destination Pincode', value: quote.destinationPincode || 'N/A' },
      { label: 'Actual Weight', value: `${quote.weight || 0} KG` },
      { label: 'Volumetric Weight', value: `${quote.volumetricWeight || 0} KG` },
      { label: 'Final Chargeable Weight', value: `${quote.chargeableWeight || 0} KG` },
      { label: 'Pricing Model', value: quote.pricingMode || 'N/A' },
    ];

    for (let i = 0; i < 6; i++) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(details[i].label + ':', col1X, detailY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(String(details[i].value), col1X + 35, detailY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(details2[i].label + ':', col2X, detailY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(String(details2[i].value), col2X + 38, detailY);

      detailY += 5.5;
    }

    let nextY = tableStartY + 50;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('CALCULATED SHIPPING RATE', 15, nextY);

    doc.setFillColor(244, 247, 246);
    doc.rect(15, nextY + 2.5, 180, 24, 'F');
    doc.rect(15, nextY + 2.5, 180, 24, 'S');

    let textRateY = nextY + 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

    if (quote.pricingMode === 'Cargo') {
      doc.text(`Cargo Transport Mode:`, col1X, textRateY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(quote.cargoMode || 'AIR', col1X + 35, textRateY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Per KG Rate:`, col1X, textRateY + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(`INR ${parseFloat(quote.cargoRate || 0).toFixed(2)}`, col1X + 35, textRateY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Chargeable Weight:`, col1X, textRateY + 12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(`${quote.chargeableWeight} KG`, col1X + 35, textRateY + 12);
    } else if (quote.pricingMode === 'LTL/PTL') {
      doc.text(`Destination Region:`, col1X, textRateY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(quote.detectedRegion || 'ROI', col1X + 35, textRateY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Matched Weight Range:`, col1X, textRateY + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(quote.weightRange || 'N/A', col1X + 35, textRateY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Calculated Base Rate:`, col1X, textRateY + 12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(`INR ${parseFloat(quote.baseRate || 0).toFixed(2)}`, col1X + 35, textRateY + 12);
    } else if (quote.serviceType === 'International' || quote.type === 'International' || quote.pricingMode === 'PER_KG') {
      const isIntl = quote.serviceType === 'International' || quote.type === 'International';
      const snap = quote.rateSnapshot || {};
      
      if (isIntl) {
        doc.text(`International Freight:`, col1X, textRateY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(`${snap.freightType || 'Freight'} — ${snap.destinationCountry || quote.destinationPincode || 'Destination'}`, col1X + 38, textRateY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Per KG Rate:`, col1X, textRateY + 6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(`INR ${parseFloat(snap.perKgRate || quote.perKgRate || 0).toFixed(2)} / KG`, col1X + 38, textRateY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Chargeable Weight:`, col1X, textRateY + 12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(`${quote.chargeableWeight || quote.weight} KG`, col1X + 38, textRateY + 12);

        if (snap.tat || quote.tat) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
          doc.text(`Estimated TAT:`, col1X, textRateY + 18);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text(`${snap.tat || quote.tat}`, col1X + 38, textRateY + 18);
        }
      } else {
        doc.text(`Per KG Rate:`, col1X, textRateY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(`INR ${parseFloat(quote.perKgRate || 0).toFixed(2)} / KG`, col1X + 35, textRateY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Chargeable Weight:`, col1X, textRateY + 6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(`${quote.chargeableWeight} KG`, col1X + 35, textRateY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Calculation:`, col1X, textRateY + 12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(`${quote.chargeableWeight} KG x ₹${parseFloat(quote.perKgRate || 0).toFixed(2)}`, col1X + 35, textRateY + 12);
      }
    } else {
      doc.text(`Applicable Slab/Range:`, col1X, textRateY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(quote.slabRange || 'N/A', col1X + 35, textRateY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Base Rate for Slab:`, col1X, textRateY + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
      doc.text(`INR ${parseFloat(quote.slabBaseRate || 0).toFixed(2)}`, col1X + 35, textRateY + 6);

      if (quote.extraSlabsCount > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Additional Slabs Rate:`, col1X, textRateY + 12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.text(`${quote.extraSlabsCount} slabs x ₹${quote.extraSlabRate || 0}`, col1X + 35, textRateY + 12);
      }
    }

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(115, nextY + 2.5, 80, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('TOTAL SHIPPING CHARGE', 120, nextY + 10);
    doc.setFontSize(13);
    const formattedTotal = parseFloat(quote.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    doc.text(`INR ${formattedTotal}`, 120, nextY + 20);

    let currentY = nextY + 32;

    if (parseFloat(quote.additionalCharges || 0) > 0 || parseFloat(quote.gstRate || 0) > 0) {
      doc.setFillColor(250, 251, 250);
      doc.rect(15, currentY, 180, 15, 'F');
      doc.rect(15, currentY, 180, 15, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Base Quote: INR ${parseFloat(quote.baseRate || 0).toFixed(2)}`, 20, currentY + 6);
      if (parseFloat(quote.additionalCharges || 0) > 0) {
        doc.text(`Surcharges: INR ${parseFloat(quote.additionalCharges || 0).toFixed(2)}`, 20, currentY + 11);
      }
      if (parseFloat(quote.gstRate || 0) > 0) {
        doc.text(`GST: ${quote.gstRate}% (INR ${parseFloat(quote.gstAmount || 0).toFixed(2)})`, 110, currentY + 6);
      }
      currentY += 20;
    }

    if (quote.terms) {
      if (currentY > 230) {
        doc.addPage();
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(15, 10, 180, 1.5, 'F');
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('TERMS & CONDITIONS', 15, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

      const termLines = doc.splitTextToSize(quote.terms, 180);
      doc.text(termLines, 15, currentY + 4);
      currentY += 6 + termLines.length * 3.5;
    }

    let footerY = 250;
    if (currentY > 230) {
      doc.addPage();
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, 10, 180, 1.5, 'F');
      footerY = 250;
    } else {
      footerY = Math.max(currentY + 10, 245);
    }

    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.3);
    doc.line(15, footerY, 195, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Thank you for choosing our services.', 15, footerY + 5);
    doc.text('This document is a formal quotation based on the shipping details provided.', 15, footerY + 9);

    doc.setFont('helvetica', 'bold');
    doc.text('Yours faithfully,', 135, footerY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(template.authorizedPerson || 'Authorized Representative', 135, footerY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(template.companyName || 'GEO TRANSIT', 135, footerY + 14);

    const filename = `${quote.quoteNumber}.pdf`;
    doc.save(filename);
    return { doc, blob: doc.output('blob'), filename };
  } catch (error) {
    console.error('Error exporting Rate Quote PDF:', error);
    return null;
  }
}

export async function exportWeightCalculationPDF(
  calculation: any,
  userProfile?: any,
  template?: any
) {
  if (typeof window === 'undefined') return null;

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    const companyName = template?.companyName || userProfile?.company || userProfile?.name || 'Logistics Partner';
    const logo = template?.logo || userProfile?.logo || null;
    const companyTagline = template?.companyTagline || template?.tagline || '';
    const address = template?.address || userProfile?.address || '';
    const phone = template?.phone || userProfile?.mobile || userProfile?.phone || '';
    const email = template?.email || userProfile?.email || '';
    const website = template?.website || '';

    // Primary Colors - Professional Dark Slate / Deep Teal
    const primaryColor = [15, 76, 58];
    const textColorDark = [28, 46, 36];
    const textColorMuted = [100, 115, 110];

    // 1. Top Brand Line Accent
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, 10, 180, 1.5, 'F');

    // 2. Company Logo handling
    let logoH = 0;
    let logoW = 0;
    if (logo) {
      try {
        const imgDim = await getLogoDimensions(logo);
        const maxW = 45;
        const maxH = 15;
        logoW = imgDim.width;
        logoH = imgDim.height;
        const ratio = logoW / logoH;
        if (logoW > maxW) {
          logoW = maxW;
          logoH = logoW / ratio;
        }
        if (logoH > maxH) {
          logoH = maxH;
          logoW = logoH * ratio;
        }
        
        let format = 'PNG';
        if (logo.includes('image/jpeg') || logo.includes('image/jpg')) {
          format = 'JPEG';
        } else if (logo.includes('image/webp')) {
          format = 'WEBP';
        }
        doc.addImage(logo, format, 15, 15, logoW, logoH);
      } catch (err) {
        console.error('Failed to render company logo in PDF:', err);
      }
    }

    const textY = 16 + (logoH > 0 ? logoH + 5 : 0);

    // 3. Sender / Company Header (No platform branding!)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, 15, textY);

    let nextLineY = textY + 4.5;
    if (companyTagline) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(textColorMuted[0], textColorMuted[1], textColorMuted[2]);
      doc.text(companyTagline, 15, nextLineY);
      nextLineY += 4.5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);

    if (address) {
      doc.text(address, 15, nextLineY);
      nextLineY += 4;
    }

    const contactParts = [];
    if (phone) contactParts.push(`Phone: ${phone}`);
    if (email) contactParts.push(`Email: ${email}`);
    if (contactParts.length > 0) {
      doc.text(contactParts.join(' | '), 15, nextLineY);
      nextLineY += 4;
    }

    if (website) {
      doc.text(`Website: ${website}`, 15, nextLineY);
      nextLineY += 4;
    }

    // 4. Document Header Title (Right Column)
    const rightX = 125;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('WEIGHT CALCULATION REPORT', rightX, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textColorMuted[0], textColorMuted[1], textColorMuted[2]);

    const calcIdStr = calculation?.id ? `CALC-${calculation.id.substring(0, 10).toUpperCase()}` : `CALC-${Date.now()}`;
    const dateStr = formatDateTimeIndian(calculation?.createdAt || Date.now());

    doc.text('Ref Number:', rightX, 28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(calcIdStr, rightX + 22, 28);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColorMuted[0], textColorMuted[1], textColorMuted[2]);
    doc.text('Date & Time:', rightX, 33);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(dateStr, rightX + 22, 33);

    // Divider Line
    const dividerY = Math.max(nextLineY + 4, 45);
    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.3);
    doc.line(15, dividerY, 195, dividerY);

    // 5. Calculation Parameters & Output Summary Box
    const blockY = dividerY + 6;

    // Left Box: Parameters
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('CALCULATION PARAMETERS:', 15, blockY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);

    const serviceModeStr = calculation.serviceType === 'INTERNATIONAL'
      ? (calculation.divisor === 4500
          ? 'International Air'
          : calculation.divisor === 5000
            ? 'International Air Freight'
            : `Custom Cargo (${calculation.divisor})`)
      : (calculation.divisor === 4000
          ? 'Domestic Surface'
          : calculation.divisor === 4500
            ? 'Domestic Air'
            : calculation.divisor === 5000
              ? 'Domestic Air Cargo'
              : `Custom Cargo (${calculation.divisor})`);

    doc.text(`Service Type: ${serviceModeStr}`, 15, blockY + 5);
    doc.text(`Logistics Divisor: ${calculation.divisor}`, 15, blockY + 10);
    doc.text(`Dimensions Unit: ${calculation.unit || 'CM'}`, 15, blockY + 15);
    doc.text(`Total Package Count: ${calculation.packageCount || 1}`, 15, blockY + 20);

    // Right Box: Key Weight Readouts Card
    doc.setFillColor(244, 247, 246);
    doc.rect(rightX - 5, blockY - 2, 75, 28, 'F');
    doc.setDrawColor(200, 215, 208);
    doc.rect(rightX - 5, blockY - 2, 75, 28, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textColorMuted[0], textColorMuted[1], textColorMuted[2]);
    doc.text('ACTUAL WEIGHT:', rightX, blockY + 3);
    doc.setFontSize(9);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(`${calculation.actualWeight} KG`, rightX + 38, blockY + 3);

    doc.setFontSize(8);
    doc.setTextColor(textColorMuted[0], textColorMuted[1], textColorMuted[2]);
    doc.text('VOLUMETRIC WEIGHT:', rightX, blockY + 9);
    doc.setFontSize(9);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text(`${calculation.volumetricWeight} KG`, rightX + 38, blockY + 9);

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(rightX - 5, blockY + 14, 75, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('FINAL CHARGEABLE WEIGHT:', rightX - 2, blockY + 21);
    doc.setFontSize(10);
    doc.text(`${calculation.chargeableWeight} KG`, rightX + 48, blockY + 21);

    // 6. Packages Breakdown Table
    const tableStartY = blockY + 34;
    doc.setFillColor(244, 247, 246);
    doc.rect(15, tableStartY, 180, 8, 'F');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('#', 18, tableStartY + 5.5);
    doc.text(`Dimensions (${calculation.unit || 'CM'})`, 28, tableStartY + 5.5);
    doc.text('Act Wt (KG)', 80, tableStartY + 5.5);
    doc.text('Vol Wt (KG)', 110, tableStartY + 5.5);
    doc.text('Qty', 140, tableStartY + 5.5);
    doc.text('Total Chargeable (KG)', 155, tableStartY + 5.5);

    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const packages = Array.isArray(calculation.packages) ? calculation.packages : [];
    let startY = tableStartY + 8;

    packages.forEach((pkg: any, idx: number) => {
      if (startY > 255) {
        doc.addPage();
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(15, 10, 180, 1.5, 'F');
        startY = 20;

        doc.setFillColor(244, 247, 246);
        doc.rect(15, startY, 180, 8, 'F');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('#', 18, startY + 5.5);
        doc.text(`Dimensions (${calculation.unit || 'CM'})`, 28, startY + 5.5);
        doc.text('Act Wt (KG)', 80, startY + 5.5);
        doc.text('Vol Wt (KG)', 110, startY + 5.5);
        doc.text('Qty', 140, startY + 5.5);
        doc.text('Total Chargeable (KG)', 155, startY + 5.5);

        doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
        doc.setFont('helvetica', 'normal');
        startY += 8;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 250);
        doc.rect(15, startY, 180, 8, 'F');
      }

      const dimStr = `${pkg.length ?? 0} x ${pkg.width ?? 0} x ${pkg.height ?? 0}`;
      const volPerUnit = pkg.volumetricWeightPerUnit ?? (pkg.volumetricWeight ? (pkg.volumetricWeight / (pkg.quantity || 1)).toFixed(2) : 0);
      const totalCharge = pkg.totalChargeableWeight ?? Math.max(pkg.actualWeight || 0, pkg.volumetricWeight || 0).toFixed(2);

      doc.text((idx + 1).toString(), 18, startY + 5.5);
      doc.text(dimStr, 28, startY + 5.5);
      doc.text(`${pkg.actualWeight ?? 0} kg`, 80, startY + 5.5);
      doc.text(`${volPerUnit} kg`, 110, startY + 5.5);
      doc.text(String(pkg.quantity ?? 1), 140, startY + 5.5);
      doc.text(`${totalCharge} kg`, 155, startY + 5.5);

      startY += 8;
    });

    // 7. Footer Pinned at Bottom (No Payment Info)
    const footerY = 265;
    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.3);
    doc.line(15, footerY, 195, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textColorMuted[0], textColorMuted[1], textColorMuted[2]);
    doc.text(`Official volumetric weight evaluation report issued by ${companyName}.`, 15, footerY + 5);
    doc.text('This document contains cargo evaluation statistics calculated via standard logistics parameters.', 15, footerY + 8.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textColorDark[0], textColorDark[1], textColorDark[2]);
    doc.text('Issued By:', 140, footerY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(userProfile?.name || companyName, 140, footerY + 9);

    const filename = `Weight_Calculation_${calculation.id ? calculation.id.substring(0, 8) : Date.now()}.pdf`;
    doc.save(filename);
    return { doc, blob: doc.output('blob'), filename };
  } catch (error) {
    console.error('Error generating weight calculation PDF:', error);
    return null;
  }
}

export async function exportSalarySlipPDF(
  salaryRecord: any,
  employee: any,
  organization: any,
  monthName: string,
  year: number
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const primaryColor = [15, 76, 58]; // #0F4C3A
  const textDark = [28, 46, 36];
  const textMuted = [100, 116, 139];

  // Header Box
  doc.setFillColor(244, 247, 246);
  doc.rect(0, 0, 210, 38, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text((organization?.name || employee?.company || 'GEO TRANSIT ORGANIZATION').toUpperCase(), 15, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('EMPLOYEE SALARY SLIP', 15, 26);

  // Title Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`PERIOD: ${monthName.toUpperCase()} ${year}`, 135, 18);

  // Employee Details Card
  let curY = 48;
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, curY, 180, 36);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('EMPLOYEE NAME:', 20, curY + 9);
  doc.text('EMPLOYEE ID:', 20, curY + 18);
  doc.text('DESIGNATION:', 20, curY + 27);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(employee.name || 'N/A', 55, curY + 9);
  doc.text(employee.employeeId || 'N/A', 55, curY + 18);
  doc.text(employee.designation || 'Employee', 55, curY + 27);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('DEPARTMENT:', 110, curY + 9);
  doc.text('MOBILE:', 110, curY + 18);
  doc.text('PAYMENT STATUS:', 110, curY + 27);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(employee.department || 'General', 145, curY + 9);
  doc.text(employee.mobile || 'N/A', 145, curY + 18);
  doc.text(salaryRecord.paymentStatus || 'UNPAID', 145, curY + 27);

  // Salary Table Breakdown
  curY = 94;
  doc.setFillColor(244, 247, 246);
  doc.rect(15, curY, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('EARNINGS & ALLOWANCES', 20, curY + 5.5);
  doc.text('AMOUNT (INR)', 155, curY + 5.5);

  curY += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  doc.text('Basic Salary', 20, curY);
  doc.text(`INR ${(salaryRecord.basicSalary || 0).toFixed(2)}`, 155, curY);

  curY += 8;
  doc.text('Allowances', 20, curY);
  doc.text(`INR ${(salaryRecord.allowances || 0).toFixed(2)}`, 155, curY);

  curY += 8;
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);
  doc.line(15, curY, 195, curY);

  curY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('GROSS SALARY', 20, curY);
  doc.text(`INR ${(salaryRecord.grossSalary || 0).toFixed(2)}`, 155, curY);

  curY += 12;
  doc.setFillColor(254, 242, 242);
  doc.rect(15, curY, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(185, 28, 28);
  doc.text('DEDUCTIONS', 20, curY + 5.5);
  doc.text('AMOUNT (INR)', 155, curY + 5.5);

  curY += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Deductions', 20, curY);
  doc.text(`INR ${(salaryRecord.deductions || 0).toFixed(2)}`, 155, curY);

  // Net Salary Box
  curY += 16;
  doc.setFillColor(15, 76, 58);
  doc.rect(15, curY, 180, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('NET SALARY PAYABLE:', 20, curY + 9);
  doc.text(`INR ${(salaryRecord.netSalary || 0).toFixed(2)}`, 145, curY + 9);

  // Footer Note
  curY += 30;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('This is a computer-generated salary slip and does not require a physical signature.', 15, curY);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 15, curY + 5);

  const filename = `SalarySlip_${employee.employeeId || 'Emp'}_${monthName}_${year}.pdf`;
  doc.save(filename);
}

export interface CashLedgerExportOptions {
  entries: any[];
  columns: any[];
  summary: {
    initialCashInHand?: number;
    totalCashReceived: number;
    totalPaidAmount: number;
    totalBankDeposit: number;
    currentCashInHand: number;
    entryCount?: number;
  };
  organizationName?: string;
  filterDescription?: string;
}

export async function exportCashLedgerToPDF(options: CashLedgerExportOptions) {
  if (typeof window === 'undefined') return;

  try {
    const { jsPDF } = await import('jspdf');
    // Use Landscape A4 for wide multi-column ledger view
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = 297;
    const pageHeight = 210;

    const primaryColor = [15, 76, 58]; // #0F4C3A
    const textDark = [28, 46, 36];
    const textMuted = [100, 116, 139];

    // 1. Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Organization & Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text((options.organizationName || 'GEO TRANSIT ORGANIZATION').toUpperCase(), 14, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 230, 220);
    doc.text('COUNTER CASH LEDGER — DAILY OFFICE CASH REGISTER', 14, 20);

    // Meta Right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`PERIOD: ${(options.filterDescription || 'ALL TRANSACTIONS').toUpperCase()}`, pageWidth - 14, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 230, 220);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 14, 20, { align: 'right' });

    // 2. Summary KPI Cards
    let curY = 33;
    const cardW = (pageWidth - 28 - 9) / 4;
    const cardH = 14;

    const kpis = [
      { label: 'TOTAL CASH RECEIVED', val: `INR ${options.summary.totalCashReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [16, 185, 129] },
      { label: 'TOTAL PAID AMOUNT', val: `INR ${options.summary.totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [239, 68, 68] },
      { label: 'TOTAL BANK DEPOSIT', val: `INR ${options.summary.totalBankDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [59, 130, 246] },
      { label: 'CURRENT CASH IN HAND', val: `INR ${options.summary.currentCashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [15, 76, 58] },
    ];

    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * (cardW + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, curY, cardW, cardH, 2, 2, 'FD');

      // Accent border bar
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(x, curY, 2.5, cardH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(kpi.label, x + 5, curY + 5);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(kpi.val, x + 5, curY + 11);
    });

    curY += cardH + 6;

    // 3. Table Column Setup
    const activeCols = (options.columns || []).filter((c: any) => c.enabled !== false);
    const visibleCols = activeCols.length > 0 ? activeCols : [
      { key: 'date', name: 'Date', width: 22 },
      { key: 'cashReceived', name: 'Cash Received', width: 28 },
      { key: 'receivedFrom', name: 'Received From', width: 34 },
      { key: 'purpose', name: 'Purpose', width: 42 },
      { key: 'paidTo', name: 'Paid To', width: 34 },
      { key: 'paidAmount', name: 'Paid Amount', width: 28 },
      { key: 'bankDeposit', name: 'Bank Deposit', width: 28 },
      { key: 'cashInHand', name: 'Cash in Hand', width: 28 },
      { key: 'remarks', name: 'Remarks', width: 25 },
    ];

    const totalTableWidth = pageWidth - 28;
    const colWidth = Math.floor(totalTableWidth / visibleCols.length);

    // Header Row
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, curY, totalTableWidth, 8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    visibleCols.forEach((col: any, idx: number) => {
      const x = 14 + idx * colWidth;
      const title = (col.name || col.key || '').toUpperCase();
      doc.text(title.length > 18 ? title.slice(0, 16) + '..' : title, x + 2, curY + 5.5);
    });

    curY += 8;

    // 4. Data Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    if (options.entries.length === 0) {
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('No ledger entries recorded for the selected period.', 14, curY + 8);
    } else {
      options.entries.forEach((row: any, rowIdx: number) => {
        // Page overflow check
        if (curY > pageHeight - 20) {
          doc.addPage();
          curY = 16;
          // Re-draw table header
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.rect(14, curY, totalTableWidth, 8, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          visibleCols.forEach((col: any, idx: number) => {
            const x = 14 + idx * colWidth;
            doc.text((col.name || '').toUpperCase(), x + 2, curY + 5.5);
          });
          curY += 8;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
        }

        // Alternating row background
        if (rowIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, curY, totalTableWidth, 7, 'F');
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(14, curY + 7, 14 + totalTableWidth, curY + 7);

        visibleCols.forEach((col: any, cIdx: number) => {
          const x = 14 + cIdx * colWidth;
          let cellVal = '';

          if (col.key === 'date') {
            cellVal = row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-';
          } else if (['cashReceived', 'paidAmount', 'bankDeposit', 'cashInHand'].includes(col.key)) {
            const num = Number(row[col.key]) || 0;
            cellVal = num > 0 || col.key === 'cashInHand' ? num.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-';
          } else if (row[col.key] !== undefined && row[col.key] !== null) {
            cellVal = String(row[col.key]);
          } else if (row.customFields && row.customFields[col.key] !== undefined) {
            cellVal = String(row.customFields[col.key]);
          }

          if (cellVal.length > 20) cellVal = cellVal.slice(0, 18) + '..';

          // Financial numbers styled bolder
          if (['cashReceived', 'paidAmount', 'bankDeposit', 'cashInHand'].includes(col.key)) {
            doc.setFont('helvetica', 'bold');
            if (col.key === 'cashReceived' && Number(row[col.key]) > 0) {
              doc.setTextColor(16, 185, 129);
            } else if (col.key === 'paidAmount' && Number(row[col.key]) > 0) {
              doc.setTextColor(220, 38, 38);
            } else if (col.key === 'bankDeposit' && Number(row[col.key]) > 0) {
              doc.setTextColor(37, 99, 235);
            } else {
              doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            }
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
          }

          doc.text(cellVal, x + 2, curY + 4.8);
        });

        curY += 7;
      });
    }

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Confidential Document • Generated by GEO TRANSIT Counter Cash Ledger System', 14, pageHeight - 8);
    doc.text(`Page 1`, pageWidth - 14, pageHeight - 8, { align: 'right' });

    const safeOrg = (options.organizationName || 'Org').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`CashLedger_${safeOrg}_${Date.now()}.pdf`);
  } catch (err) {
    console.error('Error generating Cash Ledger PDF:', err);
  }
}

export function exportCashLedgerToCSV(options: CashLedgerExportOptions) {
  if (typeof window === 'undefined') return;

  const activeCols = (options.columns || []).filter((c: any) => c.enabled !== false);
  const headers = activeCols.map((c: any) => `"${(c.name || c.key).replace(/"/g, '""')}"`);

  const rows = options.entries.map((entry) => {
    return activeCols.map((col: any) => {
      let val = '';
      if (col.key === 'date') {
        val = entry.date ? new Date(entry.date).toLocaleDateString('en-IN') : '';
      } else if (entry[col.key] !== undefined && entry[col.key] !== null) {
        val = String(entry[col.key]);
      } else if (entry.customFields && entry.customFields[col.key] !== undefined) {
        val = String(entry.customFields[col.key]);
      }
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  // Summary lines at bottom
  const summaryRows = [
    '',
    `"SUMMARY TOTALS"`,
    `"Total Cash Received","${options.summary.totalCashReceived}"`,
    `"Total Paid Amount","${options.summary.totalPaidAmount}"`,
    `"Total Bank Deposit","${options.summary.totalBankDeposit}"`,
    `"Closing Cash in Hand","${options.summary.currentCashInHand}"`,
  ];

  const csvContent = [headers.join(','), ...rows, ...summaryRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `CashLedger_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
