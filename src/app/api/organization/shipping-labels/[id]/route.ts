import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import { SHIPPING_LABEL_MODULE_KEY } from '@/lib/shippingLabel';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await verifyModuleAccess(req, SHIPPING_LABEL_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const { id } = await params;
    const label = await (prisma as any).shippingLabel.findUnique({
      where: { id },
    });

    if (!label) {
      return NextResponse.json({ error: 'Shipping label not found.' }, { status: 404 });
    }

    // Strict multi-tenant organization isolation check
    if (label.organizationId.toString() !== organizationId.toString()) {
      return NextResponse.json({ error: 'Forbidden. Access to this label is restricted.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      label,
    });
  } catch (error: any) {
    console.error('Error in GET /api/organization/shipping-labels/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shipping label.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await verifyModuleAccess(req, SHIPPING_LABEL_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const { id } = await params;
    const label = await (prisma as any).shippingLabel.findUnique({
      where: { id },
    });

    if (!label) {
      return NextResponse.json({ error: 'Shipping label not found.' }, { status: 404 });
    }

    // Strict multi-tenant organization isolation check
    if (label.organizationId.toString() !== organizationId.toString()) {
      return NextResponse.json({ error: 'Forbidden. Access to this label is restricted.' }, { status: 403 });
    }

    await (prisma as any).shippingLabel.delete({
      where: { id },
    });

    await recordAuditLog({
      action: 'SHIPPING_LABEL_DELETED',
      userId: access.user?.id,
      userEmail: access.user?.email,
      organizationId,
      relatedRecordId: id,
      metadata: {
        labelId: id,
        trackingNumber: label.trackingNumber,
        recipientName: label.recipientName,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shipping label deleted successfully.',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/organization/shipping-labels/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete shipping label.' },
      { status: 500 }
    );
  }
}
