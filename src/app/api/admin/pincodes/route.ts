import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

// Helper to verify admin authority
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

    const mappings = await prisma.pincodeMapping.findMany({
      orderBy: { pincode: 'asc' },
    });

    return NextResponse.json({ success: true, mappings });
  } catch (error: any) {
    console.error('Pincodes GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const {
      pincode,
      city,
      state,
      district,
      geoRegion,
      zone,
      isMetro,
      isServiceable,
      hasOverride
    } = await req.json();

    if (!pincode || !city || !state || !zone || !geoRegion) {
      return NextResponse.json({ error: 'Required fields are missing.' }, { status: 400 });
    }

    const cleanPincode = pincode.trim();

    // Look up original backup data before override if existing
    const existing = await prisma.pincodeMapping.findUnique({
      where: { pincode: cleanPincode }
    });

    const backupOriginal = existing ? (existing.originalData || existing.originalData) : null;

    const mapping = await prisma.pincodeMapping.upsert({
      where: { pincode: cleanPincode },
      update: {
        city: city.trim(),
        state: state.trim(),
        district: district ? district.trim() : null,
        geoRegion: geoRegion.trim(),
        zone: zone.trim(),
        isMetro: !!isMetro,
        isServiceable: isServiceable !== undefined ? !!isServiceable : true,
        hasOverride: hasOverride !== undefined ? !!hasOverride : true,
        originalData: backupOriginal || (existing ? {
          city: existing.city,
          state: existing.state,
          district: existing.district,
          geoRegion: existing.geoRegion,
          zone: existing.zone,
          isMetro: existing.isMetro,
          isServiceable: existing.isServiceable
        } : null)
      },
      create: {
        pincode: cleanPincode,
        city: city.trim(),
        state: state.trim(),
        district: district ? district.trim() : null,
        geoRegion: geoRegion.trim(),
        zone: zone.trim(),
        isMetro: !!isMetro,
        isServiceable: isServiceable !== undefined ? !!isServiceable : true,
        hasOverride: hasOverride !== undefined ? !!hasOverride : true,
        postOffices: [city.trim()]
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pincode mapping saved successfully.',
      mapping,
    });
  } catch (error: any) {
    console.error('Pincodes POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
