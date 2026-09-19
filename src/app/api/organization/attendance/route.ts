import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'ATTENDANCE');
    if (!access.authorized) {
      return access.response!;
    }

    const orgId = access.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    let attendances: any[] = [];

    if (dateStr) {
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      attendances = await prisma.attendance.findMany({
        where: {
          organizationId: orgId,
          date: {
            gte: targetDate,
            lt: nextDate,
          },
        },
      });
    } else if (monthStr && yearStr) {
      const month = parseInt(monthStr);
      const year = parseInt(yearStr);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      attendances = await prisma.attendance.findMany({
        where: {
          organizationId: orgId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    }

    const pendingCorrections = await prisma.attendance.findMany({
      where: {
        organizationId: orgId,
        correctionRequested: true,
      },
      include: {
        employee: {
          select: { id: true, name: true, employeeId: true, designation: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      employees,
      attendances,
      pendingCorrections,
    });
  } catch (error: any) {
    console.error('Attendance GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'ATTENDANCE');
    if (!access.authorized) {
      return access.response!;
    }

    const orgId = access.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const user = access.user;
    if (user.role !== 'ORG_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Marking bulk attendance is restricted to Organization Administrators.' },
        { status: 403 }
      );
    }

    const { date, records } = await req.json();

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Date and attendance records array are required.' }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const results = [];
    for (const rec of records) {
      if (!rec.employeeId || !rec.status) continue;

      const existing = await prisma.attendance.findFirst({
        where: {
          organizationId: orgId,
          employeeId: rec.employeeId,
          date: targetDate,
        },
      });

      if (existing) {
        const updated = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: rec.status,
            remarks: rec.remarks || null,
          },
        });
        results.push(updated);
      } else {
        const created = await prisma.attendance.create({
          data: {
            organizationId: orgId,
            employeeId: rec.employeeId,
            date: targetDate,
            status: rec.status,
            remarks: rec.remarks || null,
          },
        });
        results.push(created);
      }
    }

    // Record Audit Log
    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: orgId,
      action: `Saved Attendance for ${targetDate.toISOString().split('T')[0]} (${results.length} records marked)`,
      metadata: {
        date: targetDate.toISOString().split('T')[0],
        count: results.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance saved successfully.',
      count: results.length,
    });
  } catch (error: any) {
    console.error('Attendance POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
