import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const verified = await verifyToken(token);
  if (!verified) return null;
  return verifyDeviceSession(verified.sessionToken);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;

    const requirement = await prisma.customPackagingRequirement.findUnique({
      where: { id },
      include: {
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!requirement || requirement.userId !== session.userId) {
      return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, requirement });
  } catch (error: any) {
    console.error('Requirement GET details error:', error);
    return NextResponse.json({ error: 'Failed to fetch requirement details.' }, { status: 500 });
  }
}
