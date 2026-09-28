import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import {
  SHIPPING_LABEL_MODULE_KEY,
  getOrCreateMasterShippingLabelTemplate,
} from '@/lib/shippingLabel';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, SHIPPING_LABEL_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // Ensure default master template exists
    await getOrCreateMasterShippingLabelTemplate();

    const templates = await (prisma as any).shippingLabelTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error('Error in GET /api/organization/shipping-labels/templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shipping label templates.' },
      { status: 500 }
    );
  }
}
