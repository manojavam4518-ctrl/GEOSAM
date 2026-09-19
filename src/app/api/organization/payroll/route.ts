import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'PAYROLL');
    if (!access.authorized) {
      return access.response!;
    }

    const orgId = access.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    const salaryRecords = await prisma.salaryRecord.findMany({
      where: {
        organizationId: orgId,
        month,
        year,
      },
      include: {
        employee: true,
      },
    });

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    return NextResponse.json({
      success: true,
      month,
      year,
      organization,
      employees,
      salaryRecords,
    });
  } catch (error: any) {
    console.error('Payroll GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'PAYROLL');
    if (!access.authorized) {
      return access.response!;
    }

    const orgId = access.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { employeeId, month, year, basicSalary, allowances, deductions, paymentStatus, remarks } = await req.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json({ error: 'Employee ID, month, and year are required.' }, { status: 400 });
    }

    const basic = parseFloat(basicSalary || 0);
    const allow = parseFloat(allowances || 0);
    const ded = parseFloat(deductions || 0);
    const gross = basic + allow;
    const net = gross - ded;

    const existing = await prisma.salaryRecord.findFirst({
      where: {
        organizationId: orgId,
        employeeId,
        month: parseInt(month),
        year: parseInt(year),
      },
    });

    let salaryRecord;
    if (existing) {
      salaryRecord = await prisma.salaryRecord.update({
        where: { id: existing.id },
        data: {
          basicSalary: basic,
          allowances: allow,
          deductions: ded,
          grossSalary: gross,
          netSalary: net,
          paymentStatus: paymentStatus || existing.paymentStatus,
          paymentDate: paymentStatus === 'PAID' ? new Date() : existing.paymentDate,
          remarks: remarks || null,
        },
        include: { employee: true },
      });
    } else {
      salaryRecord = await prisma.salaryRecord.create({
        data: {
          organizationId: orgId,
          employeeId,
          month: parseInt(month),
          year: parseInt(year),
          basicSalary: basic,
          allowances: allow,
          deductions: ded,
          grossSalary: gross,
          netSalary: net,
          paymentStatus: paymentStatus || 'UNPAID',
          paymentDate: paymentStatus === 'PAID' ? new Date() : null,
          remarks: remarks || null,
        },
        include: { employee: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Salary record saved successfully.',
      salaryRecord,
    });
  } catch (error: any) {
    console.error('Payroll POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
