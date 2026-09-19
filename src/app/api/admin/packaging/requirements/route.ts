import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const requirements = await prisma.customPackagingRequirement.findMany({
      include: {
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, requirements });
  } catch (error: any) {
    console.error('Admin Requirements GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve requirements.' }, { status: 500 });
  }
}
