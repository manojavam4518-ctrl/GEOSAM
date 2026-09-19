import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true, deviceLimit: { gte: 2 } },
      orderBy: { deviceLimit: 'asc' },
    });

    const paymentSettings = await prisma.paymentSettings.findFirst();
    const gstRate = paymentSettings?.gstRate ?? 18.0;
    const gstEnabled = paymentSettings?.gstEnabled ?? true;

    return NextResponse.json({
      success: true,
      plans,
      taxSettings: {
        gstEnabled,
        gstRate,
      },
    });
  } catch (error: any) {
    console.error('Fetch Plans Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching plans.' },
      { status: 500 }
    );
  }
}
