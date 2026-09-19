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

    const mappings = await prisma.stateRegionMapping.findMany({
      orderBy: { state: 'asc' }
    });

    return NextResponse.json({ success: true, mappings });
  } catch (error: any) {
    console.error('State mappings GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { state, regionName, zoneName } = await req.json();
    if (!state || !regionName || !zoneName) {
      return NextResponse.json({ error: 'State, Region name, and Zone name are required.' }, { status: 400 });
    }

    const cleanState = state.trim();

    const mapping = await prisma.stateRegionMapping.upsert({
      where: { state: cleanState },
      update: {
        regionName: regionName.trim(),
        zoneName: zoneName.trim()
      },
      create: {
        state: cleanState,
        regionName: regionName.trim(),
        zoneName: zoneName.trim()
      }
    });

    // Cascade update to matching non-overridden pincodes in master database
    await prisma.pincodeMapping.updateMany({
      where: {
        state: { equals: cleanState, mode: 'insensitive' },
        hasOverride: false,
        isMetro: false // Metro locations retain METRO region classification
      },
      data: {
        geoRegion: regionName.trim(),
        zone: zoneName.trim()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'State regional mapping saved successfully.',
      mapping
    });
  } catch (error: any) {
    console.error('State mapping POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
