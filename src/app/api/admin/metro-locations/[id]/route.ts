import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;

  const verified = await verifyToken(token);
  if (!verified) return null;

  const session = await verifyDeviceSession(verified.sessionToken);
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;

    const location = await prisma.metroLocation.delete({
      where: { id }
    });

    // Reset metro flag of matching pincodes
    await prisma.pincodeMapping.updateMany({
      where: {
        city: { equals: location.name, mode: 'insensitive' }
      },
      data: {
        isMetro: false
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Metro location deleted successfully.'
    });
  } catch (error: any) {
    console.error('Metro location DELETE error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
