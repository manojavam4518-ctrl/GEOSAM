import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { verifyProformaInvoiceOTP } from '@/lib/proformaInvoiceOtp';

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
    const { contact, code } = body;

    if (!contact || !code) {
      return NextResponse.json(
        { error: 'Contact and 6-digit verification code are required.' },
        { status: 400 }
      );
    }

    const result = await verifyProformaInvoiceOTP(contact, code, organizationId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in verifyProformaInvoiceOTP API:', err);
    return NextResponse.json(
      { error: err.message || 'Verification failed.' },
      { status: 400 }
    );
  }
}

