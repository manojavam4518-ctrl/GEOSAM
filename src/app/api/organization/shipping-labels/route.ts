import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import {
  SHIPPING_LABEL_MODULE_KEY,
  getOrCreateMasterShippingLabelTemplate,
  validateShippingLabelData,
  generateTrackingNumber,
} from '@/lib/shippingLabel';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, SHIPPING_LABEL_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const preset = searchParams.get('preset') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const statusParam = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // Date filtering bounds
    let start: Date | undefined;
    let end: Date | undefined;
    const now = new Date();

    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'this_week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - diffToMonday), 23, 59, 59, 999);
    } else if (preset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'custom' || startDateParam || endDateParam) {
      if (startDateParam) {
        start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
      }
      if (endDateParam) {
        end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
      }
    }

    // Strict multi-tenant organization filter
    const where: any = {
      organizationId,
    };

    if (start && end) {
      where.createdAt = { gte: start, lte: end };
    } else if (start) {
      where.createdAt = { gte: start };
    } else if (end) {
      where.createdAt = { lte: end };
    }

    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam;
    }

    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { recipientMobile: { contains: search, mode: 'insensitive' } },
        { recipientCity: { contains: search, mode: 'insensitive' } },
        { recipientState: { contains: search, mode: 'insensitive' } },
        { recipientPincode: { contains: search, mode: 'insensitive' } },
        { service: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalCount, labels] = await Promise.all([
      (prisma as any).shippingLabel.count({ where }),
      (prisma as any).shippingLabel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      labels,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/organization/shipping-labels:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shipping labels.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, SHIPPING_LABEL_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const body = await req.json();
    let templateId = body.templateId;

    let template: any = null;
    if (templateId) {
      template = await (prisma as any).shippingLabelTemplate.findUnique({
        where: { id: templateId },
      });
    }

    if (!template) {
      template = await getOrCreateMasterShippingLabelTemplate();
      templateId = template.id;
    }

    // Ensure tracking number
    let trackingNumber = body.tracking_number?.trim();
    if (!trackingNumber) {
      trackingNumber = generateTrackingNumber();
      body.tracking_number = trackingNumber;
    }

    // Validate fields according to template configuration
    const validation = validateShippingLabelData(template.fields || [], body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.errors[0],
          allErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Prepare QR Code & Barcode values
    const qrData = trackingNumber;
    const barcodeData = trackingNumber;

    // Create frozen template snapshot for version safety
    const templateSnapshot = {
      templateId: template.id,
      name: template.name,
      version: template.version || 1,
      sizePreset: template.sizePreset,
      widthInches: template.widthInches,
      heightInches: template.heightInches,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      orientation: template.orientation,
      logoUrl: template.logoUrl,
      logoPosition: template.logoPosition,
      logoWidth: template.logoWidth,
      logoHeight: template.logoHeight,
      headerText: template.headerText,
      footerText: template.footerText,
      borderStyle: template.borderStyle,
      qrConfig: template.qrConfig,
      barcodeConfig: template.barcodeConfig,
      fields: template.fields,
    };

    const newLabel = await (prisma as any).shippingLabel.create({
      data: {
        organizationId,
        templateId,
        templateSnapshot,
        createdById: access.user?.id || null,
        createdByName: access.user?.name || 'Company User',
        trackingNumber,
        recipientName: body.recipient_name?.trim() || null,
        recipientMobile: body.mobile?.trim() || null,
        recipientCity: body.city?.trim() || null,
        recipientState: body.state?.trim() || null,
        recipientPincode: body.pincode?.trim() || null,
        recipientAddress: [body.address_line_1, body.address_line_2].filter(Boolean).join(', ') || null,
        service: body.service || 'LITE',
        serviceType: body.service_type || 'STD EXP-A',
        originCode: body.origin_code || 'BOM',
        destinationCode: body.destination_code || 'DEL',
        paymentStatus: body.payment_status || 'PREPAID',
        amountToCollect: Number(body.amount_to_collect) || 0.0,
        weight: body.weight !== undefined ? Number(body.weight) : 1.0,
        packageCount: body.package_count || '001 / 001',
        routeLocation: body.route_location || null,
        mode: body.mode || 'SURFACE',
        shipmentDate: body.date ? new Date(body.date) : new Date(),
        shipmentTime: body.time || null,
        status: 'GENERATED',
        qrData,
        barcodeData,
        labelData: body, // Complete dynamic values map
      },
    });

    await recordAuditLog({
      action: 'SHIPPING_LABEL_GENERATED',
      userId: access.user?.id,
      userEmail: access.user?.email,
      organizationId,
      relatedRecordId: newLabel.id,
      metadata: {
        labelId: newLabel.id,
        trackingNumber: newLabel.trackingNumber,
        recipientName: newLabel.recipientName,
        service: newLabel.service,
        templateId,
      },
    });

    return NextResponse.json({
      success: true,
      label: newLabel,
      message: 'Shipping label generated and saved successfully.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/organization/shipping-labels:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate shipping label.' },
      { status: 500 }
    );
  }
}
