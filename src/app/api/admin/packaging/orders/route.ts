import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const orders = await prisma.packagingOrder.findMany({
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Admin Orders GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, paymentId, action, reason, status } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const order = await prisma.packagingOrder.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const customer = await prisma.user.findUnique({
      where: { id: order.userId },
    });

    if (action === 'approve_payment') {
      if (!paymentId) {
        return NextResponse.json({ error: 'Payment ID is required for approval.' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Approve payment
        await tx.packagingPayment.update({
          where: { id: paymentId },
          data: { status: 'PAID' },
        });

        // Set order to PAID
        await tx.packagingOrder.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        });

        // If custom requirement, update status
        if (order.requirementId) {
          await tx.customPackagingRequirement.update({
            where: { id: order.requirementId },
            data: { status: 'PAID' },
          });
        }
      });

      // Send email
      if (customer) {
        try {
          await sendEmail({
            to: customer.email,
            templateName: 'PACKAGING_ORDER_CONFIRMED',
            variables: {
              name: customer.name,
              orderNumber: order.orderNumber,
              amount: order.totalAmount.toFixed(2),
            },
          });
        } catch (emailErr) {
          console.error('Order confirmed email notify failed:', emailErr);
        }
      }

      return NextResponse.json({ success: true, message: 'Payment approved. Order marked as paid.' });
    } else if (action === 'reject_payment') {
      if (!paymentId) {
        return NextResponse.json({ error: 'Payment ID is required for rejection.' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Reject payment
        await tx.packagingPayment.update({
          where: { id: paymentId },
          data: {
            status: 'FAILED',
            adminNotes: reason || 'Transaction verification failed.',
          },
        });

        // Keep order in PENDING_PAYMENT
        await tx.packagingOrder.update({
          where: { id: orderId },
          data: { status: 'PENDING_PAYMENT' },
        });
      });

      return NextResponse.json({ success: true, message: 'Payment rejected.' });
    } else if (action === 'update_status') {
      if (!status) {
        return NextResponse.json({ error: 'New shipping status is required.' }, { status: 400 });
      }

      const validStatuses = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.packagingOrder.update({
          where: { id: orderId },
          data: { status },
        });

        // Sync with custom requirements if applicable
        if (order.requirementId) {
          let reqStatus = 'PAID';
          if (status === 'DELIVERED') reqStatus = 'ORDER_CONFIRMED';
          else if (status === 'CANCELLED') reqStatus = 'CANCELLED';

          await tx.customPackagingRequirement.update({
            where: { id: order.requirementId },
            data: { status: reqStatus },
          });
        }
      });

      return NextResponse.json({ success: true, message: `Order status updated to ${status}.` });
    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Admin order update error:', error);
    return NextResponse.json({ error: 'Failed to update order details.' }, { status: 500 });
  }
}
