import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { ensurePlatformModulesAndRolesSeeded } from '@/lib/modulePermissions';

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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [roles, allModules] = await Promise.all([
      (prisma as any).platformRole.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      }),
      (prisma as any).platformModule.findMany({
        select: { key: true, name: true, category: true, monthlyPrice: true, active: true },
      }),
    ]);

    const moduleMap = new Map(allModules.map((m: any) => [m.key, m]));

    // Enrich roles with detailed module info & calculated monthly rate
    const enrichedRoles = roles.map((role: any) => {
      const assignedModuleDetails = (role.moduleKeys || [])
        .map((k: string) => moduleMap.get(k))
        .filter(Boolean);

      const calculatedMonthlyRate = assignedModuleDetails
        .filter((m: any) => m.active)
        .reduce((sum: number, m: any) => sum + (m.monthlyPrice || 0), 0);

      return {
        ...role,
        modules: assignedModuleDetails,
        modulesCount: assignedModuleDetails.length,
        calculatedMonthlyRate,
      };
    });

    return NextResponse.json({
      success: true,
      roles: enrichedRoles,
      availableModules: allModules,
    });
  } catch (error: any) {
    console.error('Admin Roles GET Error:', error);
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

    const { id, name, description, moduleKeys, active } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
    }

    if (!Array.isArray(moduleKeys) || moduleKeys.length === 0) {
      return NextResponse.json({ error: 'Please assign at least one module to this role.' }, { status: 400 });
    }

    // Verify all moduleKeys exist in PlatformModule
    const validModules = await (prisma as any).platformModule.findMany({
      where: { key: { in: moduleKeys } },
      select: { key: true, active: true },
    });

    const validKeys = new Set(validModules.map((m: any) => m.key));
    const sanitizedKeys = moduleKeys.filter((k: string) => validKeys.has(k));

    if (sanitizedKeys.length === 0) {
      return NextResponse.json({ error: 'Selected modules are invalid or do not exist.' }, { status: 400 });
    }

    let role;
    if (id) {
      // Update existing role
      const existing = await (prisma as any).platformRole.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
      }

      // Check if new name conflicts with another role
      if (name.trim() !== existing.name) {
        const nameConflict = await (prisma as any).platformRole.findUnique({ where: { name: name.trim() } });
        if (nameConflict) {
          return NextResponse.json({ error: `A role with name '${name.trim()}' already exists.` }, { status: 400 });
        }
      }

      role = await (prisma as any).platformRole.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          moduleKeys: sanitizedKeys,
          active: active !== undefined ? Boolean(active) : existing.active,
        },
      });

      await prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          adminEmail: session.user.email,
          action: `Updated Role: ${role.name} (${sanitizedKeys.length} modules)`,
          relatedRecordId: role.id,
          metadata: { moduleKeys: sanitizedKeys, active: role.active },
        },
      });
    } else {
      // Create new role
      const nameConflict = await (prisma as any).platformRole.findUnique({ where: { name: name.trim() } });
      if (nameConflict) {
        return NextResponse.json({ error: `A role with name '${name.trim()}' already exists.` }, { status: 400 });
      }

      role = await (prisma as any).platformRole.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          moduleKeys: sanitizedKeys,
          active: active !== undefined ? Boolean(active) : true,
        },
      });

      await prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          adminEmail: session.user.email,
          action: `Created Role: ${role.name} (${sanitizedKeys.length} modules)`,
          relatedRecordId: role.id,
          metadata: { moduleKeys: sanitizedKeys, active: role.active },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Role '${role.name}' saved successfully.`,
      role,
    });
  } catch (error: any) {
    console.error('Admin Roles POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

    const { id, active } = await req.json();

    if (!id || active === undefined) {
      return NextResponse.json({ error: 'Role ID and active state are required.' }, { status: 400 });
    }

    const role = await (prisma as any).platformRole.update({
      where: { id },
      data: { active: Boolean(active) },
    });

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        adminEmail: session.user.email,
        action: `${role.active ? 'Activated' : 'Deactivated'} Role: ${role.name}`,
        relatedRecordId: role.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Role '${role.name}' is now ${role.active ? 'Active' : 'Inactive'}.`,
      role,
    });
  } catch (error: any) {
    console.error('Admin Roles PUT Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
