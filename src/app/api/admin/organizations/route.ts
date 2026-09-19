import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isAdditionalUser: true,
            status: true,
          },
        },
        userLicenses: {
          select: {
            id: true,
            userName: true,
            userEmail: true,
            roleName: true,
            duration: true,
            status: true,
            paymentStatus: true,
            expiryDate: true,
          },
        },
        employees: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich each organization with owner, admin, active subscription, and active device count
    const enrichedOrgs = await Promise.all(
      organizations.map(async (org) => {
        // Find Owner
        const owner = await prisma.user.findUnique({
          where: { id: org.ownerId },
          select: { id: true, name: true, email: true, mobile: true, company: true, status: true },
        });

        // Find Admin User
        let adminUser = null;
        if (org.adminUserId) {
          adminUser = await prisma.user.findUnique({
            where: { id: org.adminUserId },
            select: { id: true, name: true, email: true, mobile: true, status: true, mustChangePassword: true },
          });
        }

        // Find Main Active Subscription
        const activeSub = await prisma.subscription.findFirst({
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

        // Active device sessions count across the organization
        const activeDevicesCount = await prisma.deviceSession.count({
          where: {
            user: {
              OR: [
                { organizationId: org.id },
                { id: org.ownerId },
              ],
            },
            active: true,
          },
        });

        return {
          id: org.id,
          name: org.name,
          status: org.status,
          createdAt: org.createdAt,
          owner,
          adminUser,
          activeSubscription: activeSub || null,
          deviceLimit: activeSub?.deviceLimit || 1,
          activeDevicesCount,
          usersCount: org.users.length,
          staffCount: org.users.filter((u) => u.isAdditionalUser).length,
          employeeCount: org.employees.length,
          licensesCount: org.userLicenses.length,
          activeLicensesCount: org.userLicenses.filter((l) => l.status === 'ACTIVE').length,
        };
      })
    );

    return NextResponse.json({
      success: true,
      organizations: enrichedOrgs,
    });
  } catch (error: any) {
    console.error('Admin Organizations GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
