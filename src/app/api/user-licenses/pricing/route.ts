import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

const DEFAULT_PRICING = [
  { duration: 3, price: 1499, active: true },
  { duration: 6, price: 2699, active: true },
  { duration: 12, price: 4999, active: true },
];

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
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    let pricings = await (prisma as any).userLicensePricing.findMany({
      where: { active: true },
      orderBy: { duration: 'asc' },
    });

    if (pricings.length === 0) {
      for (const item of DEFAULT_PRICING) {
        await (prisma as any).userLicensePricing.upsert({
          where: { duration: item.duration },
          update: { price: item.price, active: item.active },
          create: item,
        });
      }
      pricings = await (prisma as any).userLicensePricing.findMany({
        where: { active: true },
        orderBy: { duration: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      pricings,
    });
  } catch (error: any) {
    console.error('Active User License Pricing GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
