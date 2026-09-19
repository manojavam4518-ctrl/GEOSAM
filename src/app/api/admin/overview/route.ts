import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ----------------------------------------------------
    // 1. LOGISTICS METRICS
    // ----------------------------------------------------
    const [
      totalQuotations,
      todaysQuotations,
      activeRateCards,
      activeCourierCompanies,
      pendingSalesFollowUps,
      activeCustomers,
    ] = await Promise.all([
      prisma.quotation.count(),
      prisma.quotation.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.rateCard.count({ where: { active: true } }),
      prisma.courierCompany.count({ where: { active: true } }),
      prisma.salesFollowUp.count({ where: { furtherAction: { contains: 'PENDING' } } }),
      prisma.user.count({ where: { role: 'USER', status: 'ACTIVE' } }),
    ]);

    // ----------------------------------------------------
    // 2. SHOPPING METRICS
    // ----------------------------------------------------
    const [
      totalPackagingOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      paidOrdersList,
      totalPackagingProducts,
    ] = await Promise.all([
      prisma.packagingOrder.count(),
      prisma.packagingOrder.count({ where: { status: 'PENDING_PAYMENT' } }),
      prisma.packagingOrder.count({ where: { status: { in: ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED'] } } }),
      prisma.packagingOrder.count({ where: { status: 'DELIVERED' } }),
      prisma.packagingOrder.count({ where: { status: 'CANCELLED' } }),
      prisma.packagingOrder.findMany({
        where: { status: { in: ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] } },
        select: { totalAmount: true },
      }),
      prisma.packagingProduct.count({ where: { active: true } }),
    ]);

    const packagingSalesRevenue = paidOrdersList.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // ----------------------------------------------------
    // 3. SUBSCRIPTIONS & PLATFORM METRICS
    // ----------------------------------------------------
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const activeSubCount = await prisma.subscription.count({
      where: { status: 'ACTIVE', endDate: { gte: now } },
    });

    const usersWithActiveSub = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', endDate: { gte: now } },
      select: { userId: true },
    });
    const activeUserIds = usersWithActiveSub.map(s => s.userId);
    const demoUsers = await prisma.user.count({
      where: {
        role: 'USER',
        id: { notIn: activeUserIds },
      },
    });

    const pendingPayments = await prisma.payment.count({ where: { status: 'PENDING' } });

    const approvedPayments = await prisma.payment.findMany({
      where: { status: 'APPROVED' },
      select: { totalAmount: true },
    });
    const subscriptionRevenue = approvedPayments.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const activeDevices = await prisma.deviceSession.count({
      where: { active: true },
    });

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSubscriptions = await prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        logistics: {
          totalQuotations,
          todaysQuotations,
          activeRateCards,
          activeCourierCompanies,
          pendingSalesFollowUps,
          activeCustomers,
        },
        shopping: {
          totalPackagingOrders,
          pendingOrders,
          processingOrders,
          deliveredOrders,
          cancelledOrders,
          totalPackagingProducts,
          packagingSalesRevenue: parseFloat(packagingSalesRevenue.toFixed(2)),
        },
        subscriptions: {
          totalUsers,
          demoUsers,
          activeSubscriptions: activeSubCount,
          pendingPayments,
          subscriptionRevenue: parseFloat(subscriptionRevenue.toFixed(2)),
          activeDevices,
          expiringSubscriptions,
        },
        // Legacy compatibility
        totalUsers,
        demoUsers,
        activeSubscriptions: activeSubCount,
        pendingPayments,
        revenue: parseFloat((subscriptionRevenue + packagingSalesRevenue).toFixed(2)),
        activeDevices,
        expiringSubscriptions,
      },
    });
  } catch (error: any) {
    console.error('Admin Overview GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
