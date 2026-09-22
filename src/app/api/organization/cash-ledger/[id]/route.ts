import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const access = await verifyModuleAccess(req, 'COUNTER_CASH_LEDGER');
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context missing.' }, { status: 400 });
    }

    const existing = await (prisma as any).cashLedgerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Ledger entry not found.' }, { status: 404 });
    }

    const body = await req.json();
    const {
      date,
      cashReceived,
      receivedFrom,
      purpose,
      paidTo,
      paidAmount,
      bankDeposit,
      remarks,
      customFields,
    } = body;

    const updatedData: any = {};
    if (date !== undefined) updatedData.date = new Date(date);
    if (cashReceived !== undefined) updatedData.cashReceived = Math.max(0, Number(cashReceived) || 0);
    if (receivedFrom !== undefined) updatedData.receivedFrom = receivedFrom ? String(receivedFrom).trim() : null;
    if (purpose !== undefined) updatedData.purpose = purpose ? String(purpose).trim() : null;
    if (paidTo !== undefined) updatedData.paidTo = paidTo ? String(paidTo).trim() : null;
    if (paidAmount !== undefined) updatedData.paidAmount = Math.max(0, Number(paidAmount) || 0);
    if (bankDeposit !== undefined) updatedData.bankDeposit = Math.max(0, Number(bankDeposit) || 0);
    if (remarks !== undefined) updatedData.remarks = remarks ? String(remarks).trim() : null;
    if (customFields !== undefined) updatedData.customFields = customFields;

    const updated = await (prisma as any).cashLedgerEntry.update({
      where: { id },
      data: updatedData,
    });

    await recordAuditLog({
      action: 'CASH_LEDGER_ENTRY_UPDATED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: id,
      metadata: {
        changes: updatedData,
      },
    });

    return NextResponse.json({
      success: true,
      entry: updated,
    });
  } catch (error: any) {
    console.error('Cash Ledger Entry PUT Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const access = await verifyModuleAccess(req, 'COUNTER_CASH_LEDGER');
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context missing.' }, { status: 400 });
    }

    const existing = await (prisma as any).cashLedgerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Ledger entry not found.' }, { status: 404 });
    }

    await (prisma as any).cashLedgerEntry.delete({
      where: { id },
    });

    await recordAuditLog({
      action: 'CASH_LEDGER_ENTRY_DELETED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: id,
      metadata: {
        deletedEntry: {
          date: existing.date,
          cashReceived: existing.cashReceived,
          paidAmount: existing.paidAmount,
          bankDeposit: existing.bankDeposit,
          purpose: existing.purpose,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ledger entry deleted successfully.',
    });
  } catch (error: any) {
    console.error('Cash Ledger Entry DELETE Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
