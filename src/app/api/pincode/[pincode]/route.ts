import { NextRequest, NextResponse } from 'next/server';
import { PincodeService } from '@/utils/pincodeEngine';
import { verifyModuleAccess } from '@/lib/modulePermissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pincode: string }> }
) {
  try {
    const access = await verifyModuleAccess(req, 'PINCODE_LOOKUP');
    if (!access.authorized) {
      return access.response!;
    }

    const { pincode } = await params;
    
    if (!pincode || pincode.trim().length !== 6 || !/^\d{6}$/.test(pincode.trim())) {
      return NextResponse.json({ error: 'Invalid 6-digit pincode format.' }, { status: 400 });
    }

    const info = await PincodeService.lookup(pincode.trim());

    if (!info) {
      return NextResponse.json({ error: 'Pincode not found.' }, { status: 404 });
    }

    // Set Cache-Control header to cache pincode resolutions for better performance
    return NextResponse.json(
      { success: true, info },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600'
        }
      }
    );
  } catch (error: any) {
    console.error('Pincode lookup GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
