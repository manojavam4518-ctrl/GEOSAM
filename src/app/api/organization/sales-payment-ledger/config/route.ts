import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';
import {
  getOrganizationSalesPaymentLedgerConfig,
  normalizeSalesPaymentField,
  SalesPaymentFieldConfig,
  REFERENCE_SALES_PAYMENT_FIELDS,
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
      return NextResponse.json({ error: 'Organization context missing.' }, { status: 400 });
    }

    const isOrgAdmin = ['ORG_ADMIN', 'OWNER', 'ADMIN'].includes(access.user.role);
    const config = await getOrganizationSalesPaymentLedgerConfig(organizationId);

    return NextResponse.json({
      success: true,
      config,
      fields: config.fields,
      columns: config.columns,
      isOrgAdmin,
    });
  } catch (error: any) {
    console.error('Sales Payment Ledger Config GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, SALES_PAYMENT_LEDGER_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // Strict Permission check: Only Organization Admin (ORG_ADMIN, OWNER, or platform ADMIN) can configure columns.
    const isOrgAdmin = ['ORG_ADMIN', 'OWNER', 'ADMIN'].includes(access.user.role);
    if (!isOrgAdmin) {
      return NextResponse.json(
        {
          error: 'Forbidden: Only Organization Admin can configure Sales Payment Collection Ledger columns.',
          code: 'ORG_ADMIN_REQUIRED',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fields, columns, targetOrganizationId } = body;

    // Strict multi-tenant isolation:
    // Non-platform admins can strictly only configure their own organizationId.
    const organizationId =
      access.user.role === 'ADMIN' && targetOrganizationId
        ? targetOrganizationId
        : access.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context missing.' }, { status: 400 });
    }

    const rawFields = fields || columns;
    if (!Array.isArray(rawFields) || rawFields.length === 0) {
      return NextResponse.json({ error: 'Ledger must contain at least one field.' }, { status: 400 });
    }

    const sanitizedFields: SalesPaymentFieldConfig[] = rawFields.map((f: any, idx: number) =>
      normalizeSalesPaymentField(f, idx)
    );

    sanitizedFields.forEach((f, idx) => {
      f.order = idx;
    });

    const updatedConfig = await (prisma as any).salesPaymentLedgerConfig.upsert({
      where: { organizationId },
      update: {
        columns: sanitizedFields,
      },
      create: {
        organizationId,
        columns: sanitizedFields,
      },
    });

    await recordAuditLog({
      action: 'SALES_PAYMENT_LEDGER_CONFIG_UPDATED',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: updatedConfig.id,
      metadata: {
        fieldCount: sanitizedFields.length,
        fields: sanitizedFields.map((f) => ({ key: f.key, name: f.name, active: f.active, type: f.type })),
      },
    });

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      fields: sanitizedFields,
      columns: sanitizedFields,
      message: 'Sales Payment Collection Ledger configuration updated successfully.',
    });
  } catch (error: any) {
    console.error('Sales Payment Ledger Config PUT Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, SALES_PAYMENT_LEDGER_MODULE_KEY);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const isOrgAdmin = ['ORG_ADMIN', 'OWNER', 'ADMIN'].includes(access.user.role);
    if (!isOrgAdmin) {
      return NextResponse.json(
        {
          error: 'Forbidden: Only Organization Admin can reset ledger columns.',
          code: 'ORG_ADMIN_REQUIRED',
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const organizationId =
      access.user.role === 'ADMIN' && body.targetOrganizationId
        ? body.targetOrganizationId
        : access.organizationId;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context missing.' }, { status: 400 });
    }

    const updatedConfig = await (prisma as any).salesPaymentLedgerConfig.upsert({
      where: { organizationId },
      update: {
        columns: REFERENCE_SALES_PAYMENT_FIELDS,
      },
      create: {
        organizationId,
        columns: REFERENCE_SALES_PAYMENT_FIELDS,
      },
    });

    await recordAuditLog({
      action: 'SALES_PAYMENT_LEDGER_CONFIG_RESET',
      userId: access.user.id,
      userEmail: access.user.email,
      organizationId,
      relatedRecordId: updatedConfig.id,
      metadata: {
        fieldCount: REFERENCE_SALES_PAYMENT_FIELDS.length,
      },
    });

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      fields: REFERENCE_SALES_PAYMENT_FIELDS,
      columns: REFERENCE_SALES_PAYMENT_FIELDS,
      message: 'Sales Payment Collection Ledger reset to reference defaults successfully.',
    });
  } catch (error: any) {
    console.error('Sales Payment Ledger Config Reset Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
