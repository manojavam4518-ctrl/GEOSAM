import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, getUserAccessState } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, error: 'Not authenticated' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      const response = NextResponse.json({ authenticated: false, error: 'Invalid token' }, { status: 401 });
      response.cookies.delete('session_token');
      return response;
    }

    // Verify session in database (enforce remote logouts)
    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session || !session.user) {
      const response = NextResponse.json({ authenticated: false, error: 'Session invalidated or expired' }, { status: 401 });
      response.cookies.delete('session_token');
      return response;
    }

    const user = session.user;
    let activeSubscription: any = user.subscriptions?.[0] || null;

    if (!activeSubscription && user.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { ownerId: true }
      });
      if (org) {
        activeSubscription = await prisma.subscription.findFirst({
          where: { userId: org.ownerId, status: 'ACTIVE', endDate: { gte: new Date() } },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    // Execute active device count, rate card counts, and access status in parallel
    const [activeDevices, customRateCardsCount, systemRateCardsCount, accessStatus] = await Promise.all([
      user.organizationId
        ? prisma.deviceSession.count({
            where: {
              user: { organizationId: user.organizationId },
              active: true,
            },
          })
        : prisma.deviceSession.count({
            where: {
              userId: user.id,
              active: true,
            },
          }),
      prisma.rateCard.count({
        where: {
          ownerType: 'USER',
          ownerId: user.id,
          active: true,
        },
      }),
      prisma.rateCard.count({
        where: {
          ownerType: 'SYSTEM',
          active: true,
        },
      }),
      getUserAccessState(user.id, user),
    ]);

    const isDemo = !activeSubscription && user.role !== 'ADMIN';

    let userLicense: any = null;
    if (user.isAdditionalUser) {
      userLicense = await (prisma as any).userLicense.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          roleName: true,
          assignedModules: true,
          duration: true,
          startDate: true,
          expiryDate: true,
          status: true,
          paymentStatus: true,
        },
      });
    }

    // Format clean user response
    const cleanUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      mobile: user.mobile,
      company: user.company,
      role: user.role,
      organizationId: user.organizationId,
      assignedRoleId: user.assignedRoleId || null,
      assignedRoleName: user.assignedRoleName || null,
      assignedModules: user.assignedModules || [],
      isAdditionalUser: user.isAdditionalUser || false,
      userLicense,
      mustChangePassword: user.mustChangePassword,
      calculationsCount: user.calculationsCount,
      demoStartedAt: user.demoStartedAt,
      demoExpiresAt: user.demoExpiresAt,
      createdAt: user.createdAt,
      activeSubscription,
      activeDevicesCount: activeDevices,
      customRateCardsCount,
      systemRateCardsCount,
      isDemo,
      calculationsLimit: isDemo ? 10 : 99999,
      rateCardsLimit: isDemo ? 10 : (activeSubscription?.customRateCardLimit ?? 50),
      accessStatus,
    };

    return NextResponse.json({
      authenticated: true,
      user: cleanUser,
    });
  } catch (error: any) {
    console.error('Session verification API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
