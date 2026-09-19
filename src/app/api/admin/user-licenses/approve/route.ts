import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

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
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { purchaseId, licenseId, adminNotes } = body;
    const targetId = purchaseId || licenseId;

    if (!targetId) {
      return NextResponse.json({ error: 'Purchase ID is required.' }, { status: 400 });
    }

    // 1. Check if it's a UserLicensePurchase (batch order)
    const purchase = await (prisma as any).userLicensePurchase.findUnique({
      where: { id: targetId },
      include: { organization: true },
    });

    const now = new Date();

    if (purchase) {
      // Find parent organization's active subscription
      const activeSub = await prisma.subscription.findFirst({
        where: {
          OR: [{ organizationId: purchase.organizationId }, { userId: purchase.organization.ownerId }],
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        orderBy: { endDate: 'desc' },
      });

      if (!activeSub) {
        return NextResponse.json(
          {
            error:
              'Cannot approve user licenses: Organization does not have an active main subscription.',
          },
          { status: 400 }
        );
      }

      const orgSubExpiry = new Date(activeSub.endDate);
      const daysToAdd = purchase.actualDurationDays || purchase.durationSelected * 30;
      const expectedExpiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      // Bound strictly by parent subscription expiry (Requirement 8 & 13)
      const finalExpiry =
        expectedExpiry.getTime() > orgSubExpiry.getTime() ? orgSubExpiry : expectedExpiry;

      const updatedPurchase = await (prisma as any).userLicensePurchase.update({
        where: { id: targetId },
        data: {
          paymentStatus: 'APPROVED',
          status: 'ACTIVE',
          startDate: now,
          expiryDate: finalExpiry,
          adminNotes: adminNotes || 'Payment approved by Super Admin.',
        },
      });

      await recordAuditLog({
        adminId: session.user.id,
        adminEmail: session.user.email,
        organizationId: purchase.organizationId,
        action: `Approved User License Purchase: ${purchase.usersCount} Users (${purchase.durationSelected}M, ₹${purchase.totalAmount})`,
        relatedRecordId: purchase.id,
        metadata: {
          organizationId: purchase.organizationId,
          organizationName: purchase.organization?.name,
          usersCount: purchase.usersCount,
          durationSelected: purchase.durationSelected,
          totalAmount: purchase.totalAmount,
          utr: purchase.utr,
          startDate: now.toISOString(),
          expiryDate: finalExpiry.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Approved ${purchase.usersCount} user license(s) for ${purchase.organization.name}. Valid until ${finalExpiry.toLocaleDateString('en-IN')}.`,
        purchase: updatedPurchase,
      });
    }

    // 2. Legacy fallback: Check if targetId is an individual UserLicense record
    const license = await (prisma as any).userLicense.findUnique({
      where: { id: targetId },
      include: { organization: true },
    });

    if (license) {
      const daysToAdd = license.duration * 30;
      const finalExpiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      const updatedLicense = await (prisma as any).userLicense.update({
        where: { id: targetId },
        data: {
          paymentStatus: 'APPROVED',
          status: 'ACTIVE',
          startDate: now,
          expiryDate: finalExpiry,
          adminNotes: adminNotes || 'Payment approved by Super Admin.',
        },
      });

      await recordAuditLog({
        adminId: session.user.id,
        adminEmail: session.user.email,
        organizationId: license.organizationId,
        action: `Approved User License for ${license.userName} (${license.roleName})`,
        relatedRecordId: license.id,
      });

      return NextResponse.json({
        success: true,
        message: `User license for '${license.userName}' approved successfully.`,
        license: updatedLicense,
      });
    }

    return NextResponse.json({ error: 'Purchase or license record not found.' }, { status: 404 });
  } catch (error: any) {
    console.error('Approve User License Purchase Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
