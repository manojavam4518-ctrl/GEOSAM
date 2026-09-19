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

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const locations = await prisma.metroLocation.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, locations });
  } catch (error: any) {
    console.error('Metro locations GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { name, isActive } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Metro city name is required.' }, { status: 400 });
    }

    const cleanName = name.trim();

    const location = await prisma.metroLocation.upsert({
      where: { name: cleanName },
      update: {
        isActive: isActive !== undefined ? !!isActive : true
      },
      create: {
        name: cleanName,
        isActive: isActive !== undefined ? !!isActive : true
      }
    });

    // Automatically update metro status of all matching pincodes in master database
    await prisma.pincodeMapping.updateMany({
      where: {
        city: { equals: cleanName, mode: 'insensitive' }
      },
      data: {
        isMetro: isActive !== undefined ? !!isActive : true,
        geoRegion: 'METRO'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Metro location saved successfully.',
      location
    });
  } catch (error: any) {
    console.error('Metro location POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
