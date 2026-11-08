import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import {
  SHIPPING_LABEL_MODULE_KEY,
  getOrCreateMasterShippingLabelTemplate,
  parsePackageCount,
  generateTrackingNumber,
} from '@/lib/shippingLabel';

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
    const rawLabels: any[] = Array.isArray(body.labels) ? body.labels : [];

    if (rawLabels.length === 0) {
      return NextResponse.json(
        { error: 'No shipment records provided for bulk generation.' },
        { status: 400 }
      );
    }

    // Resolve template
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

    // Frozen snapshot of template configuration
    const templateSnapshot = {
      templateId: template.id,
      name: template.name,
      version: template.version || 1,
      sizePreset: body.sizePreset || template.sizePreset,
      widthInches: template.widthInches,
      heightInches: template.heightInches,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      orientation: template.orientation,
      logoUrl: body.logoUrl !== undefined ? body.logoUrl : template.logoUrl,
      logoPosition: template.logoPosition,
      logoWidth: template.logoWidth,
      logoHeight: template.logoHeight,
      headerText: body.courierCompany || template.headerText,
      footerText: template.footerText,
      borderStyle: template.borderStyle,
      qrConfig: template.qrConfig,
      barcodeConfig: template.barcodeConfig,
      fields: template.fields,
    };

    const savedLabels: any[] = [];

    // Save records maintaining identical history structure and tracking visibility
    for (const item of rawLabels) {
      const trackingNumber = (item.tracking_number || item.trackingNumber || generateTrackingNumber()).trim().toUpperCase();
      const totalCount = parsePackageCount(item.package_count || item.packageCount || 1);
      const pkgCountStr = totalCount > 1 ? `${totalCount} Packages` : '01 / 01';

      const labelDataToSave = {
        ...item,
        courier_company: body.courierCompany || item.courier_company || 'GEO TRANSIT',
        tracking_number: trackingNumber,
        package_count: pkgCountStr,
      };

      const newLabel = await (prisma as any).shippingLabel.create({
        data: {
          organizationId,
          templateId,
          templateSnapshot,
          createdById: access.user?.id || null,
          createdByName: access.user?.name || 'Company User',
          trackingNumber,
          recipientName: item.recipient_name?.trim() || null,
          recipientMobile: item.mobile?.trim() || null,
          recipientCity: item.city?.trim() || null,
          recipientState: item.state?.trim() || null,
          recipientPincode: item.pincode ? String(item.pincode).trim() : null,
          recipientAddress: [item.address_line_1, item.address_line_2].filter(Boolean).join(', ') || null,
          service: item.service || 'LITE',
          serviceType: item.service_type || 'STD EXP-A',
          originCode: item.origin_code || 'BOM',
          destinationCode: item.destination_code || 'DEL',
          paymentStatus: item.payment_status || 'PREPAID',
          amountToCollect: Number(item.amount_to_collect) || 0.0,
          weight: item.weight !== undefined ? Number(item.weight) : 1.0,
          packageCount: pkgCountStr,
          routeLocation: item.route_location || 'NORTH HUB / R-04',
          mode: item.mode || 'SURFACE',
          shipmentDate: item.date ? new Date(item.date) : new Date(),
          shipmentTime: item.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          status: 'GENERATED',
          qrData: trackingNumber,
          barcodeData: trackingNumber,
          labelData: labelDataToSave,
        },
      });

      savedLabels.push(newLabel);
    }

    await recordAuditLog({
      action: 'SHIPPING_LABELS_BULK_GENERATED',
      userId: access.user?.id,
      userEmail: access.user?.email,
      organizationId,
      metadata: {
        totalGenerated: savedLabels.length,
        templateId,
        courierCompany: body.courierCompany,
        firstTrackingNumber: savedLabels[0]?.trackingNumber,
        lastTrackingNumber: savedLabels[savedLabels.length - 1]?.trackingNumber,
      },
    });

    return NextResponse.json({
      success: true,
      count: savedLabels.length,
      labels: savedLabels,
      message: `${savedLabels.length} shipment labels generated and recorded in history successfully.`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/organization/shipping-labels/bulk:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save bulk shipping labels.' },
      { status: 500 }
    );
  }
}
