import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import {
  getOrganizationSalesPaymentLedgerConfig,
  calculateSalesPaymentLedgerTotals,
  validateSalesPaymentEntryData,
  extractSalesPaymentRowValue,
  getCurrentMonthYearString,
  SALES_PAYMENT_LEDGER_MODULE_KEY,
} from '@/lib/salesPaymentLedger';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, SALES_PAYMENT_LEDGER_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const preset = searchParams.get('preset') || 'this_month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Date filtering bounds
    let start: Date | undefined;
    let end: Date | undefined;
    const now = new Date();

    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'this_week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - diffToMonday), 23, 59, 59, 999);
    } else if (preset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'custom' || startDateParam || endDateParam) {
      if (startDateParam) {
        start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
      }
      if (endDateParam) {
        end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
      }
    }

    const dateFilter: any = {};
    if (start) dateFilter.gte = start;
    if (end) dateFilter.lte = end;

    const where: any = {
      organizationId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    };

    const [config, rawEntries] = await Promise.all([
      getOrganizationSalesPaymentLedgerConfig(organizationId),
      (prisma as any).salesPaymentLedgerEntry.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    // Normalize each entry's row data using extractSalesPaymentRowValue
    let filteredEntries = rawEntries.map((e: any) => {
      const rawData = (e.data as Record<string, any>) || {};
      const normalizedData: Record<string, any> = { ...rawData };

      config.fields.forEach((f) => {
        normalizedData[f.key] = extractSalesPaymentRowValue(rawData, e, f.key);
      });

      return {
        ...e,
        data: normalizedData,
      };
    });

    // Apply Search across configured columns and text
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredEntries = filteredEntries.filter((entry: any) => {
        if (
          entry.customerName?.toLowerCase().includes(lowerSearch) ||
          entry.invoiceNumber?.toLowerCase().includes(lowerSearch) ||
          entry.customerType?.toLowerCase().includes(lowerSearch) ||
          entry.paymentReceivedMode?.toLowerCase().includes(lowerSearch) ||
          entry.chequeClearanceStatus?.toLowerCase().includes(lowerSearch) ||
          entry.remarks?.toLowerCase().includes(lowerSearch) ||
          entry.createdByName?.toLowerCase().includes(lowerSearch)
        ) {
          return true;
        }

        const dataValues = Object.values(entry.data || {});
        for (const val of dataValues) {
          if (val !== null && val !== undefined) {
            if (String(val).toLowerCase().includes(lowerSearch)) return true;
          }
        }
        return false;
      });
    }

    // Apply column dropdown filters
    for (const [paramKey, paramVal] of searchParams.entries()) {
      if (['preset', 'startDate', 'endDate', 'search'].includes(paramKey)) continue;
      if (paramVal && paramVal !== 'ALL') {
        filteredEntries = filteredEntries.filter((entry: any) => {
          const cellVal = extractSalesPaymentRowValue(entry.data, entry, paramKey);
          return String(cellVal).toUpperCase() === paramVal.toUpperCase();
        });
      }
    }

    // Compute Formula Totals & Mode Breakdowns
    const summary = calculateSalesPaymentLedgerTotals(filteredEntries, config.fields);

    return NextResponse.json({
      success: true,
      entries: filteredEntries,
      columns: config.columns,
      fields: config.fields,
      summary,
      config: {
        id: config.id,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Sales Payment Ledger GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, SALES_PAYMENT_LEDGER_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const body = await req.json();
    const rowData: Record<string, any> = body.data || body;

    // Load active ledger configuration
    const config = await getOrganizationSalesPaymentLedgerConfig(organizationId);

    // Strict backend validation for required fields
    const validation = validateSalesPaymentEntryData(rowData, config.fields);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Extract typed field values
    const customerName = extractSalesPaymentRowValue(rowData, rowData, 'customer_name');
    const invoiceNumber = extractSalesPaymentRowValue(rowData, rowData, 'invoice_number');
    const invoiceMonth = extractSalesPaymentRowValue(rowData, rowData, 'invoice_month');
    const customerType = extractSalesPaymentRowValue(rowData, rowData, 'customer_type');
    const paymentMode = extractSalesPaymentRowValue(rowData, rowData, 'payment_received_mode');
    const chequeStatus = extractSalesPaymentRowValue(rowData, rowData, 'cheque_clearance_status');
    const totalAmount = Number(extractSalesPaymentRowValue(rowData, rowData, 'total_invoice_amount')) || 0;

    let entryDate = new Date();
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

    const newEntry = await (prisma as any).salesPaymentLedgerEntry.create({
      data: {
        organizationId,
        createdById: access.user.id,
        createdByName: access.user.name,
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
      action: 'SALES_PAYMENT_LEDGER_ROW_CREATED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: newEntry.id,
      metadata: {
        date: newEntry.date,
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
        ...newEntry,
        data: rowData,
      },
      message: 'Ledger entry saved successfully.',
    });
  } catch (error: any) {
    console.error('Sales Payment Ledger POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
