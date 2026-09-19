import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { calculateLicenseEligibility, getAllUserLicensePricings } from '@/lib/userLicensePricing';

async function getSessionOrganization(userId: string, userOrgId?: string | null) {
  if (userOrgId) {
    const org = await prisma.organization.findUnique({ where: { id: userOrgId } });
    if (org) return org;
  }
  return await prisma.organization.findFirst({
    where: { OR: [{ ownerId: userId }, { adminUserId: userId }] },
  });
}

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

    if (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden: License calculations are accessible only by Organization Administrators.' },
        { status: 403 }
      );
    }

    const org = await getSessionOrganization(session.userId, session.user.organizationId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const duration = parseInt(searchParams.get('duration') || '3', 10);
    const usersCount = parseInt(searchParams.get('usersCount') || '1', 10);

    const [eligibility, allPricings] = await Promise.all([
      calculateLicenseEligibility(org.id, duration, usersCount),
      getAllUserLicensePricings(),
    ]);

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      organizationName: org.name,
      eligibility,
      pricings: allPricings,
    });
  } catch (error: any) {
    console.error('User License Eligibility GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
