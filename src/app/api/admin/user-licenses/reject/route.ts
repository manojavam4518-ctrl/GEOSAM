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

    const { purchaseId, licenseId, reason } = await req.json();
    const targetId = purchaseId || licenseId;

    if (!targetId) {
      return NextResponse.json({ error: 'Purchase ID is required.' }, { status: 400 });
    }

    const purchase = await (prisma as any).userLicensePurchase.findUnique({
      where: { id: targetId },
      include: { organization: true },
    });

    if (purchase) {
      const updatedPurchase = await (prisma as any).userLicensePurchase.update({
        where: { id: targetId },
        data: {
          paymentStatus: 'REJECTED',
          status: 'EXPIRED',
          adminNotes: reason || 'Payment rejected by Super Admin.',
        },
      });

      await recordAuditLog({
        adminId: session.user.id,
        adminEmail: session.user.email,
        organizationId: purchase.organizationId,
        action: `Rejected User License Purchase for ${purchase.organization?.name} (${purchase.usersCount} Users, ₹${purchase.totalAmount})`,
        relatedRecordId: purchase.id,
        metadata: {
          organizationId: purchase.organizationId,
          usersCount: purchase.usersCount,
          totalAmount: purchase.totalAmount,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'User license purchase rejected.',
        purchase: updatedPurchase,
      });
    }

    // Legacy fallback
    const license = await (prisma as any).userLicense.findUnique({
      where: { id: targetId },
    });

    if (license) {
      const updatedLicense = await (prisma as any).userLicense.update({
        where: { id: targetId },
        data: {
          paymentStatus: 'REJECTED',
          status: 'INACTIVE',
          adminNotes: reason || 'Payment rejection recorded by Super Admin.',
        },
      });

      await recordAuditLog({
        adminId: session.user.id,
        adminEmail: session.user.email,
        organizationId: license.organizationId,
        action: `Rejected Additional User License Payment for ${license.userName}`,
        relatedRecordId: license.id,
        metadata: {
          organizationId: license.organizationId,
          userEmail: license.userEmail,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'User license payment submission has been rejected.',
        license: updatedLicense,
      });
    }

    return NextResponse.json({ error: 'Purchase or license record not found.' }, { status: 404 });
  } catch (error: any) {
    console.error('Reject User License Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
