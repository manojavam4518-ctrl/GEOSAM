import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';
    const search = searchParams.get('search') || '';

    const whereClause: any = {};

    if (status !== 'ALL') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { utr: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const payments = await prisma.packagingPayment.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            billingDetails: true,
            createdAt: true,
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error: any) {
    console.error('Packaging payments GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { paymentId, action, reason } = await req.json();

    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Payment ID and action are required.' }, { status: 400 });
    }

    const payment = await prisma.packagingPayment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    if (action === 'approve') {
      await prisma.$transaction([
        prisma.packagingPayment.update({
          where: { id: paymentId },
          data: { status: 'PAID', adminNotes: 'Approved by administrator' },
        }),
        prisma.packagingOrder.update({
          where: { id: payment.orderId },
          data: { status: 'PAID' },
        }),
        prisma.auditLog.create({
          data: {
            adminId: adminSession.userId,
            adminEmail: adminSession.user.email,
            action: `Approved Shopping Payment for Order #${payment.order.orderNumber}`,
            metadata: { paymentId, orderId: payment.orderId, utr: payment.utr, amount: payment.amount },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Shopping payment for Order #${payment.order.orderNumber} approved successfully. Order status updated to PAID.`,
      });
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.packagingPayment.update({
          where: { id: paymentId },
          data: { status: 'FAILED', adminNotes: reason },
        }),
        prisma.packagingOrder.update({
          where: { id: payment.orderId },
          data: { status: 'PENDING_PAYMENT' },
        }),
        prisma.auditLog.create({
          data: {
            adminId: adminSession.userId,
            adminEmail: adminSession.user.email,
            action: `Rejected Shopping Payment for Order #${payment.order.orderNumber}`,
            metadata: { paymentId, orderId: payment.orderId, reason },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Shopping payment rejected. Order #${payment.order.orderNumber} status set to PENDING_PAYMENT.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Packaging payments PUT error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
