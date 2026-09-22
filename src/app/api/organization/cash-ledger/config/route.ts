import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import { getOrganizationLedgerConfig, DEFAULT_LEDGER_COLUMNS, LedgerColumnConfig } from '@/lib/cashLedger';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'COUNTER_CASH_LEDGER');
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context missing.' }, { status: 400 });
    }

    const config = await getOrganizationLedgerConfig(organizationId);

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error('Cash Ledger Config GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'COUNTER_CASH_LEDGER');
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // Strictly restrict ledger structure and column customization to GEO TRANSIT Super Admin (ADMIN).
    // Company users (ORG_ADMIN, OWNER, MEMBER) are strictly prohibited from altering ledger structure.
    if (access.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error: 'Forbidden: Only GEO TRANSIT Super Admin can modify the ledger structure and column configurations.',
          code: 'SUPER_ADMIN_REQUIRED',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { columns, initialCashInHand, targetOrganizationId } = body;

    const organizationId = targetOrganizationId || access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context missing.' }, { status: 400 });
    }

    if (!Array.isArray(columns)) {
      return NextResponse.json({ error: 'Columns must be a valid array.' }, { status: 400 });
    }

    // Protect system-critical calculation columns:
    // date, cashReceived, paidAmount, bankDeposit, cashInHand must remain in columns list
    const criticalKeys = ['date', 'cashReceived', 'paidAmount', 'bankDeposit', 'cashInHand'];
    const presentKeys = new Set(columns.map((c: any) => c.key));

    for (const key of criticalKeys) {
      if (!presentKeys.has(key)) {
        const defaultCol = DEFAULT_LEDGER_COLUMNS.find((dc) => dc.key === key);
        if (defaultCol) {
          columns.push(defaultCol);
        }
      }
    }

    // Validate and normalize columns
    const sanitizedColumns: LedgerColumnConfig[] = columns.map((col: any, index: number) => {
      const isSystem = Boolean(col.isSystem || DEFAULT_LEDGER_COLUMNS.some((dc) => dc.key === col.key));
      const def = DEFAULT_LEDGER_COLUMNS.find((dc) => dc.key === col.key);

      return {
        id: col.id || `col_${Date.now()}_${index}`,
        key: col.key || `custom_${Date.now()}_${index}`,
        name: String(col.name || 'Untitled Column').trim(),
        type: ['TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'SELECT'].includes(col.type)
          ? col.type
          : (def?.type || 'TEXT'),
        isSystem,
        isCalculation: isSystem ? (def?.isCalculation || false) : false,
        calcRole: isSystem ? (def?.calcRole || 'NONE') : 'NONE',
        enabled: col.enabled !== undefined ? Boolean(col.enabled) : true,
        order: typeof col.order === 'number' ? col.order : index,
        required: Boolean(col.required),
      };
    });

    sanitizedColumns.sort((a, b) => a.order - b.order);

    const initialCash = initialCashInHand !== undefined ? Math.max(0, Number(initialCashInHand) || 0) : 0;

    const updatedConfig = await (prisma as any).cashLedgerConfig.upsert({
      where: { organizationId },
      update: {
        columns: sanitizedColumns,
        initialCashInHand: initialCash,
      },
      create: {
        organizationId,
        columns: sanitizedColumns,
        initialCashInHand: initialCash,
      },
    });

    await recordAuditLog({
      action: 'CASH_LEDGER_COLUMNS_UPDATED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: updatedConfig.id,
      metadata: {
        columnCount: sanitizedColumns.length,
        initialCashInHand: initialCash,
        columns: sanitizedColumns.map((c) => ({ key: c.key, name: c.name, enabled: c.enabled })),
      },
    });

    return NextResponse.json({
      success: true,
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error('Cash Ledger Config PUT Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
