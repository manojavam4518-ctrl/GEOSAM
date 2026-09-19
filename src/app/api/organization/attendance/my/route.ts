import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';

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

    const user = access.user;

    // Resolve or link Employee record
    let employee = await prisma.employee.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { userId: user.id },
          { email: user.email.toLowerCase() },
        ],
      },
    });

    if (!employee) {
      const count = await prisma.employee.count({ where: { organizationId: orgId } });
      employee = await prisma.employee.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          employeeId: `EMP-${String(1001 + count).padStart(4, '0')}`,
          name: user.name,
          mobile: user.mobile,
          email: user.email.toLowerCase(),
          designation: user.assignedRoleName || 'Staff Member',
          department: 'Operations',
          status: 'ACTIVE',
        },
      });
    } else if (!employee.userId) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { userId: user.id },
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's record
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Monthly records (current month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyAttendances = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({
      success: true,
      employee,
      todayAttendance: todayAttendance || null,
      monthlyAttendances,
    });
  } catch (error: any) {
    console.error('My Attendance GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
