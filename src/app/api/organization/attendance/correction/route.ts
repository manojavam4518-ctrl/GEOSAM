import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';

// POST: Staff requests attendance correction
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
    const { date, reason, requestedStatus } = await req.json();

    if (!date || !reason || !reason.trim()) {
      return NextResponse.json({ error: 'Date and correction reason are required.' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: targetDate,
          lt: nextDate,
        },
      },
    });

    let record;
    if (existing) {
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          correctionRequested: true,
          correctionReason: reason.trim(),
          correctionStatus: 'PENDING',
        },
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          organizationId: orgId,
          employeeId: employee.id,
          userId: user.id,
          date: targetDate,
          status: requestedStatus || 'PRESENT',
          correctionRequested: true,
          correctionReason: reason.trim(),
          correctionStatus: 'PENDING',
        },
      });
    }

    // Record Audit Log
    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: orgId,
      action: 'Attendance Correction Requested',
      relatedRecordId: record.id,
      metadata: {
        employeeId: employee.employeeId,
        targetDate: targetDate.toISOString(),
        reason: reason.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Correction request submitted. Awaiting Organization Admin review.',
      attendance: record,
    });
  } catch (error: any) {
    console.error('Attendance Correction POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

// PUT: Org Admin reviews & approves or rejects correction
export async function PUT(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'ATTENDANCE');
    if (!access.authorized) {
      return access.response!;
    }

    const user = access.user;
    if (user.role !== 'ORG_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Organization Administrators can approve or reject correction requests.' },
        { status: 403 }
      );
    }

    const orgId = access.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { attendanceId, decision, finalStatus, adminRemarks } = await req.json();

    if (!attendanceId || !['APPROVE', 'REJECT'].includes(decision)) {
      return NextResponse.json({ error: 'Attendance ID and valid decision (APPROVE or REJECT) are required.' }, { status: 400 });
    }

    const record = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!record || record.organizationId !== orgId) {
      return NextResponse.json({ error: 'Attendance record not found in your organization.' }, { status: 404 });
    }

    const isApproved = decision === 'APPROVE';
    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        correctionRequested: false,
        correctionStatus: isApproved ? 'APPROVED' : 'REJECTED',
        ...(isApproved && finalStatus ? { status: finalStatus } : {}),
        remarks: adminRemarks ? `${record.remarks ? record.remarks + ' | ' : ''}Correction ${decision}: ${adminRemarks}` : record.remarks,
      },
    });

    // Record Audit Log
    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: orgId,
      action: `Attendance Correction ${decision === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      relatedRecordId: updated.id,
      metadata: {
        attendanceId,
        decision,
        finalStatus: updated.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Correction request ${decision.toLowerCase()}d successfully.`,
      attendance: updated,
    });
  } catch (error: any) {
    console.error('Attendance Correction PUT Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
