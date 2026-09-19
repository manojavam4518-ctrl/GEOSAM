import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

    // 2. Fetch all active device sessions for the user
    const devices = await prisma.deviceSession.findMany({
      where: {
        userId: session.userId,
        active: true,
      },
      orderBy: { lastActive: 'desc' },
    });

    return NextResponse.json({
      success: true,
      devices: devices.map(d => ({
        id: d.id,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        browser: d.browser,
        os: d.os,
        loginDate: d.createdAt,
        lastActive: d.lastActive,
        isCurrent: d.sessionToken === session.sessionToken,
      })),
    });
  } catch (error: any) {
    console.error('Fetch Devices Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
