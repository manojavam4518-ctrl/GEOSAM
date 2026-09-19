import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { ensurePlatformModulesAndRolesSeeded } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    await ensurePlatformModulesAndRolesSeeded();

    const modules = await (prisma as any).platformModule.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      modules,
    });
  } catch (error: any) {
    console.error('Admin Modules GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const { id, key, name, monthlyPrice, active, description, category } = await req.json();

    if (!id && !key && !name) {
      return NextResponse.json({ error: 'Module name or key is required.' }, { status: 400 });
    }

    const priceNum = monthlyPrice !== undefined ? Math.max(0, parseFloat(monthlyPrice) || 0) : 0;
    const moduleKey = (key || name || '').toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    let moduleRecord;

    if (id) {
      const data: any = {};
      if (monthlyPrice !== undefined) data.monthlyPrice = priceNum;
      if (active !== undefined) data.active = Boolean(active);
      if (description !== undefined) data.description = description;
      if (name) data.name = name;

      moduleRecord = await (prisma as any).platformModule.update({
        where: { id },
        data,
      });

      await recordAuditLog({
        adminId: session.user.id,
        adminEmail: session.user.email,
        action: `Updated Module: ${moduleRecord.name} (Price: ₹${moduleRecord.monthlyPrice}/mo, Active: ${moduleRecord.active})`,
        relatedRecordId: moduleRecord.id,
        metadata: { key: moduleRecord.key, name: moduleRecord.name, monthlyPrice: moduleRecord.monthlyPrice, active: moduleRecord.active },
      });
    } else {
      // Check if module with key exists
      const existing = await (prisma as any).platformModule.findUnique({ where: { key: moduleKey } });
      if (existing) {
        const data: any = {};
        if (monthlyPrice !== undefined) data.monthlyPrice = priceNum;
        if (active !== undefined) data.active = Boolean(active);
        if (description !== undefined) data.description = description;
        if (name) data.name = name;

        moduleRecord = await (prisma as any).platformModule.update({
          where: { key: moduleKey },
          data,
        });

        await recordAuditLog({
          adminId: session.user.id,
          adminEmail: session.user.email,
          action: `Updated Module: ${moduleRecord.name}`,
          relatedRecordId: moduleRecord.id,
          metadata: { key: moduleRecord.key, name: moduleRecord.name, monthlyPrice: moduleRecord.monthlyPrice },
        });
      } else {
        // Create new module
        moduleRecord = await (prisma as any).platformModule.create({
          data: {
            key: moduleKey,
            name: name || moduleKey,
            description: description || `Platform module: ${name || moduleKey}`,
            category: category || 'LOGISTICS',
            monthlyPrice: priceNum,
            active: active !== undefined ? Boolean(active) : true,
          },
        });

        await recordAuditLog({
          adminId: session.user.id,
          adminEmail: session.user.email,
          action: `Created Module: ${moduleRecord.name} (Key: ${moduleRecord.key}, Price: ₹${moduleRecord.monthlyPrice}/mo)`,
          relatedRecordId: moduleRecord.id,
          metadata: { key: moduleRecord.key, name: moduleRecord.name, monthlyPrice: moduleRecord.monthlyPrice },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Module '${moduleRecord.name}' saved successfully.`,
      module: moduleRecord,
    });
  } catch (error: any) {
    console.error('Admin Modules POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
