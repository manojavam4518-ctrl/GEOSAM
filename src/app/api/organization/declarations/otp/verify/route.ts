import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { verifyDeclarationOTP } from '@/lib/declarationDb';

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
    const { mobile, code } = body;

    if (!mobile || !code) {
      return NextResponse.json(
        { error: 'Mobile number and 6-digit OTP code are required.' },
        { status: 400 }
      );
    }

    const result = await verifyDeclarationOTP(mobile, code, organizationId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in verifyDeclarationOTP API:', err);
    return NextResponse.json(
      { error: err.message || 'OTP verification failed.' },
      { status: 400 }
    );
  }
}

