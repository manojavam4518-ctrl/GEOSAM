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

    // Resolve Employee record
    const employee = await prisma.employee.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { userId: user.id },
          { email: user.email.toLowerCase() },
        ],
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found.' }, { status: 404 });
    }

    // Server-generated timestamp
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (!record || !record.checkIn) {
      return NextResponse.json(
        { error: 'You must check in first before checking out.' },
        { status: 400 }
      );
    }

    if (record.checkOut) {
      return NextResponse.json(
        {
          error: 'You have already checked out today at ' + record.checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          attendance: record,
        },
        { status: 400 }
      );
    }

    // Calculate working hours
    const diffMs = now.getTime() - new Date(record.checkIn).getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const workingHours = `${hours}h ${minutes}m`;

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOut: now,
        workingHours,
      },
    });

    // Record Audit Log
    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: orgId,
      action: 'Attendance Check-Out',
      relatedRecordId: updated.id,
      metadata: {
        employeeId: employee.employeeId,
        checkInTime: record.checkIn.toISOString(),
        checkOutTime: now.toISOString(),
        workingHours,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Check-out recorded successfully. Total Working Hours: ${workingHours}.`,
      attendance: updated,
    });
  } catch (error: any) {
    console.error('Attendance Check-Out Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
