import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, hashPassword, comparePassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // 1. Session Verification
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    const { name, mobile, company, currentPassword, newPassword } = await req.json();

    if (!name || !mobile || !company) {
      return NextResponse.json({ error: 'Name, mobile and company are required.' }, { status: 400 });
    }

    const dataToUpdate: any = {
      name,
      mobile,
      company,
    };

    // If updating password
    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      const match = await comparePassword(currentPassword, user.password);
      if (!match) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
      }

      dataToUpdate.password = await hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        name: updatedUser.name,
        mobile: updatedUser.mobile,
        company: updatedUser.company,
      },
    });
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
