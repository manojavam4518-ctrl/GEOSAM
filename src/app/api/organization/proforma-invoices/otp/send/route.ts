import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { sendProformaInvoiceOTP } from '@/lib/proformaInvoiceOtp';

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
    const { contact } = body;

    if (!contact) {
      return NextResponse.json({ error: 'Consignee contact number or email is required.' }, { status: 400 });
    }

    const result = await sendProformaInvoiceOTP(contact, organizationId, access.user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in sendProformaInvoiceOTP API:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send verification code.' },
      { status: 400 }
    );
  }
}

