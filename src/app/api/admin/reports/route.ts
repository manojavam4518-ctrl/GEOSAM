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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ----------------------------------------------------
    // 1. LOGISTICS REPORT DATA
    // ----------------------------------------------------
    const [
      totalQuotations,
      domesticQuotations,
      internationalQuotations,
      recentQuotations,
      totalSalesLeads,
      signedSalesLeads,
      rateChallengeLeads,
    ] = await Promise.all([
      prisma.quotation.count(),
      prisma.quotation.count({ where: { serviceType: { contains: 'Domestic', mode: 'insensitive' } } }),
      prisma.quotation.count({ where: { serviceType: { contains: 'International', mode: 'insensitive' } } }),
      prisma.quotation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          quotationNumber: true,
          customerName: true,
          serviceType: true,
          rateCardName: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      prisma.salesFollowUp.count(),
      prisma.salesFollowUp.count({ where: { furtherAction: { contains: 'SIGNED' } } }),
      prisma.salesFollowUp.count({ where: { furtherAction: { contains: 'CHALLENGE' } } }),
    ]);

    // ----------------------------------------------------
    // 2. SHOPPING REPORT DATA
    // ----------------------------------------------------
    const [
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      paidPackagingOrders,
      allPackagingProducts,
    ] = await Promise.all([
      prisma.packagingOrder.count(),
      prisma.packagingOrder.count({ where: { status: 'DELIVERED' } }),
      prisma.packagingOrder.count({ where: { status: 'CANCELLED' } }),
      prisma.packagingOrder.findMany({
        where: { status: { in: ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] } },
        select: { totalAmount: true },
      }),
      prisma.packagingProduct.findMany({
        select: { id: true, name: true, category: true, stock: true },
      }),
    ]);

    const totalShoppingRevenue = paidPackagingOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // ----------------------------------------------------
    // 3. SUBSCRIPTIONS REPORT DATA
    // ----------------------------------------------------
    const [
      totalUsers,
      activeSubscribers,
      approvedPayments,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', endDate: { gte: now } } }),
      prisma.payment.findMany({
        where: { status: 'APPROVED' },
        select: { totalAmount: true, planName: true },
      }),
    ]);

    const totalSaaSRevenue = approvedPayments.reduce((acc, curr) => acc + curr.totalAmount, 0);

    return NextResponse.json({
      success: true,
      reports: {
        logistics: {
          totalQuotations,
          domesticQuotations,
          internationalQuotations,
          recentQuotations,
          totalSalesLeads,
          signedSalesLeads,
          rateChallengeLeads,
        },
        shopping: {
          totalOrders,
          deliveredOrders,
          cancelledOrders,
          totalShoppingRevenue: parseFloat(totalShoppingRevenue.toFixed(2)),
          totalProducts: allPackagingProducts.length,
        },
        subscriptions: {
          totalUsers,
          activeSubscribers,
          totalSaaSRevenue: parseFloat(totalSaaSRevenue.toFixed(2)),
        },
      },
    });
  } catch (error: any) {
    console.error('Admin Reports GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
