import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

export interface ModuleDefinition {
  key: string;
  name: string;
  description: string;
  category: 'LOGISTICS' | 'ORGANIZATION' | 'SHOPPING';
  defaultPrice: number;
  routes: string[];
}

export const PLATFORM_MODULES: Record<string, ModuleDefinition> = {
  RATE_CALCULATOR: {
    key: 'RATE_CALCULATOR',
    name: 'Rate Calculator',
    description: 'Calculate and compare shipping rates across multiple courier rate cards',
    category: 'LOGISTICS',
    defaultPrice: 500,
    routes: ['/dashboard/rate-calculator'],
  },
  WEIGHT_CALCULATOR: {
    key: 'WEIGHT_CALCULATOR',
    name: 'Weight Calculator',
    description: 'Calculate actual, volumetric, and chargeable weights with standard divisors',
    category: 'LOGISTICS',
    defaultPrice: 200,
    routes: ['/dashboard/calculator'],
  },
  CALCULATION_HISTORY: {
    key: 'CALCULATION_HISTORY',
    name: 'Calculation History',
    description: 'Access complete log and history of past weight and freight calculations',
    category: 'LOGISTICS',
    defaultPrice: 150,
    routes: ['/dashboard/history'],
  },
  CARRIER_TRACKING: {
    key: 'CARRIER_TRACKING',
    name: 'Carrier Tracking',
    description: 'Live courier tracking and shipment status lookup',
    category: 'LOGISTICS',
    defaultPrice: 250,
    routes: ['/dashboard/tracking'],
  },
  PINCODE_LOOKUP: {
    key: 'PINCODE_LOOKUP',
    name: 'Pincode Lookup',
    description: 'Indian postal pincode serviceability and region verification',
    category: 'LOGISTICS',
    defaultPrice: 200,
    routes: ['/dashboard/pincode-serviceability'],
  },
  RATE_CARDS: {
    key: 'RATE_CARDS',
    name: 'Rate Cards',
    description: 'Manage domestic and international courier & cargo pricing rate cards',
    category: 'LOGISTICS',
    defaultPrice: 600,
    routes: ['/dashboard/rate-cards'],
  },
  QUOTATIONS: {
    key: 'QUOTATIONS',
    name: 'Quotations',
    description: 'Generate, manage, and share professional PDF freight quotations',
    category: 'LOGISTICS',
    defaultPrice: 400,
    routes: ['/dashboard/quotations'],
  },
  SALES_FOLLOW_UP: {
    key: 'SALES_FOLLOW_UP',
    name: 'Sales Follow-Up',
    description: 'Track client leads, inquiries, and quotation follow-up workflows',
    category: 'LOGISTICS',
    defaultPrice: 300,
    routes: ['/dashboard/sales-follow-up'],
  },
  EMPLOYEE_MANAGEMENT: {
    key: 'EMPLOYEE_MANAGEMENT',
    name: 'Employee Directory',
    description: 'Maintain employee profiles, designations, and departments',
    category: 'ORGANIZATION',
    defaultPrice: 350,
    routes: ['/dashboard/employees'],
  },
  ATTENDANCE: {
    key: 'ATTENDANCE',
    name: 'Attendance Register',
    description: 'Daily staff attendance tracking, leaves, and presence register',
    category: 'ORGANIZATION',
    defaultPrice: 300,
    routes: ['/dashboard/attendance'],
  },
  PAYROLL: {
    key: 'PAYROLL',
    name: 'Payroll & Salary Slips',
    description: 'Monthly payroll generation, salary slips, and disbursement records',
    category: 'ORGANIZATION',
    defaultPrice: 500,
    routes: ['/dashboard/payroll'],
  },
  PACKAGING_SHOP: {
    key: 'PACKAGING_SHOP',
    name: 'Cargo Packaging Shop',
    description: 'Order packaging supplies, view orders, and request custom packaging',
    category: 'SHOPPING',
    defaultPrice: 250,
    routes: ['/dashboard/packaging'],
  },
};

export const DEFAULT_PREDEFINED_ROLES = [
  {
    name: 'Sales Executive',
    description: 'User responsible for rate calculation, quotations, and sales follow-up.',
    moduleKeys: ['RATE_CALCULATOR', 'QUOTATIONS', 'SALES_FOLLOW_UP'],
  },
  {
    name: 'Operations Executive',
    description: 'User responsible for shipment weight calculation, rate comparisons, history, and carrier tracking.',
    moduleKeys: ['WEIGHT_CALCULATOR', 'RATE_CALCULATOR', 'CALCULATION_HISTORY', 'CARRIER_TRACKING'],
  },
  {
    name: 'HR Executive',
    description: 'User responsible for employee directory, attendance register, and payroll management.',
    moduleKeys: ['EMPLOYEE_MANAGEMENT', 'ATTENDANCE', 'PAYROLL'],
  },
  {
    name: 'Logistics Coordinator',
    description: 'Coordinates cargo logistics with rate calculation, rate cards, pincode lookup, and carrier tracking.',
    moduleKeys: ['WEIGHT_CALCULATOR', 'RATE_CALCULATOR', 'RATE_CARDS', 'PINCODE_LOOKUP', 'CARRIER_TRACKING'],
  },
];

/**
 * Ensures standard platform modules and roles exist in the database.
 */
