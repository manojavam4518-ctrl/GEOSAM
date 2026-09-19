import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { verifyModuleAccess } from '@/lib/modulePermissions';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'CALCULATION_HISTORY');
    if (!access.authorized) {
      return access.response!;
    }

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

    // 2. Fetch latest 20 calculations
    const where: any = {};
    if (access.user.role !== 'ADMIN') {
      if (access.organizationId) {
        where.user = { organizationId: access.organizationId };
      } else {
        where.userId = session.userId;
      }
    }

    const history = await prisma.calculation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error('Fetch History Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching history.' },
      { status: 500 }
    );
  }
}
