import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { deviceLimit: 'asc' },
    });

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error: any) {
    console.error('Admin Plans GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const {
      id,
      price3Months,
      price6Months,
      price12Months,
      active,
      recommended,
      deviceLimit,
      customRateCardLimit,
      systemRateCardAccess,
      rateComparisonEnabled,
      rateCardImportEnabled,
      rateCardExportEnabled
    } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required.' }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
    }

    const p3 = parseFloat(price3Months);
    const p6 = parseFloat(price6Months);
    const p12 = parseFloat(price12Months);

    if (isNaN(p3) || p3 < 0 || isNaN(p6) || p6 < 0 || isNaN(p12) || p12 < 0) {
      return NextResponse.json({ error: 'Prices must be non-negative numbers.' }, { status: 400 });
    }

    // Update Plan
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        price3Months: p3,
        price6Months: p6,
        price12Months: p12,
        active: active !== undefined ? !!active : plan.active,
        recommended: recommended !== undefined ? !!recommended : plan.recommended,
        deviceLimit: deviceLimit !== undefined ? parseInt(deviceLimit) || plan.deviceLimit : plan.deviceLimit,
        customRateCardLimit: customRateCardLimit !== undefined ? parseInt(customRateCardLimit) || 0 : plan.customRateCardLimit,
        systemRateCardAccess: systemRateCardAccess !== undefined ? !!systemRateCardAccess : plan.systemRateCardAccess,
        rateComparisonEnabled: rateComparisonEnabled !== undefined ? !!rateComparisonEnabled : plan.rateComparisonEnabled,
        rateCardImportEnabled: rateCardImportEnabled !== undefined ? !!rateCardImportEnabled : plan.rateCardImportEnabled,
        rateCardExportEnabled: rateCardExportEnabled !== undefined ? !!rateCardExportEnabled : plan.rateCardExportEnabled,
      },
    });

    // If recommended is true, we should unmark others?
    if (recommended) {
      await prisma.subscriptionPlan.updateMany({
        where: { id: { not: id } },
        data: { recommended: false },
      });
    }

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `Updated Plan Pricing: ${updatedPlan.name}`,
        relatedRecordId: updatedPlan.id,
        metadata: {
          price3Months: p3,
          price6Months: p6,
          price12Months: p12,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Plan pricing for '${updatedPlan.name}' updated successfully.`,
      plan: updatedPlan,
    });
  } catch (error: any) {
    console.error('Admin Plans POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
