import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import {
  getCustomTransportationReasons,
  addCustomTransportationReason,
} from '@/lib/declarationDb';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const customReasons = await getCustomTransportationReasons(organizationId);
    return NextResponse.json({ customReasons });
  } catch (err: any) {
    console.error('Error fetching custom transportation reasons:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch custom reasons.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const body = await req.json();
    const reason = (body?.reason || '').trim();

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required.' }, { status: 400 });
    }

    const result = await addCustomTransportationReason(organizationId, reason);
    const updatedList = await getCustomTransportationReasons(organizationId);

    return NextResponse.json({
      success: true,
      reason: result.reason,
      alreadyExists: result.alreadyExists,
      customReasons: updatedList,
    });
  } catch (err: any) {
    console.error('Error adding custom transportation reason:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to add custom reason.' },
      { status: 500 }
    );
  }
}

