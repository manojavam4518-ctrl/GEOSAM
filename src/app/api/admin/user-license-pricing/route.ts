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
      orderBy: { duration: 'asc' },
    });

    if (pricings.length === 0) {
      for (const item of DEFAULT_PRICING) {
        await (prisma as any).userLicensePricing.create({
          data: item,
        });
      }
      pricings = await (prisma as any).userLicensePricing.findMany({
        orderBy: { duration: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      pricings,
    });
  } catch (error: any) {
    console.error('User License Pricing GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const { duration, price, active } = await req.json();

    if (!duration || price === undefined || price < 0) {
      return NextResponse.json({ error: 'Valid duration (3, 6, 12 months) and non-negative price are required.' }, { status: 400 });
    }

    const durationNum = parseInt(duration, 10);
    const priceNum = parseFloat(price);

    const pricing = await (prisma as any).userLicensePricing.upsert({
      where: { duration: durationNum },
      update: {
        price: priceNum,
        active: active !== undefined ? Boolean(active) : true,
      },
      create: {
        duration: durationNum,
        price: priceNum,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${durationNum}-Month User License Price updated successfully to ₹${priceNum.toLocaleString('en-IN')}.`,
      pricing,
    });
  } catch (error: any) {
    console.error('User License Pricing POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
