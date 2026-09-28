import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import { getOrganizationLedgerConfig, validateLedgerEntryData, extractRowFieldValue } from '@/lib/cashLedger';

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

    // Verify organization ownership
    const existing = await (prisma as any).cashLedgerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Ledger entry not found.' }, { status: 404 });
    }

    const body = await req.json();
    const rowData: Record<string, any> = body.data || body;

    // Load active config and run backend validation
    const config = await getOrganizationLedgerConfig(organizationId);
    const validation = validateLedgerEntryData(rowData, config.fields);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const customerName = extractRowFieldValue(rowData, rowData, 'customer_name');
    const invoiceNumber = extractRowFieldValue(rowData, rowData, 'invoice_number');
    const invoiceMonth = extractRowFieldValue(rowData, rowData, 'invoice_month');
    const totalAmount = Number(extractRowFieldValue(rowData, rowData, 'total_invoice_amount')) || 0;

    let entryDate = existing.date;
    if (rowData.date) {
      entryDate = new Date(rowData.date);
    } else if (invoiceMonth && typeof invoiceMonth === 'string') {
      const parts = invoiceMonth.split('_');
      if (parts.length === 2) {
        const monthNames = [
          'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
          'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
        ];
        const mIdx = monthNames.indexOf(parts[0].toUpperCase());
        const year = parseInt(parts[1], 10);
        if (mIdx !== -1 && !isNaN(year)) {
          entryDate = new Date(year, mIdx, 1);
        }
      }
    }

    const updated = await (prisma as any).cashLedgerEntry.update({
      where: { id },
      data: {
        date: entryDate,
        cashReceived: totalAmount,
        receivedFrom: customerName || null,
        purpose: invoiceNumber || null,
        paidTo: rowData.paidTo || null,
        paidAmount: Number(rowData.paidAmount) || 0,
        bankDeposit: Number(rowData.bankDeposit) || 0,
        remarks: rowData.remarks || null,
        data: rowData,
        customFields: rowData,
      },
    });

    await recordAuditLog({
      action: 'CASH_LEDGER_ROW_UPDATED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: id,
      metadata: {
        updatedFields: Object.keys(rowData),
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        ...updated,
        data: rowData,
      },
      message: 'Ledger row updated successfully.',
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

    // Strict organization ownership check
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
      action: 'CASH_LEDGER_ROW_DELETED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: id,
      metadata: {
        deletedEntry: {
          id: existing.id,
          date: existing.date,
          receivedFrom: existing.receivedFrom,
          cashReceived: existing.cashReceived,
          data: existing.data,
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
