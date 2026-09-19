import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { paymentId, reason } = await req.json();
    if (!paymentId || !reason) {
      return NextResponse.json({ error: 'Payment ID and rejection reason are required.' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'This payment has already been processed.' }, { status: 400 });
    }

    // 1. Mark payment as REJECTED
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REJECTED' },
    });

    // 2. Trigger Email Notification
    await sendEmail({
      to: payment.user.email,
      templateName: 'PAYMENT_REJECTED',
      variables: {
        name: payment.user.name,
        planName: payment.planName,
        utr: payment.utr,
        reason,
      },
    });

    // 3. Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: 'Rejected Subscription Payment',
        relatedRecordId: payment.id,
        metadata: {
          userId: payment.userId,
          planName: payment.planName,
          utr: payment.utr,
          reason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment rejected successfully. User notified.',
      payment: updatedPayment,
    });
  } catch (error: any) {
    console.error('Reject Payment Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
