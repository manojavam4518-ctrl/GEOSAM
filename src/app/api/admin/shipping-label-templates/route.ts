import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { recordAuditLog } from '@/lib/audit';
import {
  getOrCreateMasterShippingLabelTemplate,
  DEFAULT_MASTER_TEMPLATE,
} from '@/lib/shippingLabel';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    // Ensure at least default template exists
    await getOrCreateMasterShippingLabelTemplate();

    const templates = await (prisma as any).shippingLabelTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/shipping-label-templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shipping label templates.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      isDefault = false,
      isActive = true,
      sizePreset = '4x6',
      widthInches = 4.0,
      heightInches = 6.0,
      widthMm = 101.6,
      heightMm = 152.4,
      orientation = 'PORTRAIT',
      logoUrl = DEFAULT_MASTER_TEMPLATE.logoUrl,
      logoPosition = 'TOP_RIGHT',
      logoWidth = 110.0,
      logoHeight = 45.0,
      headerText = 'GEO TRANSIT EXPRESS CARGO',
      footerText = 'GEO TRANSIT LOGISTICS NETWORK • SCAN QR OR VERIFY AT WWW.GEOTRANSIT.COM',
      borderStyle = 'SOLID',
      qrConfig = DEFAULT_MASTER_TEMPLATE.qrConfig,
      barcodeConfig = DEFAULT_MASTER_TEMPLATE.barcodeConfig,
      fields = DEFAULT_MASTER_TEMPLATE.fields,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required.' }, { status: 400 });
    }

    // If making this default, unset previous default
    if (isDefault) {
      await (prisma as any).shippingLabelTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const newTemplate = await (prisma as any).shippingLabelTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: Boolean(isDefault),
        isActive: Boolean(isActive),
        version: 1,
        sizePreset,
        widthInches: Number(widthInches) || 4.0,
        heightInches: Number(heightInches) || 6.0,
        widthMm: Number(widthMm) || 101.6,
        heightMm: Number(heightMm) || 152.4,
        orientation,
        logoUrl: logoUrl || null,
        logoPosition,
        logoWidth: Number(logoWidth) || 110.0,
        logoHeight: Number(logoHeight) || 45.0,
        headerText: headerText || null,
        footerText: footerText || null,
        borderStyle,
        qrConfig,
        barcodeConfig,
        fields,
      },
    });

    await recordAuditLog({
      action: 'SHIPPING_LABEL_TEMPLATE_CREATED',
      adminId: adminSession.user.id,
      adminEmail: adminSession.user.email,
      relatedRecordId: newTemplate.id,
      metadata: {
        templateId: newTemplate.id,
        name: newTemplate.name,
        sizePreset: newTemplate.sizePreset,
      },
    });

    return NextResponse.json({
      success: true,
      template: newTemplate,
      message: 'Shipping label template created successfully.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/shipping-label-templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create shipping label template.' },
      { status: 500 }
    );
  }
}
