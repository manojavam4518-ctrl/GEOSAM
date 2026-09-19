import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { verifyModuleAccess } from '@/lib/modulePermissions';

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;

  const verified = await verifyToken(token);
  if (!verified) return null;

  const session = await verifyDeviceSession(verified.sessionToken);
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await verifyModuleAccess(req, 'RATE_CARDS');
    if (!access.authorized) {
      return access.response!;
    }

    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const company = await prisma.courierCompany.findUnique({ where: { id } });

    if (!company) {
      return NextResponse.json({ error: 'Courier Company not found.' }, { status: 404 });
    }

    if (company.userId !== null && company.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { name, logoUrl, trackingUrl, pincodeServiceabilityUrl, active } = await req.json();

    const updated = await prisma.courierCompany.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : company.name,
        logoUrl: logoUrl !== undefined ? (logoUrl || null) : company.logoUrl,
        trackingUrl: trackingUrl !== undefined ? (trackingUrl || null) : company.trackingUrl,
        pincodeServiceabilityUrl: pincodeServiceabilityUrl !== undefined ? (pincodeServiceabilityUrl || null) : company.pincodeServiceabilityUrl,
        active: active !== undefined ? !!active : company.active,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Courier company updated.',
      company: updated
    });
  } catch (error: any) {
    console.error('Courier company PUT error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await verifyModuleAccess(req, 'RATE_CARDS');
    if (!access.authorized) {
      return access.response!;
    }

    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const company = await prisma.courierCompany.findUnique({ where: { id } });

    if (!company) {
      return NextResponse.json({ error: 'Courier Company not found.' }, { status: 404 });
    }

    if (company.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied (system companies cannot be deleted).' }, { status: 403 });
    }

    // Cascade delete of associated custom rate cards
    await prisma.rateCard.deleteMany({
      where: { courierCompanyId: id, ownerId: user.id }
    });

    // Delete the company
    await prisma.courierCompany.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Courier company and nested rate cards deleted.'
    });
  } catch (error: any) {
    console.error('Courier company DELETE error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
