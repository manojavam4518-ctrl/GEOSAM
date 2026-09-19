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
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    if (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Available roles are accessible only by Organization Administrators.' },
        { status: 403 }
      );
    }

    await ensurePlatformModulesAndRolesSeeded();

    // Fetch only active roles and active modules
    const [roles, activeModules] = await Promise.all([
      (prisma as any).platformRole.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      (prisma as any).platformModule.findMany({
        where: { active: true },
        select: { key: true, name: true, description: true, category: true, monthlyPrice: true },
      }),
    ]);

    const moduleMap = new Map(activeModules.map((m: any) => [m.key, m]));

    // Map each role to its active modules and monthly rate
    const enrichedRoles = roles
      .map((role: any) => {
        const modules = (role.moduleKeys || [])
          .map((k: string) => moduleMap.get(k))
          .filter(Boolean);

        const monthlyRate = modules.reduce((sum: number, m: any) => sum + (m.monthlyPrice || 0), 0);

        return {
          id: role.id,
          name: role.name,
          description: role.description,
          modules,
          modulesCount: modules.length,
          monthlyRate,
        };
      })
      .filter((r: any) => r.modules.length > 0); // Only roles that have active modules

    return NextResponse.json({
      success: true,
      roles: enrichedRoles,
    });
  } catch (error: any) {
    console.error('Organization Roles GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
