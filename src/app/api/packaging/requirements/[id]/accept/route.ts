import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const verified = await verifyToken(token);
  if (!verified) return null;
  return verifyDeviceSession(verified.sessionToken);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Fetch requirement and the latest active quotation
    const requirement = await prisma.customPackagingRequirement.findUnique({
      where: { id },
      include: {
        quotations: {
          where: { status: 'SENT' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!requirement || requirement.userId !== session.userId) {
      return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
    }

    const quotation = requirement.quotations[0];
    if (!quotation) {
      return NextResponse.json({ error: 'No active quotation found for this requirement.' }, { status: 400 });
    }

    if (new Date() > new Date(quotation.validUntil)) {
      return NextResponse.json({ error: 'Quotation has expired.' }, { status: 400 });
    }

    // Find or create the placeholder Custom Packaging Material product
    let customProduct = await prisma.packagingProduct.findFirst({
      where: { name: 'Custom Packaging Material' },
    });

    if (!customProduct) {
      customProduct = await prisma.packagingProduct.create({
        data: {
          name: 'Custom Packaging Material',
          description: 'Custom packaging material custom-made to customer specifications.',
          category: 'Custom',
          price: 0,
          unit: 'piece',
          minQuantity: 1,
          stock: 99999,
          active: false, // Don't show in shop catalog
        },
      });
    }

    // 2. Process acceptance inside a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Update quotation status
      await tx.packagingQuotation.update({
        where: { id: quotation.id },
        data: { status: 'ACCEPTED' },
      });

      // Update requirement status
      await tx.customPackagingRequirement.update({
        where: { id: requirement.id },
        data: { status: 'CUSTOMER_ACCEPTED' },
      });

      // Generate Order Number
      const orderNumber = `ORD-PKG-${Math.floor(100000 + Math.random() * 900000)}`;

      // Create Order in PENDING_PAYMENT status
      const newOrder = await tx.packagingOrder.create({
        data: {
          userId: session.userId,
          orderNumber,
          status: 'PENDING_PAYMENT',
          baseAmount: quotation.subtotal,
          gstAmount: quotation.taxAmount,
          shippingAmount: quotation.shippingCharge,
          totalAmount: quotation.finalAmount,
          billingDetails: {
            fullName: requirement.customerName,
            email: requirement.email,
            phone: requirement.phone,
            companyName: requirement.companyName,
            address: requirement.deliveryLocation,
            city: 'Custom Route',
            state: 'Custom State',
            country: 'India',
            pincode: '000000',
          },
          requirementId: requirement.id,
        },
      });

      // Create Order Item
      await tx.packagingOrderItem.create({
        data: {
          orderId: newOrder.id,
          productId: customProduct.id,
          productName: requirement.productMaterial,
          variantInfo: requirement.requiredDimension || 'Custom Dimension',
          price: quotation.unitPrice,
          quantity: quotation.quantity,
          totalAmount: quotation.finalAmount,
        },
      });

      return newOrder;
    });

    // Send email notifications
    try {
      await sendEmail({
        to: requirement.email,
        templateName: 'PACKAGING_QUOTATION_ACCEPTED',
        variables: {
          name: requirement.customerName,
          quotationNumber: quotation.quotationNumber,
          finalAmount: quotation.finalAmount.toFixed(2),
        },
      });
    } catch (emailErr) {
      console.error('Email notify failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Quotation accepted. Proceed to checkout.',
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('Accept quotation error:', error);
    return NextResponse.json({ error: 'Failed to accept quotation.' }, { status: 500 });
  }
}
