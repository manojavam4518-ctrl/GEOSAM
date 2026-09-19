import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, parseUserAgent, createDeviceSession } from '@/lib/auth';
import { signToken } from '@/lib/auth-token';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { email, password, customDeviceName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // 1. Find User
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 2. Check Password
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // 3. Check Account Status
    if (user.status === 'DISABLED' || user.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'Your account has been disabled or deactivated. Please contact your administrator.', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      );
    }

    // Auto-activate unverified account on successful login attempt
    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, status: 'ACTIVE' },
      });
    }

    // 4. Resolve Organization and Master Subscription
    let org = null;
    let organizationId = user.organizationId;
    if (organizationId) {
      org = await prisma.organization.findUnique({ where: { id: organizationId } });
    } else if (user.role === 'OWNER') {
      org = await prisma.organization.findFirst({ where: { ownerId: user.id } });
      if (org) organizationId = org.id;
    } else if (user.role === 'ORG_ADMIN') {
      org = await prisma.organization.findFirst({ where: { adminUserId: user.id } });
      if (org) organizationId = org.id;
    }

    let activeSub = null;
    if (org) {
      activeSub = await prisma.subscription.findFirst({
        where: {
          OR: [
            { organizationId: org.id },
            ...(org.subscriptionId ? [{ id: org.subscriptionId }] : []),
            { userId: org.ownerId },
          ],
          status: 'ACTIVE',
          endDate: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      activeSub = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          endDate: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 5. Entitlement Check by Account Level
    // Super Admin bypasses all checks
    if (user.role !== 'ADMIN') {
      // LEVEL 4 — STAFF / ADDITIONAL USERS
      if (user.isAdditionalUser) {
        // Master Organization Subscription must be active
        if (!activeSub) {
          return NextResponse.json(
            {
              error: "Your organization's GEO TRANSIT subscription has expired. Please contact your Organization Owner.",
              code: 'ORG_SUBSCRIPTION_EXPIRED',
              subscriptionExpired: true,
            },
            { status: 403 }
          );
        }

        // Individual User License must be active and unexpired
        const now = new Date();
        const license = await (prisma as any).userLicense.findFirst({
          where: {
            userId: user.id,
            status: 'ACTIVE',
            paymentStatus: 'APPROVED',
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!license || !license.expiryDate || new Date(license.expiryDate) < now) {
          return NextResponse.json(
            {
              error: 'Your GEO TRANSIT user license has expired. Please contact your Organization Admin.',
              code: 'USER_LICENSE_EXPIRED',
              licenseExpired: true,
            },
            { status: 403 }
          );
        }
      }

      // LEVEL 3 — ORG_ADMIN
      else if (user.role === 'ORG_ADMIN') {
        if (!activeSub) {
          return NextResponse.json(
            {
              error: "Your organization's GEO TRANSIT subscription has expired. Please contact your Organization Owner to renew.",
              code: 'ORG_SUBSCRIPTION_EXPIRED',
              subscriptionExpired: true,
            },
            { status: 403 }
          );
        }
      }

      // LEVEL 2 — OWNER
      else if (user.role === 'OWNER') {
        const hadSubscription = await prisma.subscription.count({
          where: {
            OR: [
              { userId: user.id },
              ...(org ? [{ organizationId: org.id }] : []),
            ],
          },
        });

        if (hadSubscription > 0 && !activeSub) {
          return NextResponse.json(
            {
              error: 'Your GEO TRANSIT subscription has expired. Please renew your subscription to continue.',
              code: 'SUBSCRIPTION_EXPIRED',
              subscriptionExpired: true,
              renewUrl: '/dashboard/subscriptions',
            },
            { status: 403 }
          );
        }
      }
    }

    // 6. Parse User Agent for Device Session Info
    const userAgent = req.headers.get('user-agent');
    const uaDetails = parseUserAgent(userAgent);

    // 7. Create Device Session & enforce active device limits
    let session;
    try {
      session = await createDeviceSession(user.id, uaDetails, customDeviceName);
    } catch (limitErr: any) {
      return NextResponse.json(
        {
          error: limitErr.message || 'Device limit reached.',
          deviceLimitReached: true,
        },
        { status: 403 }
      );
    }

    // 8. Sign Session Cookie
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionToken: session.sessionToken,
    });

    // 9. Record Login Audit Log
    await recordAuditLog({
      action: 'User Logged In',
      userId: user.id,
      userEmail: user.email,
      organizationId,
      metadata: {
        role: user.role,
        isAdditionalUser: user.isAdditionalUser,
        deviceName: session.deviceName,
        browser: session.browser,
        os: session.os,
      },
    });

    const response = NextResponse.json({
      success: true,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      isAdditionalUser: user.isAdditionalUser,
      redirectUrl: user.role === 'ADMIN' ? '/admin' : '/dashboard',
    });

    // Set cookie: HTTP-only, secure, sameSite=Lax
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}

