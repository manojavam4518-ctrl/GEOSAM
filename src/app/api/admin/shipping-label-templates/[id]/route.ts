import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { id } = await params;
    const template = await (prisma as any).shippingLabelTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json({ error: 'Shipping label template not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/shipping-label-templates/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch template.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await (prisma as any).shippingLabelTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Shipping label template not found.' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      description,
      isDefault,
      isActive,
      sizePreset,
      widthInches,
      heightInches,
      widthMm,
      heightMm,
      orientation,
      logoUrl,
      logoPosition,
      logoWidth,
      logoHeight,
      headerText,
      footerText,
      borderStyle,
      qrConfig,
      barcodeConfig,
      fields,
    } = body;

    // If making this default, unset previous default
    if (isDefault) {
      await (prisma as any).shippingLabelTemplate.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await (prisma as any).shippingLabelTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description?.trim() : existing.description,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        version: (existing.version || 1) + 1, // Version safety: increment template version on edit!
        sizePreset: sizePreset || existing.sizePreset,
        widthInches: widthInches !== undefined ? Number(widthInches) : existing.widthInches,
        heightInches: heightInches !== undefined ? Number(heightInches) : existing.heightInches,
        widthMm: widthMm !== undefined ? Number(widthMm) : existing.widthMm,
        heightMm: heightMm !== undefined ? Number(heightMm) : existing.heightMm,
        orientation: orientation || existing.orientation,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        logoPosition: logoPosition || existing.logoPosition,
        logoWidth: logoWidth !== undefined ? Number(logoWidth) : existing.logoWidth,
        logoHeight: logoHeight !== undefined ? Number(logoHeight) : existing.logoHeight,
        headerText: headerText !== undefined ? headerText : existing.headerText,
        footerText: footerText !== undefined ? footerText : existing.footerText,
        borderStyle: borderStyle || existing.borderStyle,
        qrConfig: qrConfig !== undefined ? qrConfig : existing.qrConfig,
        barcodeConfig: barcodeConfig !== undefined ? barcodeConfig : existing.barcodeConfig,
        fields: fields !== undefined ? fields : existing.fields,
      },
    });

    await recordAuditLog({
      action: 'SHIPPING_LABEL_TEMPLATE_UPDATED',
      adminId: adminSession.user.id,
      adminEmail: adminSession.user.email,
      relatedRecordId: updated.id,
      metadata: {
        templateId: updated.id,
        name: updated.name,
        newVersion: updated.version,
        isDefault: updated.isDefault,
        isActive: updated.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      template: updated,
      message: 'Shipping label template updated successfully.',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/shipping-label-templates/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await (prisma as any).shippingLabelTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Shipping label template not found.' }, { status: 404 });
    }

    // Check if any labels reference this template
    const labelCount = await (prisma as any).shippingLabel.count({
      where: { templateId: id },
    });

    if (labelCount > 0) {
      // Deactivate instead of deleting to preserve historical integrity
      await (prisma as any).shippingLabelTemplate.update({
        where: { id },
        data: { isActive: false, isDefault: false },
      });

      await recordAuditLog({
        action: 'SHIPPING_LABEL_TEMPLATE_DEACTIVATED',
        adminId: adminSession.user.id,
        adminEmail: adminSession.user.email,
        relatedRecordId: id,
        metadata: {
          templateId: id,
          reason: 'Template has existing generated labels. Deactivated instead of permanent deletion.',
          labelCount,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Template deactivated successfully (retained for historical generated label reproducibility).',
      });
    }

    // Safe to permanently delete if no labels reference it
    await (prisma as any).shippingLabelTemplate.delete({
      where: { id },
    });

    await recordAuditLog({
      action: 'SHIPPING_LABEL_TEMPLATE_DELETED',
      adminId: adminSession.user.id,
      adminEmail: adminSession.user.email,
      relatedRecordId: id,
      metadata: {
        templateId: id,
        name: existing.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shipping label template deleted successfully.',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/shipping-label-templates/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template.' },
      { status: 500 }
    );
  }
}
