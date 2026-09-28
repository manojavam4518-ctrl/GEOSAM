import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import {
  getPlatformLedgerConfig,
  normalizeFieldConfig,
  REFERENCE_LEDGER_FIELDS,
  LedgerFieldConfig,
} from '@/lib/cashLedger';

async function checkAdminAuth(req: NextRequest): Promise<
  | { authorized: false; response: NextResponse }
  | { authorized: true; user: any }
> {
  const token = req.cookies.get('session_token')?.value;
  if (!token) {
    return { authorized: false, response: NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 }) };
  }

  const verified = await verifyToken(token);
  if (!verified) {
    return { authorized: false, response: NextResponse.json({ error: 'Session expired.' }, { status: 401 }) };
  }

  const session = await verifyDeviceSession(verified.sessionToken);
  if (!session || session.user.role !== 'ADMIN') {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 }),
    };
  }

  return { authorized: true, user: session.user };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await checkAdminAuth(req);
    if (!auth.authorized) return auth.response;

    const config = await getPlatformLedgerConfig();

    return NextResponse.json({
      success: true,
      config,
      fields: config.fields,
      referenceDefaults: REFERENCE_LEDGER_FIELDS,
    });
  } catch (error: any) {
    console.error('Super Admin Ledger Fields GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await checkAdminAuth(req);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { fields, syncToOrganizations } = body;

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Ledger must contain at least one field.' },
        { status: 400 }
      );
    }

    // Normalize and sanitize fields
    const sanitizedFields: LedgerFieldConfig[] = fields.map((f: any, idx: number) =>
      normalizeFieldConfig(f, idx)
    );

    // Ensure order is sequential
    sanitizedFields.forEach((f, idx) => {
      f.order = idx;
    });

    // Save platform master configuration
    const updated = await (prisma as any).platformLedgerConfig.upsert({
      where: { key: 'COUNTER_CASH_LEDGER' },
      update: {
        fields: sanitizedFields,
        updatedAt: new Date(),
      },
      create: {
        key: 'COUNTER_CASH_LEDGER',
        name: 'Counter Cash Ledger',
        fields: sanitizedFields,
      },
    });

    // Optionally or by default sync to organization ledger configs
    if (syncToOrganizations !== false) {
      await (prisma as any).cashLedgerConfig.updateMany({
        data: {
          columns: sanitizedFields,
        },
      });
    }

    // Record audit log
    await recordAuditLog({
      action: 'CASH_LEDGER_FIELDS_UPDATED',
      userId: auth.user.id,
      userEmail: auth.user.email,
      relatedRecordId: updated.id,
      metadata: {
        fieldCount: sanitizedFields.length,
        fields: sanitizedFields.map((f) => ({ key: f.key, name: f.name, type: f.type, required: f.required })),
        syncToOrganizations: syncToOrganizations !== false,
      },
    });

    return NextResponse.json({
      success: true,
      fields: sanitizedFields,
      message: 'Ledger fields configured successfully.',
    });
  } catch (error: any) {
    console.error('Super Admin Ledger Fields PUT Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminAuth(req);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    if (body.action === 'RESET_DEFAULTS') {
      const updated = await (prisma as any).platformLedgerConfig.upsert({
        where: { key: 'COUNTER_CASH_LEDGER' },
        update: {
          fields: REFERENCE_LEDGER_FIELDS,
          updatedAt: new Date(),
        },
        create: {
          key: 'COUNTER_CASH_LEDGER',
          name: 'Counter Cash Ledger',
          fields: REFERENCE_LEDGER_FIELDS,
        },
      });

      await (prisma as any).cashLedgerConfig.updateMany({
        data: {
          columns: REFERENCE_LEDGER_FIELDS,
        },
      });

      await recordAuditLog({
        action: 'CASH_LEDGER_FIELDS_RESET',
        userId: auth.user.id,
        userEmail: auth.user.email,
        relatedRecordId: updated.id,
        metadata: {
          referenceCount: REFERENCE_LEDGER_FIELDS.length,
        },
      });

      return NextResponse.json({
        success: true,
        fields: REFERENCE_LEDGER_FIELDS,
        message: 'Ledger structure reset to reference defaults successfully.',
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Super Admin Ledger Fields POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
