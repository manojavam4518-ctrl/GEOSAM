import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import {
  getOrganizationSalesPaymentLedgerConfig,
  validateSalesPaymentEntryData,
  extractSalesPaymentRowValue,
  SALES_PAYMENT_LEDGER_MODULE_KEY,
} from '@/lib/salesPaymentLedger';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await verifyModuleAccess(req, SALES_PAYMENT_LEDGER_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const existing = await (prisma as any).salesPaymentLedgerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Ledger entry not found or unauthorized.' }, { status: 404 });
    }

    const body = await req.json();
    const rowData: Record<string, any> = body.data || body;

    const config = await getOrganizationSalesPaymentLedgerConfig(organizationId);
    const validation = validateSalesPaymentEntryData(rowData, config.fields);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const customerName = extractSalesPaymentRowValue(rowData, rowData, 'customer_name');
    const invoiceNumber = extractSalesPaymentRowValue(rowData, rowData, 'invoice_number');
    const invoiceMonth = extractSalesPaymentRowValue(rowData, rowData, 'invoice_month');
    const customerType = extractSalesPaymentRowValue(rowData, rowData, 'customer_type');
    const paymentMode = extractSalesPaymentRowValue(rowData, rowData, 'payment_received_mode');
    const chequeStatus = extractSalesPaymentRowValue(rowData, rowData, 'cheque_clearance_status');
    const totalAmount = Number(extractSalesPaymentRowValue(rowData, rowData, 'total_invoice_amount')) || 0;

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

    const updatedEntry = await (prisma as any).salesPaymentLedgerEntry.update({
      where: { id },
      data: {
        date: entryDate,
        invoiceMonth: invoiceMonth || null,
        customerType: customerType || null,
        customerName: customerName || null,
        invoiceNumber: invoiceNumber || null,
        totalInvoiceAmount: totalAmount,
        paymentReceivedMode: paymentMode || null,
        chequeClearanceStatus: chequeStatus || null,
        remarks: rowData.remarks || null,
        data: rowData,
      },
    });

    await recordAuditLog({
      action: 'SALES_PAYMENT_LEDGER_ROW_UPDATED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: id,
      metadata: {
        date: updatedEntry.date,
        invoiceMonth,
        customerType,
        customerName,
        invoiceNumber,
        totalInvoiceAmount: totalAmount,
        paymentReceivedMode: paymentMode,
        chequeClearanceStatus: chequeStatus,
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        ...updatedEntry,
        data: rowData,
      },
      message: 'Ledger entry updated successfully.',
    });
  } catch (error: any) {
    console.error('Sales Payment Ledger PUT Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await verifyModuleAccess(req, SALES_PAYMENT_LEDGER_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const existing = await (prisma as any).salesPaymentLedgerEntry.findUnique({
      where: { id },
    });

    if (!existing || existing.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Ledger entry not found or unauthorized.' }, { status: 404 });
    }

    await (prisma as any).salesPaymentLedgerEntry.delete({
      where: { id },
    });

    await recordAuditLog({
      action: 'SALES_PAYMENT_LEDGER_ROW_DELETED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: id,
      metadata: {
        customerName: existing.customerName,
        invoiceNumber: existing.invoiceNumber,
        totalInvoiceAmount: existing.totalInvoiceAmount,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ledger entry deleted successfully.',
    });
  } catch (error: any) {
    console.error('Sales Payment Ledger DELETE Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
