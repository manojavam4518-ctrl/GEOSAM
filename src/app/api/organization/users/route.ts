import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, hashPassword } from '@/lib/auth';
import { PLATFORM_MODULES } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { formatDateIndian } from '@/utils/dateUtils';
import { calculateLicenseEligibility } from '@/lib/userLicensePricing';

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

    if (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden: User Accounts are accessible only by Organization Administrators or Company Owners.' },
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

    // Validation 3: ORG_ADMIN or OWNER has permission
    if (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden: Creating user accounts is allowed only by Organization Administrators or Company Owners.' },
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

    const body = await req.json();
    const {
      name,
      email,
      password,
      mobile,
      assignedModules,
      duration,
      paymentMethod,
      utr,
      screenshotUrl,
      billingDetails,
      roleId,
    } = body;

    // User field validations
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

    // Module Resolution (Direct Module Selection - Requirement 2)
    let moduleKeys: string[] = [];
    if (Array.isArray(assignedModules) && assignedModules.length > 0) {
      moduleKeys = assignedModules;
    } else if (roleId) {
      const platformRole = await (prisma as any).platformRole.findUnique({ where: { id: roleId } });
      if (platformRole) moduleKeys = platformRole.moduleKeys || [];
    }

    if (moduleKeys.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one module for this user account.' },
        { status: 400 }
      );
    }

    // Validate modules in database
    const activePlatformModules = await (prisma as any).platformModule.findMany({
      where: {
        key: { in: moduleKeys },
        active: true,
      },
    });

    if (activePlatformModules.length === 0) {
      return NextResponse.json(
        { error: 'The selected modules are inactive or invalid. Cannot create user license.' },
        { status: 400 }
      );
    }

    const validModuleKeys = activePlatformModules.map((m: any) => m.key);
    const durationNum = [3, 6, 12].includes(Number(duration)) ? Number(duration) : 3;

    // Server-Side Subscription Expiry & Pricing Calculation (Requirements 3, 4, 5)
    const eligibility = await calculateLicenseEligibility(org.id, durationNum, 1, validModuleKeys);

    if (!eligibility.hasActiveSubscription) {
      return NextResponse.json(
        {
          error:
            eligibility.warningMessage ||
            'Your organization must have an active main subscription to purchase additional user licenses.',
        },
        { status: 400 }
      );
    }

    if (!eligibility.actualExpiryDate) {
      return NextResponse.json({ error: 'Could not resolve license validity window.' }, { status: 400 });
    }

    const licenseExpiryDate = new Date(eligibility.actualExpiryDate);

    // Hash password with bcrypt securely
    const hashedPassword = await hashPassword(password);

    // Create or find employee in organization
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
          designation: 'Staff',
          department: 'General',
          status: 'ACTIVE',
        },
      });
    }

    const hasUtr = Boolean(utr && utr.trim());
    const hasCapacity = capacity.available > 0;

    if (!hasUtr && !hasCapacity) {
      return NextResponse.json(
        {
          error:
            'Please provide payment transaction reference (UTR) to purchase a license for this user, or ensure you have available user license capacity.',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 400 }
      );
    }

    if (hasUtr) {
      // 1. Direct License Purchase Flow with Selected Modules (PENDING Super Admin approval)
      const userLicense = await (prisma as any).userLicense.create({
        data: {
          organizationId: org.id,
          userName: name.trim(),
          userMobile: mobile ? mobile.trim() : '9876543210',
          userEmail: cleanEmail,
          designation: 'Staff',
          department: 'General',
          duration: durationNum,
          price: eligibility.totalPayable,
          startDate: null, // Activated upon Super Admin approval
          expiryDate: licenseExpiryDate,
          paymentStatus: 'PENDING',
          status: 'PENDING_PAYMENT',
          paymentMethod: paymentMethod || 'UPI',
          utr: utr.trim(),
          screenshotUrl: screenshotUrl || null,
          billingDetails: billingDetails || null,
          assignedModules: validModuleKeys,
          modulePricingSnapshot: eligibility,
          initialPasswordHash: hashedPassword,
          paymentType: 'USER_LICENSE',
        },
      });

      // Create or stage the user account in DISABLED state until payment approved
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
            assignedModules: validModuleKeys,
            userLicenseId: userLicense.id,
            emailVerified: true,
            status: 'DISABLED',
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
            assignedModules: validModuleKeys,
            userLicenseId: userLicense.id,
            emailVerified: true,
            status: 'DISABLED',
            mustChangePassword: true,
          },
        });
      }

      await (prisma as any).userLicense.update({
        where: { id: userLicense.id },
        data: { userId: createdUser.id, employeeId: employee.id },
      });

      await prisma.employee.update({
        where: { id: employee.id },
        data: { userId: createdUser.id },
      });

      await recordAuditLog({
        userId: session.user.id,
        userEmail: session.user.email,
        organizationId: org.id,
        action: `Submitted User License: ${name.trim()} (${validModuleKeys.length} Modules, ₹${eligibility.totalPayable}, UTR: ${utr.trim()})`,
        relatedRecordId: userLicense.id,
        metadata: {
          userName: name.trim(),
          userEmail: cleanEmail,
          assignedModules: validModuleKeys,
          duration: durationNum,
          totalPayable: eligibility.totalPayable,
          isProrated: eligibility.isProrated,
          utr: utr.trim(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `User license for '${name.trim()}' submitted successfully with ${validModuleKeys.length} selected module(s) (₹${eligibility.totalPayable.toLocaleString('en-IN')}). Awaiting Super Admin payment verification.`,
        user: {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          assignedModules: validModuleKeys,
          status: 'PENDING_APPROVAL',
        },
        license: userLicense,
      });
    }

    // 2. Existing Capacity Flow: Use pre-paid slot and immediately activate
    const activePurchase =
      capacity.activePurchases.find((p: any) => p.expiryDate && new Date(p.expiryDate) >= now) ||
      capacity.activePurchases[0];

    const activeExpiry = activePurchase?.expiryDate
      ? new Date(activePurchase.expiryDate)
      : licenseExpiryDate;

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
          assignedModules: validModuleKeys,
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
          assignedModules: validModuleKeys,
          emailVerified: true,
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      });
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { userId: createdUser.id },
    });

    const userLicense = await (prisma as any).userLicense.create({
      data: {
        organizationId: org.id,
        userId: createdUser.id,
        employeeId: employee.id,
        userName: name.trim(),
        userMobile: mobile ? mobile.trim() : '9876543210',
        userEmail: cleanEmail,
        designation: 'Staff',
        department: 'General',
        duration: activePurchase?.durationSelected || durationNum,
        price: activePurchase?.pricePerUser || eligibility.totalPayable,
        startDate: now,
        expiryDate: activeExpiry,
        paymentStatus: 'APPROVED',
        status: 'ACTIVE',
        assignedModules: validModuleKeys,
        purchaseId: activePurchase?.id || null,
        paymentType: 'USER_LICENSE',
      },
    });

    await prisma.user.update({
      where: { id: createdUser.id },
      data: { userLicenseId: userLicense.id },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailResult = await sendEmail({
      to: cleanEmail,
      templateName: 'USER_CREDENTIALS',
      variables: {
        name: createdUser.name,
        companyName: org.name,
        loginEmail: cleanEmail,
        assignedRole: 'Employee',
        assignedModules: activePlatformModules.map((m: any) => m.name).join(', '),
        expiryDate: formatDateIndian(activeExpiry),
        loginUrl: `${appUrl}/login`,
      },
    });

    await recordAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      organizationId: org.id,
      action: `Created User Account with Modules: ${name.trim()} (${validModuleKeys.join(', ')})`,
      relatedRecordId: createdUser.id,
      metadata: {
        userName: name.trim(),
        userEmail: cleanEmail,
        assignedModules: validModuleKeys,
        expiryDate: activeExpiry.toISOString(),
        emailSent: emailResult.success,
      },
    });

    const updatedCapacity = await getOrganizationLicenseCapacity(org.id);

    return NextResponse.json({
      success: true,
      message: `User account '${name.trim()}' created successfully with ${validModuleKeys.length} assigned modules.`,
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        assignedModules: validModuleKeys,
        expiryDate: activeExpiry,
      },
      licenseCapacity: updatedCapacity,
      emailSent: emailResult.success,
    });
  } catch (error: any) {
    console.error('Organization User Accounts POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
