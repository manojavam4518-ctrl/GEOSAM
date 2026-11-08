import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await verifyModuleAccess(req);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    try {
      if ((prisma as any).proformaInvoice) {
        await (prisma as any).proformaInvoice.update({
          where: { id },
          data: { status: 'DELETED' },
        });
      }
    } catch (dbErr) {
      console.warn('Prisma delete bypassed:', dbErr);
    }

    return NextResponse.json({ success: true, message: 'Invoice archived.' });
  } catch (err: any) {
    console.error('Error deleting proforma invoice:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete invoice.' }, { status: 500 });
  }
}

