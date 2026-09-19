import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyModuleAccess } from '@/lib/modulePermissions';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'EMPLOYEE_MANAGEMENT');
    if (!access.authorized) {
      return access.response!;
    }

    const orgId = access.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: any = { organizationId: orgId };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            attendances: true,
            salaries: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      employees,
    });
  } catch (error: any) {
    console.error('Employees GET Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'EMPLOYEE_MANAGEMENT');
    if (!access.authorized) {
      return access.response!;
    }

    const orgId = access.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { name, mobile, email, designation, department, basicSalary, joiningDate } = await req.json();

    if (!name || !mobile) {
      return NextResponse.json({ error: 'Employee name and mobile number are required.' }, { status: 400 });
    }

    // Auto-generate employee sequence ID (e.g. EMP-1001)
    const empCount = await prisma.employee.count({ where: { organizationId: orgId } });
    const employeeId = `EMP-${String(1001 + empCount).padStart(4, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        organizationId: orgId,
        employeeId,
        name,
        mobile,
        email: email || null,
        designation: designation || 'Employee',
        department: department || 'General',
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        basicSalary: basicSalary ? parseFloat(basicSalary) : 0,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Employee registered successfully.',
      employee,
    });
  } catch (error: any) {
    console.error('Employees POST Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'EMPLOYEE_MANAGEMENT');
    if (!access.authorized) {
      return access.response!;
    }

    const orgId = access.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found for this account.' }, { status: 400 });
    }

    const { id, name, mobile, email, designation, department, basicSalary, status } = await req.json();

    if (!id || !name || !mobile) {
      return NextResponse.json({ error: 'Employee ID, name, and mobile are required.' }, { status: 400 });
    }

    const existing = await prisma.employee.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employee record not found or access denied.' }, { status: 404 });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        mobile,
        email: email || null,
        designation: designation || 'Employee',
        department: department || 'General',
        basicSalary: basicSalary !== undefined ? parseFloat(basicSalary) : existing.basicSalary,
        status: status || existing.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Employee details updated successfully.',
      employee: updatedEmployee,
    });
  } catch (error: any) {
    console.error('Employees PUT Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
