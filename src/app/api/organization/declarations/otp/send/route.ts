import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { sendDeclarationOTP } from '@/lib/declarationDb';

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
    const { mobile } = body;

    if (!mobile) {
      return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 });
    }

    const result = await sendDeclarationOTP(mobile, organizationId, access.user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in sendDeclarationOTP API:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP.' },
      { status: 400 }
    );
  }
}

