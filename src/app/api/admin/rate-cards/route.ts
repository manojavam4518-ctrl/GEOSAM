import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

async function verifyAdminSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;

  const verified = await verifyToken(token);
  if (!verified) return null;

  const session = await verifyDeviceSession(verified.sessionToken);
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'ADMIN') return null;

  return { userId: user.id, user };
}

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const rateCards = await prisma.rateCard.findMany({
      where: { ownerType: 'SYSTEM' },
      orderBy: { rateCardName: 'asc' },
    });

    const companies = await prisma.courierCompany.findMany({
      where: { userId: null }
    });
    const companyMap = new Map(companies.map(c => [c.id, c]));

    // Dynamic Backward-compatibility Mapping layer for old rate card formats
    const mapCard = (card: any) => {
      let slabsConfig = card.slabs;
      let regionsConfig = card.regions;

      const slabsArray = Array.isArray(card.slabs) ? card.slabs : [];
      const isOldFormat = slabsArray.length > 0 && ('destination' in slabsArray[0] || 'base250g' in slabsArray[0]);

      if (isOldFormat) {
        if (card.pricingModel === 'PER_KG') {
          slabsConfig = [
            { id: 'slabkg', type: 'BASE', weight: 1, unit: 'KG', label: 'Rate/KG' }
          ];
          regionsConfig = slabsArray.map((item: any, idx: number) => ({
            id: `reg-${idx}`,
            name: item.destination || `Region ${idx + 1}`,
            cargoRate: 0,
            airRatePerKg: item.perKg || item.airRatePerKg || 0,
            surfaceRatePerKg: item.perKg || item.surfaceRatePerKg || 0,
            prices: [{ slabId: 'slabkg', amount: item.perKg || 0 }]
          }));
        } else {
          slabsConfig = [
            { id: 'slab250', type: 'BASE', weight: 250, unit: 'GRAMS', label: 'Base 250G' },
            { id: 'slab500', type: 'BASE', weight: 500, unit: 'GRAMS', label: 'Base 500G' },
            { id: 'slabadd', type: 'ADDITIONAL', weight: 500, unit: 'GRAMS', label: 'Add 500G' }
          ];
          regionsConfig = slabsArray.map((item: any, idx: number) => ({
            id: `reg-${idx}`,
            name: item.destination || `Region ${idx + 1}`,
            cargoRate: item.cargoRate || 0,
            prices: [
              { slabId: 'slab250', amount: item.base250g || 0 },
              { slabId: 'slab500', amount: item.base500g || 0 },
              { slabId: 'slabadd', amount: item.add500g || 0 }
            ]
          }));
        }
      }

      return {
        ...card,
        name: card.rateCardName,
        courier: companyMap.get(card.courierCompanyId || '')?.name || 'Unknown',
        service: card.serviceName,
        type: card.serviceType,
        minWeight: card.minimumWeight,
        status: card.active ? 'ACTIVE' : 'INACTIVE',
        isActive: card.active,
        isSelectedForCalculation: card.useForComparison,
        courierCompany: companyMap.get(card.courierCompanyId || '') || null,
        slabs: slabsConfig,
        regions: regionsConfig,
      };
    };

    const mapped = rateCards.map(mapCard);

    return NextResponse.json({ success: true, rateCards: mapped });
  } catch (error: any) {
    console.error('Admin rate cards GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const {
      courierCompanyId,
      serviceType,
      rateCardName,
      serviceName,
      rateCardType,
      pricingModel,
      minimumWeight,
      cargoThreshold,
      slabs,
      regions,
      active,
      useForComparison,
      internationalRates,
    } = await req.json();

    if (!courierCompanyId || !serviceType || !rateCardName || !serviceName || !pricingModel) {
      return NextResponse.json({ error: 'Required fields are missing.' }, { status: 400 });
    }

    const card = await prisma.rateCard.create({
      data: {
        ownerType: 'SYSTEM',
        courierCompanyId,
        serviceType,
        rateCardName,
        serviceName,
        rateCardType: rateCardType || (pricingModel === 'SLAB' ? 'Courier' : (pricingModel === 'LTL_PTL' ? 'LTL' : 'Cargo')),
        pricingModel,
        minimumWeight: parseFloat(minimumWeight) || 0.0,
        cargoThreshold: parseFloat(cargoThreshold) || 5.0,
        active: active !== undefined ? !!active : true,
        useForComparison: useForComparison !== undefined ? !!useForComparison : true,
        slabs: slabs || [],
        regions: regions || [],
      },
    });

    if (internationalRates && Array.isArray(internationalRates)) {
      try {
        await prisma.$runCommandRaw({
          update: 'RateCard',
          updates: [
            {
              q: { _id: { $oid: card.id } },
              u: {
                $set: {
                  internationalRates: internationalRates,
                },
              },
            },
          ],
        });
      } catch (rawErr) {
        console.error('Raw MongoDB create update error (Admin):', rawErr);
      }
    }

    const finalCard = await prisma.rateCard.findUnique({ where: { id: card.id } });

    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `Created System Rate Card: ${rateCardName}`,
        relatedRecordId: card.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'System rate card created successfully.',
      rateCard: finalCard || card,
    });
  } catch (error: any) {
    console.error('Admin rate cards POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
