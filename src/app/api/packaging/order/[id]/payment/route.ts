import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

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
    const { paymentMethod, utr, screenshotUrl } = await req.json();

    if (!paymentMethod || !utr) {
      return NextResponse.json({ error: 'Payment method and UTR reference are required.' }, { status: 400 });
    }

    // Fetch order
    const order = await prisma.packagingOrder.findUnique({
      where: { id },
    });

    if (!order || order.userId !== session.userId) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'This order is not pending payment.' }, { status: 400 });
    }

    // Check if UTR already submitted
    const existingPayment = await prisma.packagingPayment.findFirst({
      where: { utr, status: { in: ['PENDING', 'PAID'] } },
    });

    if (existingPayment) {
      return NextResponse.json({ error: 'This transaction UTR number has already been submitted.' }, { status: 400 });
    }

    // Create payment record
    const payment = await prisma.packagingPayment.create({
      data: {
        orderId: order.id,
        userId: session.userId,
        amount: order.totalAmount,
        paymentMethod,
        utr,
        screenshotUrl,
        status: 'PENDING',
      },
    });

    // If this order belongs to a custom requirement, we also update the requirement status to PAYMENT_PENDING
    if (order.requirementId) {
      await prisma.customPackagingRequirement.update({
        where: { id: order.requirementId },
        data: { status: 'PAYMENT_PENDING' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment reference submitted successfully. Admin verification pending.',
      payment,
    });
  } catch (error: any) {
    console.error('Order payment submit error:', error);
    return NextResponse.json({ error: 'Failed to submit payment details.' }, { status: 500 });
  }
}
