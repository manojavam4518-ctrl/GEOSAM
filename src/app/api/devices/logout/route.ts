import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

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

    // 2. Parse sessionId
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    // Find the session to terminate
    const targetSession = await prisma.deviceSession.findUnique({
      where: { id: sessionId },
    });

    if (!targetSession || targetSession.userId !== session.userId) {
      return NextResponse.json({ error: 'Device session not found or access denied.' }, { status: 404 });
    }

    // Terminate session
    await prisma.deviceSession.update({
      where: { id: sessionId },
      data: { active: false },
    });

    const isCurrent = targetSession.sessionToken === session.sessionToken;

    const response = NextResponse.json({
      success: true,
      message: 'Device logged out successfully.',
      loggedOutSelf: isCurrent,
    });

    if (isCurrent) {
      // Clear cookie if they logged out themselves
      response.cookies.delete('session_token');
    }

    return response;
  } catch (error: any) {
    console.error('Remote Logout Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
