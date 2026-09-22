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
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    await ensurePlatformModulesAndRolesSeeded();

    const isSuperAdmin = session.user.role === 'ADMIN';
    const modules = await (prisma as any).platformModule.findMany({
      where: isSuperAdmin ? undefined : { active: true },
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

    const { id, key, name, monthlyPrice, price3Months, price6Months, price12Months, active, description, category } = await req.json();

    if (!id && !key && !name) {
      return NextResponse.json({ error: 'Module name or key is required.' }, { status: 400 });
    }

    const priceNum = monthlyPrice !== undefined ? Math.max(0, parseFloat(monthlyPrice) || 0) : 0;
    const p3Num = price3Months !== undefined ? Math.max(0, parseFloat(price3Months) || 0) : priceNum * 3;
    const p6Num = price6Months !== undefined ? Math.max(0, parseFloat(price6Months) || 0) : priceNum * 6;
    const p12Num = price12Months !== undefined ? Math.max(0, parseFloat(price12Months) || 0) : priceNum * 12;

    const moduleKey = (key || name || '').toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    let moduleRecord;

    if (id) {
      const data: any = {};
      if (monthlyPrice !== undefined) data.monthlyPrice = priceNum;
      if (price3Months !== undefined) data.price3Months = p3Num;
      if (price6Months !== undefined) data.price6Months = p6Num;
      if (price12Months !== undefined) data.price12Months = p12Num;
      if (active !== undefined) data.active = Boolean(active);
      if (description !== undefined) data.description = description;
      if (name) data.name = name;
      if (category) data.category = category;

      moduleRecord = await (prisma as any).platformModule.update({
        where: { id },
        data,
      });

      await recordAuditLog({
        adminId: session.user.id,
        adminEmail: session.user.email,
        action: `Updated Module: ${moduleRecord.name} (1M: ₹${moduleRecord.monthlyPrice}, 3M: ₹${moduleRecord.price3Months}, 6M: ₹${moduleRecord.price6Months}, 12M: ₹${moduleRecord.price12Months}, Active: ${moduleRecord.active})`,
        relatedRecordId: moduleRecord.id,
        metadata: {
          key: moduleRecord.key,
          name: moduleRecord.name,
          monthlyPrice: moduleRecord.monthlyPrice,
          price3Months: moduleRecord.price3Months,
          price6Months: moduleRecord.price6Months,
          price12Months: moduleRecord.price12Months,
          active: moduleRecord.active,
        },
      });
    } else {
      // Check if module with key exists
      const existing = await (prisma as any).platformModule.findUnique({ where: { key: moduleKey } });
      if (existing) {
        const data: any = {};
        if (monthlyPrice !== undefined) data.monthlyPrice = priceNum;
        if (price3Months !== undefined) data.price3Months = p3Num;
        if (price6Months !== undefined) data.price6Months = p6Num;
        if (price12Months !== undefined) data.price12Months = p12Num;
        if (active !== undefined) data.active = Boolean(active);
        if (description !== undefined) data.description = description;
        if (name) data.name = name;
        if (category) data.category = category;

        moduleRecord = await (prisma as any).platformModule.update({
          where: { key: moduleKey },
          data,
        });

        await recordAuditLog({
          adminId: session.user.id,
          adminEmail: session.user.email,
          action: `Updated Module: ${moduleRecord.name}`,
          relatedRecordId: moduleRecord.id,
          metadata: {
            key: moduleRecord.key,
            name: moduleRecord.name,
            monthlyPrice: moduleRecord.monthlyPrice,
            price3Months: moduleRecord.price3Months,
            price6Months: moduleRecord.price6Months,
            price12Months: moduleRecord.price12Months,
          },
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
            price3Months: p3Num,
            price6Months: p6Num,
            price12Months: p12Num,
            active: active !== undefined ? Boolean(active) : true,
          },
        });

        await recordAuditLog({
          adminId: session.user.id,
          adminEmail: session.user.email,
          action: `Created Module: ${moduleRecord.name} (Key: ${moduleRecord.key}, 1M: ₹${moduleRecord.monthlyPrice}, 3M: ₹${moduleRecord.price3Months})`,
          relatedRecordId: moduleRecord.id,
          metadata: {
            key: moduleRecord.key,
            name: moduleRecord.name,
            monthlyPrice: moduleRecord.monthlyPrice,
            price3Months: moduleRecord.price3Months,
            price6Months: moduleRecord.price6Months,
            price12Months: moduleRecord.price12Months,
          },
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
