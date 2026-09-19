import { prisma } from '@/lib/prisma';

export async function syncSalesFollowUpFromQuotation(quotation: any) {
  try {
    if (!quotation || !quotation.userId) return null;

    const quotationId = quotation.id;
    const quotationNumber = quotation.quotationNumber;

    // Check if follow-up record already exists for this quotation
    const existing = await prisma.salesFollowUp.findFirst({
      where: {
        userId: quotation.userId,
        OR: [
          { quotationId: quotationId },
          { quotationNumber: quotationNumber },
        ],
      },
    });

    const companyName = quotation.customerCompany || quotation.customerName || 'N/A';
    const contactPerson = quotation.customerName || 'N/A';
    const phone = quotation.customerPhone || 'N/A';
    const email = quotation.customerEmail || null;
    const rate = quotation.totalAmount || 0;

    // Extract city/region info if available
    let businessArea = quotation.customerAddress || '';
    if (!businessArea) {
      if (quotation.rateSnapshot && typeof quotation.rateSnapshot === 'object') {
        const snap = quotation.rateSnapshot as any;
        businessArea = snap.destInfo?.city || snap.destination || snap.detectedRegion || '';
      }
    }

    let courierCompany = quotation.rateCardName || '';
    let serviceName = quotation.rateCardName || '';
    if (quotation.rateSnapshot && typeof quotation.rateSnapshot === 'object') {
      const snap = quotation.rateSnapshot as any;
      if (snap.courier) courierCompany = snap.courier;
      if (snap.service) serviceName = snap.service;
    }

    let volWeight = 0;
    if (quotation.rateSnapshot && typeof quotation.rateSnapshot === 'object') {
      const snap = quotation.rateSnapshot as any;
      if (snap.volumetricWeight) volWeight = parseFloat(snap.volumetricWeight);
    }

    if (existing) {
      // Sync only quotation-derived fields without overwriting user-edited status/source/remarks
      const updated = await prisma.salesFollowUp.update({
        where: { id: existing.id },
        data: {
          companyName: existing.companyName || companyName,
          contactPerson: existing.contactPerson || contactPerson,
          phone: existing.phone || phone,
          email: existing.email || email,
          courierCompany,
          serviceName,
          serviceType: quotation.serviceType || existing.serviceType,
          originPincode: quotation.originPincode || existing.originPincode,
          destinationPincode: quotation.destinationPincode || existing.destinationPincode,
          actualWeight: quotation.weight || existing.actualWeight,
          volumetricWeight: volWeight || existing.volumetricWeight,
          chargeableWeight: quotation.chargeableWeight || existing.chargeableWeight,
          calculatedRate: rate || existing.calculatedRate,
          pricingModel: quotation.pricingMode || existing.pricingModel,
        },
      });

      return updated;
    }

    // Create new SalesFollowUp record
    const newFollowUp = await prisma.salesFollowUp.create({
      data: {
        userId: quotation.userId,
        quotationId,
        quotationNumber,
        date: quotation.createdAt ? new Date(quotation.createdAt) : new Date(),
        companyName,
        contactPerson,
        phone,
        email,
        salesLeadSource: null, // Default blank
        furtherAction: 'QTN SENT & FOLLOWUP PENDING',
        remarks: `Quotation ${quotationNumber} generated. Follow-up pending.`,
        businessArea: businessArea || 'N/A',
        courierCompany,
        serviceName,
        serviceType: quotation.serviceType || 'Domestic',
        shippingMode: quotation.pricingMode || 'Express',
        originPincode: quotation.originPincode,
        destinationPincode: quotation.destinationPincode,
        actualWeight: quotation.weight,
        volumetricWeight: volWeight || quotation.chargeableWeight || quotation.weight,
        chargeableWeight: quotation.chargeableWeight || quotation.weight,
        calculatedRate: rate,
        pricingModel: quotation.pricingMode || 'SLAB',
        isManualEntry: false,
      },
    });

    // Create history entry
    await prisma.salesFollowUpHistory.create({
      data: {
        followUpId: newFollowUp.id,
        action: `Quotation ${quotationNumber} generated. Status set to QTN SENT & FOLLOWUP PENDING`,
        previousState: null,
        newState: 'QTN SENT & FOLLOWUP PENDING',
        timestamp: new Date(),
      },
    });

    return newFollowUp;
  } catch (error) {
    console.error('Error syncing Sales Follow-up from quotation:', error);
    return null;
  }
}
