import { NextRequest } from 'next/server';
import { verifyToken } from './auth-token';
import { verifyDeviceSession } from './auth';

export async function verifyAdminSession(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return null;

    const verified = await verifyToken(token);
    if (!verified || verified.role !== 'ADMIN') return null;

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session || session.user.role !== 'ADMIN') return null;

    return session;
  } catch (error) {
    console.error('verifyAdminSession error:', error);
    return null;
  }
}
