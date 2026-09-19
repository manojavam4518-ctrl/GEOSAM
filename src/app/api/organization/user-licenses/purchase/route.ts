import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { calculateLicenseEligibility } from '@/lib/userLicensePricing';
import { recordAuditLog } from '@/lib/audit';

async function getSessionOrganization(userId: string, userOrgId?: string | null) {
  if (userOrgId) {
    const org = await prisma.organization.findUnique({ where: { id: userOrgId } });
    if (org) return org;
  }
  return await prisma.organization.findFirst({
    where: { OR: [{ ownerId: userId }, { adminUserId: userId }] },
  });
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

    if (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Purchasing user licenses is allowed only by Organization Administrators.' },
        { status: 403 }
      );
    }

    const org = await getSessionOrganization(session.userId, session.user.organizationId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const body = await req.json();
    const { usersCount, duration, paymentMethod, utr, screenshotUrl, billingDetails } = body;

    const parsedCount = parseInt(usersCount, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      return NextResponse.json({ error: 'Please select at least 1 user license.' }, { status: 400 });
    }

    const durationNum = parseInt(duration, 10);
    if (![3, 6, 12].includes(durationNum)) {
      return NextResponse.json({ error: 'Please select a valid duration (3, 6, or 12 months).' }, { status: 400 });
    }

    if (!utr || !utr.trim()) {
      return NextResponse.json({ error: 'Payment Transaction ID / UTR is required.' }, { status: 400 });
    }

    // Server-side calculation & validation of parent subscription eligibility
    const eligibility = await calculateLicenseEligibility(org.id, durationNum, parsedCount);

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

    if (!eligibility.actualExpiryDate || !eligibility.subscriptionEndDate) {
      return NextResponse.json({ error: 'Could not resolve license validity window.' }, { status: 400 });
    }

    const calculatedExpiry = new Date(eligibility.actualExpiryDate);
    const orgSubExpiry = new Date(eligibility.subscriptionEndDate);

    // Strict Server-Side Validation: license expiry must NEVER exceed organization subscription expiry
    if (calculatedExpiry.getTime() > orgSubExpiry.getTime() + 60000) {
      return NextResponse.json(
        {
          error: `Invalid purchase: User licenses cannot extend beyond the organization subscription expiry date (${orgSubExpiry.toLocaleDateString('en-IN')}).`,
        },
        { status: 400 }
      );
    }

    // Create UserLicensePurchase entitlement record in PENDING state
    const purchase = await (prisma as any).userLicensePurchase.create({
      data: {
        organizationId: org.id,
        usersCount: parsedCount,
        durationSelected: durationNum,
        actualDurationDays: eligibility.maxAvailableDays,
        pricePerUser: eligibility.calculatedPricePerUser,
        totalAmount: eligibility.totalPayable,
        paymentMethod: paymentMethod || 'UPI',
        utr: utr.trim(),
        screenshotUrl: screenshotUrl || null,
        billingDetails: billingDetails || null,
        startDate: null, // Set upon Super Admin approval
        expiryDate: calculatedExpiry,
        paymentStatus: 'PENDING',
        status: 'PENDING_PAYMENT',
        isProrated: eligibility.isProrated,
        paymentType: 'USER_LICENSE',
      },
    });

    // Record Audit Log
    await recordAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      organizationId: org.id,
      action: `User License Purchase Submitted: ${parsedCount} Users for ${durationNum}M (Eligible: ${eligibility.maxAvailableDays} days, ₹${eligibility.totalPayable})`,
      relatedRecordId: purchase.id,
      metadata: {
        usersCount: parsedCount,
        durationSelected: durationNum,
        actualDurationDays: eligibility.maxAvailableDays,
        pricePerUser: eligibility.calculatedPricePerUser,
        totalAmount: eligibility.totalPayable,
        isProrated: eligibility.isProrated,
        utr: utr.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Purchase submitted successfully for ${parsedCount} user license(s) (₹${eligibility.totalPayable.toLocaleString('en-IN')}). Awaiting Super Admin payment verification.`,
      purchase,
      eligibility,
    });
  } catch (error: any) {
    console.error('User License Purchase POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
