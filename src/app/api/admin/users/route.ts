import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          company: true,
          role: true,
          status: true,
          calculationsCount: true,
          createdAt: true,
          subscriptions: {
            where: { status: 'ACTIVE', endDate: { gte: new Date() } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        ...u,
        hasActiveSubscription: u.subscriptions.length > 0,
        activeSubscription: u.subscriptions[0] || null,
      })),
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Admin Users GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { userId, status } = await req.json();

    if (!userId || !status || !['ACTIVE', 'DISABLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid user status updates.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot modify other administrator accounts.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    // If disabled, invalidate all active device sessions immediately!
    if (status === 'DISABLED') {
      await prisma.deviceSession.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
    }

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `${status === 'ACTIVE' ? 'Enabled' : 'Disabled'} User Account`,
        relatedRecordId: userId,
        metadata: { userEmail: user.email },
      },
    });

    return NextResponse.json({
      success: true,
      message: `User account has been ${status === 'ACTIVE' ? 'activated' : 'disabled'} successfully.`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        status: updatedUser.status,
      },
    });
  } catch (error: any) {
    console.error('Admin User status POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
