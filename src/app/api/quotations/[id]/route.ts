import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;

  const verified = await verifyToken(token);
  if (!verified) return null;

  const session = await verifyDeviceSession(verified.sessionToken);
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, quotation });
  } catch (error: any) {
    console.error('Quotation GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({ where: { id } });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found.' }, { status: 404 });
    }

    // Admins can delete any, users can delete their own
    if (user.role !== 'ADMIN' && quotation.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    await prisma.quotation.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Quotation deleted successfully.',
    });
  } catch (error: any) {
    console.error('Quotation DELETE error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
