import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { RegionMappingService } from '@/utils/pincodeEngine';

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

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { pincodes } = await req.json();

    if (!pincodes || !Array.isArray(pincodes)) {
      return NextResponse.json({ error: 'Invalid payload: pincodes array is required.' }, { status: 400 });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    // Group items by pincode to handle multiple post offices belonging to one pincode
    const groupedPincodes: Record<string, any> = {};

    for (const item of pincodes) {
      const code = (item.pincode || '').toString().trim();
      if (!/^\d{6}$/.test(code)) {
        invalidCount++;
        continue;
      }

      const office = item.postOffice || item.postoffice || item.officeName || '';
      
      if (!groupedPincodes[code]) {
        groupedPincodes[code] = {
          pincode: code,
          state: item.state || '',
          district: item.district || '',
          city: item.city || item.district || '',
          postOffices: office ? [office.trim()] : [],
          postalCircle: item.postalCircle || item.circle || null,
          postalRegion: item.postalRegion || item.region || null,
          postalDivision: item.postalDivision || item.division || null,
          officeType: item.officeType || item.type || null,
          deliveryStatus: item.deliveryStatus || item.status || null,
          latitude: parseFloat(item.latitude) || null,
          longitude: parseFloat(item.longitude) || null,
        };
      } else {
        duplicateCount++;
        if (office && !groupedPincodes[code].postOffices.includes(office.trim())) {
          groupedPincodes[code].postOffices.push(office.trim());
        }
      }
    }

    // Process unique pincodes sequentially to preserve overrides and handle DB calls safely
    const uniqueCodes = Object.keys(groupedPincodes);

    for (const code of uniqueCodes) {
      const data = groupedPincodes[code];

      // Check if already exists in DB
      const existing = await prisma.pincodeMapping.findUnique({
        where: { pincode: code }
      });

      // Resolve regional mapping
      const mapping = await RegionMappingService.getMapping(data.state, data.city);

      if (existing) {
        // Prepare update fields
        const updateData: any = {
          state: data.state,
          district: data.district,
          city: data.city,
          postOffices: data.postOffices,
          postalCircle: data.postalCircle,
          postalRegion: data.postalRegion,
          postalDivision: data.postalDivision,
          officeType: data.officeType,
          deliveryStatus: data.deliveryStatus,
          latitude: data.latitude,
          longitude: data.longitude,
        };

        // If no custom override has been performed, update commercial region & zone
        if (!existing.hasOverride) {
          updateData.geoRegion = mapping.geoRegion;
          updateData.zone = mapping.zone;
          updateData.isMetro = mapping.isMetro;
        }

        await prisma.pincodeMapping.update({
          where: { pincode: code },
          data: updateData
        });

        updatedCount++;
      } else {
        // Create new record
        await prisma.pincodeMapping.create({
          data: {
            pincode: code,
            state: data.state,
            district: data.district,
            city: data.city,
            postOffices: data.postOffices,
            postalCircle: data.postalCircle,
            postalRegion: data.postalRegion,
            postalDivision: data.postalDivision,
            officeType: data.officeType,
            deliveryStatus: data.deliveryStatus,
            latitude: data.latitude,
            longitude: data.longitude,
            geoRegion: mapping.geoRegion,
            zone: mapping.zone,
            isMetro: mapping.isMetro,
            isServiceable: true,
            hasOverride: false
          }
        });

        addedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords: pincodes.length,
        uniqueProcessed: uniqueCodes.length,
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount,
        invalid: invalidCount,
        duplicates: duplicateCount
      }
    });
  } catch (error: any) {
    console.error('Pincodes import POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
