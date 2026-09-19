import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';

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

    // Server-generated timestamp
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Enforce one attendance record per employee per date
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existing && existing.checkIn) {
      return NextResponse.json(
        {
          error: 'You have already checked in today at ' + existing.checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          attendance: existing,
        },
        { status: 400 }
      );
    }

    let record;
    if (existing) {
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: 'PRESENT',
          checkIn: now,
          userId: user.id,
        },
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          organizationId: orgId,
          employeeId: employee.id,
          userId: user.id,
          date: today,
          status: 'PRESENT',
          checkIn: now,
        },
      });
    }

    // Record Audit Log
    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: orgId,
      action: 'Attendance Check-In',
      relatedRecordId: record.id,
      metadata: {
        employeeId: employee.employeeId,
        checkInTime: now.toISOString(),
        date: today.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Check-in recorded successfully.',
      attendance: record,
    });
  } catch (error: any) {
    console.error('Attendance Check-In Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
