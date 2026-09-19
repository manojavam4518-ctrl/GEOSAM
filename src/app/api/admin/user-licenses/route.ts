import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const status = searchParams.get('status') || '';

    const now = new Date();

    // Auto-expire purchases past expiryDate
    await (prisma as any).userLicensePurchase.updateMany({
      where: {
        status: 'ACTIVE',
        expiryDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Auto-expire individual user licenses past expiryDate
    await (prisma as any).userLicense.updateMany({
      where: {
        status: 'ACTIVE',
        expiryDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const purchaseWhere: any = {};
    if (paymentStatus) {
      purchaseWhere.paymentStatus = paymentStatus;
    }
    if (status) {
      purchaseWhere.status = status;
    }
    if (search) {
      purchaseWhere.OR = [
        { utr: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const purchases = await (prisma as any).userLicensePurchase.findMany({
      where: purchaseWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    const allPurchases = await (prisma as any).userLicensePurchase.findMany({
      select: { paymentStatus: true, status: true, totalAmount: true, usersCount: true },
    });

    const summary = {
      totalPurchases: allPurchases.length,
      pending: allPurchases.filter((p: any) => p.paymentStatus === 'PENDING').length,
      approved: allPurchases.filter((p: any) => p.paymentStatus === 'APPROVED').length,
      rejected: allPurchases.filter((p: any) => p.paymentStatus === 'REJECTED').length,
      activePurchases: allPurchases.filter((p: any) => p.status === 'ACTIVE').length,
      totalSlotsPurchased: allPurchases
        .filter((p: any) => p.paymentStatus === 'APPROVED')
        .reduce((sum: number, p: any) => sum + (p.usersCount || 0), 0),
      totalRevenue: allPurchases
        .filter((p: any) => p.paymentStatus === 'APPROVED')
        .reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      purchases,
      summary,
    });
  } catch (error: any) {
    console.error('Admin User License Purchases GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
