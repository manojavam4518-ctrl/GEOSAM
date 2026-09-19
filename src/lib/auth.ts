import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './prisma';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface UserAgentDetails {
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
}

export function parseUserAgent(userAgentString: string | null): UserAgentDetails {
  const ua = userAgentString || '';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let deviceType = 'Desktop';
  let deviceName = 'Desktop Client';

  // Basic OS Detection
  if (/windows/i.test(ua)) {
    os = 'Windows';
    deviceName = 'Windows PC';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
    deviceName = 'Mac';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
    deviceName = 'Linux PC';
  } else if (/android/i.test(ua)) {
    os = 'Android';
    deviceType = 'Mobile';
    deviceName = 'Android Device';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
    deviceType = /ipad/i.test(ua) ? 'Tablet' : 'Mobile';
    deviceName = /ipad/i.test(ua) ? 'iPad' : 'iPhone';
  }

  // Basic Browser Detection
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr|opios/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/edge|edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
  }

  return { deviceName, deviceType, browser, os };
}

export async function createDeviceSession(
  userId: string,
  uaDetails: UserAgentDetails | string | null,
  customDeviceName?: string
) {
  const sessionToken = generateToken();
  const parsedUa: UserAgentDetails = typeof uaDetails === 'string' || !uaDetails
    ? parseUserAgent(typeof uaDetails === 'string' ? uaDetails : null)
    : uaDetails;
  const finalDeviceName = customDeviceName || `${parsedUa.browser} on ${parsedUa.os}`;

  // First, verify device limits for paid plans
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: true,
      subscriptions: {
        where: { status: 'ACTIVE', endDate: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // GEO TRANSIT Super Admin bypass limit
  if (user.role === 'ADMIN') {
    return prisma.deviceSession.create({
      data: {
        userId,
        sessionToken,
        deviceName: finalDeviceName,
        deviceType: parsedUa.deviceType,
        browser: parsedUa.browser,
        os: parsedUa.os,
        active: true,
      },
    });
  }

  // Find active subscription for user or organization
  let org = null;
  if (user.organizationId) {
    org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
  } else if (user.role === 'OWNER') {
    org = await prisma.organization.findFirst({
      where: { ownerId: user.id },
    });
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
    activeSub = user.subscriptions[0] || null;
  }

  const deviceLimit = activeSub ? activeSub.deviceLimit : 1;

  // Count active sessions across the entire organization (Owner, Org Admin, Staff all count)
  let activeSessionsCount = 0;
  if (org) {
    const orgUsers = await prisma.user.findMany({
      where: {
        OR: [
          { organizationId: org.id },
          { id: org.ownerId },
        ],
      },
      select: { id: true },
    });
    const orgUserIds = orgUsers.map((u) => u.id);
    activeSessionsCount = await prisma.deviceSession.count({
      where: {
        userId: { in: orgUserIds },
        active: true,
      },
    });
  } else {
    activeSessionsCount = await prisma.deviceSession.count({
      where: {
        userId,
        active: true,
      },
    });
  }

  if (activeSessionsCount >= deviceLimit) {
    throw new Error(
      `Your current subscription allows ${deviceLimit} active devices. Please sign out from another device or upgrade your plan.`
    );
  }

  // Create new active session
  return prisma.deviceSession.create({
    data: {
      userId,
      sessionToken,
      deviceName: finalDeviceName,
      deviceType: parsedUa.deviceType,
      browser: parsedUa.browser,
      os: parsedUa.os,
      active: true,
    },
  });
}

export async function verifyDeviceSession(sessionToken: string) {
  if (!sessionToken) return null;

  const session = await prisma.deviceSession.findUnique({
    where: { sessionToken },
    include: {
      user: {
        include: {
          organization: true,
          subscriptions: {
            where: { status: 'ACTIVE', endDate: { gte: new Date() } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!session || !session.active || session.user.status === 'DISABLED') {
    return null;
  }

  // Update last active timestamp (heartbeat - throttled to once per 60s to prevent DB write lock contention)
  const now = new Date();
  if (!session.lastActive || now.getTime() - new Date(session.lastActive).getTime() > 60000) {
    prisma.deviceSession.update({
      where: { id: session.id },
      data: { lastActive: now },
    }).catch(err => console.error('Throttled heartbeat update error:', err));
  }

  return session;
}

export async function terminateDeviceSession(sessionToken: string) {
  return prisma.deviceSession.update({
    where: { sessionToken },
    data: { active: false },
  });
}

export async function getUserAccessState(
  userId: string,
  preFetchedUser?: {
    id: string;
    createdAt: Date;
    demoStartedAt?: Date | null;
    demoExpiresAt?: Date | null;
    role: string;
    organizationId?: string | null;
    isAdditionalUser?: boolean;
  }
): Promise<'UNAUTHENTICATED' | 'SUBSCRIPTION_ACTIVE' | 'PAYMENT_PENDING' | 'DEMO_ACTIVE' | 'SUBSCRIPTION_EXPIRED' | 'DEMO_EXPIRED'> {
  const user = preFetchedUser || await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      demoStartedAt: true,
      demoExpiresAt: true,
      role: true,
      organizationId: true,
      isAdditionalUser: true,
    },
  });

  if (!user) return 'UNAUTHENTICATED';

  // Admins always have SUBSCRIPTION_ACTIVE access
  if (user.role === 'ADMIN') {
    return 'SUBSCRIPTION_ACTIVE';
  }

  // Resolve Organization
  let org = null;
  if (user.organizationId) {
    org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
  } else if (user.role === 'OWNER') {
    org = await prisma.organization.findFirst({
      where: { ownerId: user.id },
    });
  }

  // Check master active subscription for the organization or user
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

  // Additional user / staff check
  if (user.isAdditionalUser) {
    if (!activeSub) {
      return 'SUBSCRIPTION_EXPIRED';
    }
    const license = await (prisma as any).userLicense.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        paymentStatus: 'APPROVED',
        expiryDate: { gte: new Date() },
      },
    });
    if (!license) {
      return 'SUBSCRIPTION_EXPIRED';
    }
    return 'SUBSCRIPTION_ACTIVE';
  }

  if (activeSub) {
    return 'SUBSCRIPTION_ACTIVE';
  }

  const targetUserId = org ? org.ownerId : user.id;

  // Check pending payment and website settings in parallel
  const [pendingPayment, settings] = await Promise.all([
    prisma.payment.findFirst({
      where: { userId: targetUserId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.websiteSettings.findFirst({ select: { demoDurationDays: true } }),
  ]);

  if (pendingPayment) {
    return 'PAYMENT_PENDING';
  }

  // Check demo period (only applicable for users who haven't subscribed yet)
  const hasHadSubscription = await prisma.subscription.count({
    where: {
      OR: [
        { userId: targetUserId },
        ...(org ? [{ organizationId: org.id }] : []),
      ],
    },
  });

  if (hasHadSubscription > 0) {
    return 'SUBSCRIPTION_EXPIRED';
  }

  const demoStartedAt = user.demoStartedAt || user.createdAt;
  const demoDuration = settings?.demoDurationDays ?? 10;
  const demoExpiresAt = user.demoExpiresAt || new Date(demoStartedAt.getTime() + demoDuration * 24 * 60 * 60 * 1000);

  const currentTime = new Date();
  if (currentTime <= demoExpiresAt) {
    return 'DEMO_ACTIVE';
  }

  return 'DEMO_EXPIRED';
}
