import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { terminateDeviceSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;

    if (token) {
      const verified = await verifyToken(token);
      if (verified && verified.sessionToken) {
        // Mark session as inactive in DB
        await terminateDeviceSession(verified.sessionToken);
      }
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });

    // Clear session cookie
    response.cookies.delete('session_token');

    return response;
  } catch (error: any) {
    console.error('Logout Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout.' },
      { status: 500 }
    );
  }
}
