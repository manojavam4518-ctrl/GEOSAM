import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (token) {
      const access = await verifyModuleAccess(req, 'CARRIER_TRACKING');
      if (!access.authorized) {
        return access.response!;
      }
    }

    const couriers = await prisma.courierPartner.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      couriers,
    });
  } catch (error: any) {
    console.error('Fetch Couriers Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
