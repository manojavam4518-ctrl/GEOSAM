import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { SHIPPING_LABEL_MODULE_KEY, generateTrackingNumber } from '@/lib/shippingLabel';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, SHIPPING_LABEL_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const trackingNumber = generateTrackingNumber();

    return NextResponse.json({
      success: true,
      trackingNumber,
    });
  } catch (error: any) {
    console.error('Error generating tracking number:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate tracking number.' },
      { status: 500 }
    );
  }
}