export async function ensurePlatformModulesAndRolesSeeded() {
  try {
    // 1. Seed modules if none exist
    const moduleCount = await (prisma as any).platformModule.count();
    if (moduleCount === 0) {
      for (const mod of Object.values(PLATFORM_MODULES)) {
        await (prisma as any).platformModule.upsert({
          where: { key: mod.key },
          update: {},
          create: {
            key: mod.key,
            name: mod.name,
            description: mod.description,
            category: mod.category,
            monthlyPrice: mod.defaultPrice,
            active: true,
          },
        });
      }
    }

    // 2. Seed roles if none exist
    const roleCount = await (prisma as any).platformRole.count();
    if (roleCount === 0) {
      for (const r of DEFAULT_PREDEFINED_ROLES) {
        await (prisma as any).platformRole.upsert({
          where: { name: r.name },
          update: {},
          create: {
            name: r.name,
            description: r.description,
            moduleKeys: r.moduleKeys,
            active: true,
          },
        });
      }
    }
  } catch (err) {
    console.error('ensurePlatformModulesAndRolesSeeded Error:', err);
  }
}

export interface ModuleAccessResult {
  authorized: boolean;
  response?: NextResponse;
  user?: any;
  session?: any;
  organizationId?: string | null;
  license?: any;
}

/**
 * Server-side authorization enforcer.
 * Checks User -> Organization -> Role -> Assigned Modules -> API Permission.
 */
export async function verifyModuleAccess(
  req: NextRequest,
  requiredModuleKey?: string
): Promise<ModuleAccessResult> {
  const token = req.cookies.get('session_token')?.value;
  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 }),
    };
  }

  const verified = await verifyToken(token);
  if (!verified) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Session expired.' }, { status: 401 }),
    };
  }

  const session = await verifyDeviceSession(verified.sessionToken);
  if (!session || !session.user || session.user.status === 'DISABLED') {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Session invalidated or user account disabled.' },
        { status: 401 }
      ),
    };
  }

  const user = session.user;

  // Super Admin has unrestricted access across all platform modules
  if (user.role === 'ADMIN') {
    return { authorized: true, user, session, organizationId: user.organizationId };
  }

  // Resolve user's organization
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

  // Check Master Organization Subscription
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

  // Master Entitlement Check: If user belongs to an organization that had a subscription which is now expired
  if (org && !activeSub) {
    // Check if the organization ever had a subscription
    const hadSubscription = await prisma.subscription.count({
      where: {
        OR: [
          { organizationId: org.id },
          { userId: org.ownerId },
        ],
      },
    });

    if (hadSubscription > 0) {
      if (user.role === 'OWNER') {
        return {
          authorized: false,
          response: NextResponse.json(
            {
              error: 'Your GEO TRANSIT subscription has expired. Please renew your subscription to continue.',
              code: 'SUBSCRIPTION_EXPIRED',
            },
            { status: 403 }
          ),
        };
      } else {
        return {
          authorized: false,
          response: NextResponse.json(
            {
              error: "Your organization's GEO TRANSIT subscription has expired. Please contact your Organization Owner.",
              code: 'SUBSCRIPTION_EXPIRED',
            },
            { status: 403 }
          ),
        };
      }
    }
  }

  // Check OWNER role restrictions:
  // Customer OWNER does NOT receive Organization Admin management features (Employees, Attendance Admin, Payroll, User Accounts)
  const ORG_ADMIN_MODULES = ['EMPLOYEE_MANAGEMENT', 'ATTENDANCE', 'PAYROLL', 'USER_ACCOUNTS'];
  if (user.role === 'OWNER' && requiredModuleKey && ORG_ADMIN_MODULES.includes(requiredModuleKey)) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error:
            'Forbidden: Organization administration (Employee Management, Attendance Register, Payroll, and User Accounts) is available exclusively through your Organization Admin (ORG_ADMIN) account.',
          code: 'ORG_ADMIN_REQUIRED',
        },
        { status: 403 }
      ),
    };
  }

  // Handle Additional User / Staff Member
  if (user.isAdditionalUser) {
    // 1. Account status must be ACTIVE
    if (user.status !== 'ACTIVE') {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Account disabled. Please contact your Organization Administrator.', code: 'ACCOUNT_DISABLED' },
          { status: 403 }
        ),
      };
    }

    // 2. Master subscription must be active (already verified above, but if no subscription at all, block)
    if (!activeSub) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: "Your organization's GEO TRANSIT subscription has expired. Please contact your Organization Owner.",
            code: 'SUBSCRIPTION_EXPIRED',
          },
          { status: 403 }
        ),
      };
    }

    // 3. Individual user license check
    const now = new Date();
    const license = await (prisma as any).userLicense.findFirst({
      where: {
        userId: user.id,
        organizationId: organizationId || undefined,
        status: 'ACTIVE',
        paymentStatus: 'APPROVED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!license || (license.expiryDate && new Date(license.expiryDate) < now)) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: 'Your GEO TRANSIT user license has expired. Please contact your Organization Admin.',
            code: 'LICENSE_EXPIRED',
          },
          { status: 403 }
        ),
      };
    }

    // 4. Role Module permission check
    if (requiredModuleKey) {
      const assigned = user.assignedModules || [];
      if (!assigned.includes(requiredModuleKey)) {
        const modName = PLATFORM_MODULES[requiredModuleKey]?.name || requiredModuleKey;
        return {
          authorized: false,
          response: NextResponse.json(
            {
              error: `Forbidden: You do not have permission to access the '${modName}' module. Your assigned role does not include this module.`,
              code: 'MODULE_ACCESS_DENIED',
            },
            { status: 403 }
          ),
        };
      }
    }

    return { authorized: true, user, session, organizationId, license };
  }

  // Customer Org Admin has full access to organization's modules
  if (user.role === 'ORG_ADMIN') {
    return { authorized: true, user, session, organizationId };
  }

  // Owner or unsubscribed demo user
  return { authorized: true, user, session, organizationId };
}
