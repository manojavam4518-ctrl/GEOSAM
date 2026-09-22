import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import { getOrganizationLedgerConfig, calculateLedgerBalances } from '@/lib/cashLedger';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'COUNTER_CASH_LEDGER');
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

    // Date filtering logic
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
    // preset === 'all' has no date bounds

    const dateFilter: any = {};
    if (start) dateFilter.gte = start;
    if (end) dateFilter.lte = end;

    // Search query across text columns
    const where: any = {
      organizationId,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    };

    if (search) {
      where.OR = [
        { receivedFrom: { contains: search, mode: 'insensitive' } },
        { paidTo: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
        { createdByName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [config, rawEntries] = await Promise.all([
      getOrganizationLedgerConfig(organizationId),
      (prisma as any).cashLedgerEntry.findMany({
        where,
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const { entries, summary } = calculateLedgerBalances(rawEntries, config.initialCashInHand);

    return NextResponse.json({
      success: true,
      entries,
      columns: config.columns,
      summary,
      config: {
        id: config.id,
        initialCashInHand: config.initialCashInHand,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Cash Ledger GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'COUNTER_CASH_LEDGER');
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
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

    const parsedCashReceived = Math.max(0, Number(cashReceived) || 0);
    const parsedPaidAmount = Math.max(0, Number(paidAmount) || 0);
    const parsedBankDeposit = Math.max(0, Number(bankDeposit) || 0);

    const entryDate = date ? new Date(date) : new Date();

    const newEntry = await (prisma as any).cashLedgerEntry.create({
      data: {
        organizationId,
        createdById: access.user.id,
        createdByName: access.user.name,
        date: entryDate,
        cashReceived: parsedCashReceived,
        receivedFrom: receivedFrom?.trim() || null,
        purpose: purpose?.trim() || null,
        paidTo: paidTo?.trim() || null,
        paidAmount: parsedPaidAmount,
        bankDeposit: parsedBankDeposit,
        remarks: remarks?.trim() || null,
        customFields: customFields || null,
      },
    });

    // Record audit log
    await recordAuditLog({
      action: 'CASH_LEDGER_ENTRY_CREATED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: newEntry.id,
      metadata: {
        date: newEntry.date,
        cashReceived: parsedCashReceived,
        paidAmount: parsedPaidAmount,
        bankDeposit: parsedBankDeposit,
        receivedFrom: newEntry.receivedFrom,
        paidTo: newEntry.paidTo,
      },
    });

    return NextResponse.json({
      success: true,
      entry: newEntry,
    });
  } catch (error: any) {
    console.error('Cash Ledger POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
