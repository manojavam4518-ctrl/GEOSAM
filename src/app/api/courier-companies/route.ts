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

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'RATE_CARDS');
    if (!access.authorized) {
      return access.response!;
    }

    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Return system companies + user custom companies
    const companies = await prisma.courierCompany.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: user.id }
        ]
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, companies });
  } catch (error: any) {
    console.error('Courier companies GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'RATE_CARDS');
    if (!access.authorized) {
      return access.response!;
    }

    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { name, logoUrl, trackingUrl, pincodeServiceabilityUrl, active } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Courier Company Name is required.' }, { status: 400 });
    }

    const company = await prisma.courierCompany.create({
      data: {
        userId: user.id,
        name: name.trim(),
        logoUrl: logoUrl || null,
        trackingUrl: trackingUrl || null,
        pincodeServiceabilityUrl: pincodeServiceabilityUrl || null,
        active: active !== undefined ? !!active : true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Courier company created successfully.',
      company
    });
  } catch (error: any) {
    console.error('Courier companies POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
