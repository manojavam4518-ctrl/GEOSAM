import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    // 1. Session Verification
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    // 2. Parse payload
    const {
      planId,
      duration,
      billingDetails,
      invoiceRequired,
      paymentMethod,
      utr,
      screenshotUrl,
    } = await req.json();

    if (!planId || !duration || !billingDetails || !paymentMethod || !utr) {
      return NextResponse.json({ error: 'Missing required checkout information.' }, { status: 400 });
    }

    // Validate billing details
    const { fullName, email, phone, companyName, address, city, state, country, pincode } = billingDetails;
    if (!fullName || !email || !phone || !companyName || !address || !city || !state || !country || !pincode) {
      return NextResponse.json({ error: 'All billing details are required.' }, { status: 400 });
    }

    const parsedDuration = parseInt(duration);
    if (![3, 6, 12].includes(parsedDuration)) {
      return NextResponse.json({ error: 'Invalid subscription duration.' }, { status: 400 });
    }

    // 3. Look up plan in DB to compute verified pricing (Never trust frontend amount!)
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.active) {
      return NextResponse.json({ error: 'Invalid plan choice.' }, { status: 400 });
    }

    let basePrice = 0;
    if (parsedDuration === 3) {
      basePrice = plan.price3Months;
    } else if (parsedDuration === 6) {
      basePrice = plan.price6Months;
    } else if (parsedDuration === 12) {
      basePrice = plan.price12Months;
    }

    // Tax lookup
    const paymentSettings = await prisma.paymentSettings.findFirst();
    const gstRate = paymentSettings?.gstRate ?? 18.0;
    const gstEnabled = paymentSettings?.gstEnabled ?? true;

    const gstAmount = gstEnabled ? basePrice * (gstRate / 100) : 0;
    const totalAmount = basePrice + gstAmount;

    // Check if UTR already exists in pending/approved payments to prevent duplicate submissions
    const existingPayment = await prisma.payment.findFirst({
      where: { utr, status: { in: ['PENDING', 'APPROVED'] } },
    });

    if (existingPayment) {
      return NextResponse.json({ error: 'This Transaction/UTR number has already been submitted.' }, { status: 400 });
    }

    // 4. Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        userId: session.userId,
        planId: plan.id,
        planName: plan.name,
        deviceLimit: plan.deviceLimit,
        duration: parsedDuration,
        baseAmount: parseFloat(basePrice.toFixed(2)),
        gstAmount: parseFloat(gstAmount.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        billingDetails,
        invoiceRequired: !!invoiceRequired,
        paymentMethod,
        utr,
        screenshotUrl,
        status: 'PENDING',
      },
    });

    // 5. Send Payment Submitted Notification Email
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user) {
      await sendEmail({
        to: user.email,
        templateName: 'PAYMENT_SUBMITTED',
        variables: {
          name: user.name,
          planName: plan.name,
          duration: duration.toString(),
          utr,
          amount: `INR ${totalAmount.toFixed(2)}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment details submitted successfully. Awaiting administrator verification.',
      payment,
    });
  } catch (error: any) {
    console.error('Payment Submission Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during payment registration.' },
      { status: 500 }
    );
  }
}
