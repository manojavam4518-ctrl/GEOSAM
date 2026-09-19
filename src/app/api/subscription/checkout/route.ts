import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

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
    const { planId, duration } = await req.json();

    if (!planId || !duration) {
      return NextResponse.json({ error: 'Plan ID and duration are required.' }, { status: 400 });
    }

    const parsedDuration = parseInt(duration);
    if (![3, 6, 12].includes(parsedDuration)) {
      return NextResponse.json({ error: 'Invalid subscription duration. Supported values: 3, 6, or 12 Months.' }, { status: 400 });
    }

    // 3. Find Plan in database
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.active) {
      return NextResponse.json({ error: 'Selected plan is invalid or inactive.' }, { status: 400 });
    }

    // 4. Retrieve Price
    let basePrice = 0;
    if (parsedDuration === 3) {
      basePrice = plan.price3Months;
    } else if (parsedDuration === 6) {
      basePrice = plan.price6Months;
    } else if (parsedDuration === 12) {
      basePrice = plan.price12Months;
    }

    // 5. Fetch Tax Settings
    const paymentSettings = await prisma.paymentSettings.findFirst();
    const gstRate = paymentSettings?.gstRate ?? 18.0;
    const gstEnabled = paymentSettings?.gstEnabled ?? true;

    // Calculate tax and total
    const gstAmount = gstEnabled ? basePrice * (gstRate / 100) : 0;
    const totalAmount = basePrice + gstAmount;

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        deviceLimit: plan.deviceLimit,
      },
      duration: parsedDuration,
      baseAmount: parseFloat(basePrice.toFixed(2)),
      gstAmount: parseFloat(gstAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      gstEnabled,
      gstRate,
    });
  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during checkout processing.' },
      { status: 500 }
    );
  }
}
