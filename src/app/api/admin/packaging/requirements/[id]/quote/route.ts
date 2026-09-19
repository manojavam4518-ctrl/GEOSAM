import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email';
import { formatDateIndian } from '@/utils/dateUtils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      unitPrice,
      quantity,
      subtotal,
      shippingCharge,
      taxAmount,
      discountAmount,
      finalAmount,
      validityDays,
      adminNotes,
    } = body;

    if (unitPrice === undefined || quantity === undefined || finalAmount === undefined) {
      return NextResponse.json({ error: 'Unit price, quantity, and final amount are required.' }, { status: 400 });
    }

    const requirement = await prisma.customPackagingRequirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      return NextResponse.json({ error: 'Custom requirement not found.' }, { status: 404 });
    }

    const days = parseInt(validityDays) || 30;
    const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const quotationNumber = `QTN-PKG-${Math.floor(100000 + Math.random() * 900000)}`;

    const quotation = await prisma.$transaction(async (tx) => {
      // 1. Create quotation
      const newQuote = await tx.packagingQuotation.create({
        data: {
          requirementId: id,
          userId: requirement.userId,
          quotationNumber,
          unitPrice: parseFloat(unitPrice),
          quantity: parseInt(quantity),
          subtotal: parseFloat(subtotal || (unitPrice * quantity).toFixed(2)),
          shippingCharge: parseFloat(shippingCharge || 0),
          taxAmount: parseFloat(taxAmount || 0),
          discountAmount: parseFloat(discountAmount || 0),
          finalAmount: parseFloat(finalAmount),
          validityDays: days,
          validUntil,
          adminNotes: adminNotes || null,
          status: 'SENT',
        },
      });

      // 2. Update requirement status
      await tx.customPackagingRequirement.update({
        where: { id },
        data: {
          status: 'APPROVED_QUOTED',
          adminNotes: adminNotes
            ? requirement.adminNotes
              ? `${requirement.adminNotes}\n[${formatDateIndian(new Date())}] Quote sent: ${adminNotes}`
              : `Quote sent: ${adminNotes}`
            : requirement.adminNotes,
        },
      });

      return newQuote;
    });

    // Send email notification to client
    try {
      await sendEmail({
        to: requirement.email,
        templateName: 'PACKAGING_QUOTATION_CREATED',
        variables: {
          name: requirement.customerName,
          quotationNumber: quotation.quotationNumber,
          finalAmount: quotation.finalAmount.toFixed(2),
          validUntil: formatDateIndian(validUntil),
        },
      });
    } catch (emailErr) {
      console.error('Quotation created email notify error:', emailErr);
    }

    return NextResponse.json({ success: true, quotation });
  } catch (error: any) {
    console.error('Admin create quotation error:', error);
    return NextResponse.json({ error: 'Failed to generate quotation.' }, { status: 500 });
  }
}
