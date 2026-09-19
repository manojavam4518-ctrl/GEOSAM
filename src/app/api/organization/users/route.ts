import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, hashPassword } from '@/lib/auth';
import { PLATFORM_MODULES } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { formatDateIndian } from '@/utils/dateUtils';

async function getSessionOrganization(userId: string, userOrgId?: string | null) {
  if (userOrgId) {
    const org = await prisma.organization.findUnique({ where: { id: userOrgId } });
    if (org) return org;
  }
  return await prisma.organization.findFirst({
    where: { OR: [{ ownerId: userId }, { adminUserId: userId }] },
  });
}

/**
 * Calculates current user license capacity for an organization:
 * - purchased: total user slots approved and unexpired
 * - used: total active staff user accounts created
 * - available: purchased - used
 */
export async function getOrganizationLicenseCapacity(orgId: string) {
  const now = new Date();

  // Find all active approved purchases
  const activePurchases = await (prisma as any).userLicensePurchase.findMany({
    where: {
      organizationId: orgId,
      paymentStatus: 'APPROVED',
      status: 'ACTIVE',
      expiryDate: { gte: now },
    },
  });

  const totalPurchased = activePurchases.reduce(
    (sum: number, p: any) => sum + (p.usersCount || 0),
    0
  );

  // Count active additional users in this organization
  const usedCount = await prisma.user.count({
    where: {
      organizationId: orgId,
      isAdditionalUser: true,
      status: { not: 'DELETED' },
    },
  });

  const available = Math.max(0, totalPurchased - usedCount);

  return {
    purchased: totalPurchased,
    used: usedCount,
    available,
    activePurchases,
  };
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

    if (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: User Accounts are accessible only by Organization Administrators.' },
        { status: 403 }
      );
    }

    const org = await getSessionOrganization(session.userId, session.user.organizationId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const now = new Date();

    // Auto-update expired user licenses
    await (prisma as any).userLicense.updateMany({
      where: {
        organizationId: org.id,
        status: 'ACTIVE',
        expiryDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Auto-update expired user license purchases
    await (prisma as any).userLicensePurchase.updateMany({
      where: {
        organizationId: org.id,
        status: 'ACTIVE',
        expiryDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Calculate live capacity counters
    const capacity = await getOrganizationLicenseCapacity(org.id);

    // Get parent organization subscription details
    const activeSub = await prisma.subscription.findFirst({
      where: {
        OR: [{ organizationId: org.id }, { userId: org.ownerId }],
        status: 'ACTIVE',
        endDate: { gte: now },
      },
      orderBy: { endDate: 'desc' },
    });

    const remainingOrgDays = activeSub
      ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const where: any = { organizationId: org.id };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { userMobile: { contains: search, mode: 'insensitive' } },
        { roleName: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const userLicenses = await (prisma as any).userLicense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            status: true,
            isAdditionalUser: true,
            assignedRoleId: true,
            assignedRoleName: true,
            assignedModules: true,
            createdAt: true,
          },
        },
      },
    });

    // Enrich assigned modules with display labels
    const enrichedLicenses = userLicenses.map((lic: any) => {
      const currentModules = lic.user?.assignedModules || lic.assignedModules || [];
      const moduleNames = currentModules.map((key: string) => ({
        key,
        name: PLATFORM_MODULES[key]?.name || key,
        category: PLATFORM_MODULES[key]?.category || 'LOGISTICS',
      }));

      return {
        ...lic,
        roleName: lic.user?.assignedRoleName || lic.roleName,
        assignedModules: currentModules,
        moduleDetails: moduleNames,
      };
    });

    return NextResponse.json({
      success: true,
      userLicenses: enrichedLicenses,
      licenseCapacity: {
        purchased: capacity.purchased,
        used: capacity.used,
        available: capacity.available,
      },
      remainingOrgDays,
      orgSubscriptionExpiry: activeSub ? activeSub.endDate : null,
      organizationName: org.name,
    });
  } catch (error: any) {
    console.error('Organization User Accounts GET Error:', error);
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
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    // Validation 3: ORG_ADMIN has permission
    if (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Creating user accounts is allowed only by Organization Administrators.' },
        { status: 403 }
      );
    }

    const org = await getSessionOrganization(session.userId, session.user.organizationId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    // Validation 1: Organization is active
    if (org.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Your organization is currently inactive. Please contact support.' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Validation 2: Main subscription is active and unexpired
    const activeSub = await prisma.subscription.findFirst({
      where: {
        OR: [{ organizationId: org.id }, { userId: org.ownerId }],
        status: 'ACTIVE',
        endDate: { gte: now },
      },
      orderBy: { endDate: 'desc' },
    });

    if (!activeSub) {
      return NextResponse.json(
        {
          error:
            "Your organization's GEO TRANSIT subscription has expired. Please contact your Organization Owner to renew.",
          code: 'SUBSCRIPTION_EXPIRED',
        },
        { status: 403 }
      );
    }

    // Validation 4: Purchased user-license capacity is available
    const capacity = await getOrganizationLicenseCapacity(org.id);
    if (capacity.available <= 0) {
      return NextResponse.json(
        {
          error: 'No user licenses are currently available. Purchase additional users to create another account.',
          code: 'NO_LICENSES_AVAILABLE',
        },
        { status: 400 }
      );
    }

    // Find the active purchase entitlement with remaining capacity to link expiry
    const activePurchase =
      capacity.activePurchases.find((p: any) => p.expiryDate && new Date(p.expiryDate) >= now) ||
      capacity.activePurchases[0];

    const licenseExpiryDate = activePurchase?.expiryDate
      ? new Date(activePurchase.expiryDate)
      : new Date(activeSub.endDate);

    const body = await req.json();
    const { name, email, password, roleId, mobile } = body;

    // Validation 8: User fields & email validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'User full name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'User email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Initial password is required and must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Check if email already registered in system
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      if (existingUser.organizationId && existingUser.organizationId !== org.id) {
        return NextResponse.json(
          { error: 'An account with this email address already exists in another organization.' },
          { status: 400 }
        );
      }
      if (existingUser.status !== 'DISABLED') {
        return NextResponse.json(
          { error: 'An active user account with this email address already exists in your organization.' },
          { status: 400 }
        );
      }
    }

    // Validation 5 & 6: Selected role is active & valid
    if (!roleId) {
      return NextResponse.json({ error: 'Please select a predefined role for this user.' }, { status: 400 });
    }

    const platformRole = await (prisma as any).platformRole.findUnique({
      where: { id: roleId },
    });

    if (!platformRole) {
      return NextResponse.json({ error: 'Selected role does not exist.' }, { status: 404 });
    }

    if (!platformRole.active) {
      return NextResponse.json(
        {
          error: `The role '${platformRole.name}' has been deactivated by Super Admin and cannot be assigned.`,
        },
        { status: 400 }
      );
    }

    // Validation 7: Selected modules are valid
    const assignedModuleKeys = platformRole.moduleKeys || [];
    if (assignedModuleKeys.length === 0) {
      return NextResponse.json({ error: 'Selected role does not contain any assigned modules.' }, { status: 400 });
    }

    const platformModules = await (prisma as any).platformModule.findMany({
      where: {
        key: { in: assignedModuleKeys },
        active: true,
      },
    });

    if (platformModules.length === 0) {
      return NextResponse.json(
        { error: 'All modules in this role are currently inactive. Cannot create account.' },
        { status: 400 }
      );
    }

    // Securely hash the initial password with bcrypt (NEVER store plaintext)
    const hashedPassword = await hashPassword(password);

    // Create or find employee in organization for attendance association
    let employee = await prisma.employee.findFirst({
      where: { organizationId: org.id, email: cleanEmail },
    });

    if (!employee) {
      const empCount = await prisma.employee.count({ where: { organizationId: org.id } });
      const employeeIdStr = `EMP-${String(1001 + empCount).padStart(4, '0')}`;
      employee = await prisma.employee.create({
        data: {
          organizationId: org.id,
          employeeId: employeeIdStr,
          name: name.trim(),
          mobile: mobile ? mobile.trim() : '9876543210',
          email: cleanEmail,
          designation: platformRole.name,
          department: 'Operations',
          status: 'ACTIVE',
        },
      });
    }

    // Create the User account
    let createdUser;
    if (existingUser) {
      createdUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name.trim(),
          mobile: mobile ? mobile.trim() : existingUser.mobile,
          password: hashedPassword,
          role: 'USER',
          organizationId: org.id,
          isAdditionalUser: true,
          assignedRoleId: platformRole.id,
          assignedRoleName: platformRole.name,
          assignedModules: assignedModuleKeys,
          emailVerified: true,
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      });
    } else {
      createdUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          mobile: mobile ? mobile.trim() : '9876543210',
          company: org.name,
          password: hashedPassword,
          role: 'USER',
          organizationId: org.id,
          isAdditionalUser: true,
          assignedRoleId: platformRole.id,
          assignedRoleName: platformRole.name,
          assignedModules: assignedModuleKeys,
          emailVerified: true,
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      });
    }

    // Link employee to user
    await prisma.employee.update({
      where: { id: employee.id },
      data: { userId: createdUser.id },
    });

    // Create UserLicense record linked to active purchase
    const userLicense = await (prisma as any).userLicense.create({
      data: {
        organizationId: org.id,
        userId: createdUser.id,
        employeeId: employee.id,
        userName: name.trim(),
        userMobile: mobile ? mobile.trim() : '9876543210',
        userEmail: cleanEmail,
        designation: platformRole.name,
        department: 'Operations',
        duration: activePurchase?.durationSelected || 3,
        price: activePurchase?.pricePerUser || 0,
        startDate: now,
        expiryDate: licenseExpiryDate,
        paymentStatus: 'APPROVED',
        status: 'ACTIVE',
        roleId: platformRole.id,
        roleName: platformRole.name,
        assignedModules: assignedModuleKeys,
        purchaseId: activePurchase?.id || null,
        paymentType: 'USER_LICENSE',
      },
    });

    // Link user to license
    await prisma.user.update({
      where: { id: createdUser.id },
      data: { userLicenseId: userLicense.id },
    });

    // Send User Credentials Email via SMTP
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailResult = await sendEmail({
      to: cleanEmail,
      templateName: 'USER_CREDENTIALS',
      variables: {
        name: createdUser.name,
        companyName: org.name,
        loginEmail: cleanEmail,
        assignedRole: platformRole.name,
        assignedModules: platformModules.map((m: any) => m.name).join(', '),
        expiryDate: formatDateIndian(licenseExpiryDate),
        loginUrl: `${appUrl}/login`,
      },
    });

    // Record Audit Log
    await recordAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      organizationId: org.id,
      action: `Created User Account: ${name.trim()} (${platformRole.name})`,
      relatedRecordId: createdUser.id,
      metadata: {
        userName: name.trim(),
        userEmail: cleanEmail,
        roleName: platformRole.name,
        assignedModules: assignedModuleKeys,
        expiryDate: licenseExpiryDate.toISOString(),
        emailSent: emailResult.success,
      },
    });

    const updatedCapacity = await getOrganizationLicenseCapacity(org.id);

    return NextResponse.json({
      success: true,
      message: `User account '${name.trim()}' created successfully with role '${platformRole.name}'. Credential email sent to ${cleanEmail}.`,
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        roleName: platformRole.name,
        assignedModules: assignedModuleKeys,
        expiryDate: licenseExpiryDate,
      },
      licenseCapacity: updatedCapacity,
      emailSent: emailResult.success,
    });
  } catch (error: any) {
    console.error('Organization User Accounts POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
