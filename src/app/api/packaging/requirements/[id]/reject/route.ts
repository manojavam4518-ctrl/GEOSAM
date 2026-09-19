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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch requirement and the latest active quotation
    const requirement = await prisma.customPackagingRequirement.findUnique({
      where: { id },
      include: {
        quotations: {
          where: { status: 'SENT' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!requirement || requirement.userId !== session.userId) {
      return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
    }

    const quotation = requirement.quotations[0];

    await prisma.$transaction(async (tx) => {
      if (quotation) {
        await tx.packagingQuotation.update({
          where: { id: quotation.id },
          data: { status: 'REJECTED' },
        });
      }

      await tx.customPackagingRequirement.update({
        where: { id: requirement.id },
        data: { status: 'CUSTOMER_REJECTED' },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Quotation rejected successfully.',
    });
  } catch (error: any) {
    console.error('Reject quotation error:', error);
    return NextResponse.json({ error: 'Failed to reject quotation.' }, { status: 500 });
  }
}
