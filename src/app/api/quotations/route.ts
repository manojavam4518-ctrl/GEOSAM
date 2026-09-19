import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { verifyModuleAccess } from '@/lib/modulePermissions';

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;

  const verified = await verifyToken(token);
  if (!verified) return null;

  const session = await verifyDeviceSession(verified.sessionToken);
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'QUOTATIONS');
    if (!access.authorized) {
      return access.response!;
    }

    const user = access.user;

    let quotations;
    if (user.role === 'ADMIN') {
      quotations = await prisma.quotation.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } else if (access.organizationId) {
      const orgUsers = await prisma.user.findMany({
        where: { organizationId: access.organizationId },
        select: { id: true },
      });
      const userIds = orgUsers.map((u) => u.id);
      quotations = await prisma.quotation.findMany({
        where: {
          userId: { in: userIds },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      quotations = await prisma.quotation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ success: true, quotations });
  } catch (error: any) {
    console.error('Quotations GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'QUOTATIONS');
    if (!access.authorized) {
      return access.response!;
    }

    const user = access.user;

    const {
      customerName,
      customerCompany,
      customerEmail,
      customerPhone,
      customerAddress,
      originPincode,
      destinationPincode,
      weight,
      serviceType,
      rateCardName,
      pricingMode,
      chargeableWeight,
      baseRate,
      additionalCharges,
      cargoRate,
      gstAmount,
      totalAmount,
      validityDays,
      rateSnapshot,
      templateSnapshot,
    } = await req.json();

    if (!customerName || !originPincode || !destinationPincode || !weight || !rateCardName || !pricingMode || totalAmount === undefined) {
      return NextResponse.json({ error: 'Required fields are missing.' }, { status: 400 });
    }

    // Generate unique Quotation Number (QT-YYYY-XXXXXX)
    const count = await prisma.quotation.count();
    const sequence = String(count + 1).padStart(6, '0');
    const year = new Date().getFullYear();
    const quotationNumber = `QT-${year}-${sequence}`;

    const days = parseInt(validityDays) || 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + days);

    const quotation = await prisma.quotation.create({
      data: {
        userId: user.id,
        quotationNumber,
        customerName,
        customerCompany: customerCompany || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        originPincode,
        destinationPincode,
        weight: parseFloat(weight),
        serviceType,
        rateCardName,
        pricingMode,
        chargeableWeight: parseFloat(chargeableWeight) || parseFloat(weight),
        baseRate: parseFloat(baseRate) || 0.0,
        additionalCharges: parseFloat(additionalCharges) || 0.0,
        cargoRate: cargoRate !== undefined && cargoRate !== null ? parseFloat(cargoRate) : null,
        gstAmount: parseFloat(gstAmount) || 0.0,
        totalAmount: parseFloat(totalAmount),
        validUntil,
        rateSnapshot: rateSnapshot || {},
        templateSnapshot: templateSnapshot || {},
        status: 'ACTIVE',
      },
    });

    // Automatically sync into Sales Follow-Up Module
    const { syncSalesFollowUpFromQuotation } = await import('@/lib/salesFollowUpHelper');
    await syncSalesFollowUpFromQuotation(quotation);

    return NextResponse.json({
      success: true,
      message: 'Quotation generated successfully.',
      quotation,
    });
  } catch (error: any) {
    console.error('Quotations POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
