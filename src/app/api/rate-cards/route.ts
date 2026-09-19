import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, getUserAccessState } from '@/lib/auth';
import { verifyModuleAccess } from '@/lib/modulePermissions';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'RATE_CARDS');
    if (!access.authorized) {
      return access.response!;
    }

    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gte: new Date() } },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const accessStatus = await getUserAccessState(user.id);
    if (accessStatus === 'DEMO_EXPIRED' || accessStatus === 'SUBSCRIPTION_EXPIRED') {
      return NextResponse.json({ error: 'Your demo/subscription has expired. Please subscribe to continue.', code: accessStatus }, { status: 403 });
    }

    const activeSub = user.subscriptions[0];
    const systemAccess = true;
    const settings = await prisma.websiteSettings.findFirst();
    const limit = settings?.maxCustomRateCards ?? 50;

    // Fetch custom cards owned by user
    const customCards = await prisma.rateCard.findMany({
      where: { ownerType: 'USER', ownerId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    // Fetch active system cards if allowed
    const systemCards = systemAccess
      ? await prisma.rateCard.findMany({
          where: { ownerType: 'SYSTEM', active: true },
          orderBy: { rateCardName: 'asc' },
        })
      : [];

    // Fetch all Courier Companies (system + user) to map names dynamically
    const companies = await prisma.courierCompany.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: user.id }
        ]
      }
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

    const mappedCustom = customCards.map(mapCard);
    const mappedSystem = systemCards.map(mapCard);

    const activeCustomCardsCount = customCards.filter(c => c.active).length;

    return NextResponse.json({
      success: true,
      customCards: mappedCustom,
      systemCards: mappedSystem,
      entitlements: {
        planName: activeSub ? activeSub.planName : 'Demo Account',
        customRateCardLimit: limit,
        usedRateCards: activeCustomCardsCount,
        systemRateCardAccess: systemAccess,
        rateComparisonEnabled: true,
        rateCardImportEnabled: true,
        rateCardExportEnabled: true,
      },
    });
  } catch (error: any) {
    console.error('Rate cards GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'RATE_CARDS');
    if (!access.authorized) {
      return access.response!;
    }

    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gte: new Date() } },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const activeSub = user.subscriptions[0];
    const isDemo = !activeSub && user.role !== 'ADMIN';
    const accessStatus = await getUserAccessState(user.id);

    if (accessStatus === 'DEMO_EXPIRED' || accessStatus === 'SUBSCRIPTION_EXPIRED') {
      return NextResponse.json({ error: 'Your demo/subscription has expired. Please subscribe to continue.', code: accessStatus }, { status: 403 });
    }

    const settings = await prisma.websiteSettings.findFirst();
    const safetyLimit = settings?.maxCustomRateCards ?? 50;

    // Check count of user's custom rate cards
    const userRateCardsCount = await prisma.rateCard.count({
      where: { ownerType: 'USER', ownerId: user.id },
    });

    if (isDemo && userRateCardsCount >= 10) {
      return NextResponse.json({
        error: 'You have reached the maximum of 10 Rate Cards included in the demo. Subscribe to a plan to add more.',
        demoLimitReached: true,
        code: 'DEMO_RATE_CARD_LIMIT_REACHED',
        usedRateCards: userRateCardsCount,
        rateCardLimit: 10,
      }, { status: 403 });
    }

    if (!isDemo && userRateCardsCount >= safetyLimit) {
      return NextResponse.json({
        error: `You have reached the maximum safety limit of ${safetyLimit} custom rate cards. Contact administrator to increase limit.`,
        customRateCardLimit: safetyLimit,
        usedRateCards: userRateCardsCount,
      }, { status: 403 });
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

    let card;
    if (isDemo) {
      try {
        card = await prisma.$transaction(async (tx) => {
          const count = await tx.rateCard.count({
            where: { ownerType: 'USER', ownerId: user.id },
          });
          if (count >= 10) {
            throw new Error('DEMO_RATE_CARD_LIMIT_REACHED');
          }
          return tx.rateCard.create({
            data: {
              ownerType: 'USER',
              ownerId: user.id,
              companyId: user.company,
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
              regions: regions || {},
              pincodes: {},
              internationalRates: internationalRates || null,
            },
          });
        });
      } catch (err: any) {
        if (err.message === 'DEMO_RATE_CARD_LIMIT_REACHED') {
          return NextResponse.json({
            error: 'You have reached the maximum of 10 Rate Cards included in the demo. Subscribe to a plan to add more.',
            demoLimitReached: true,
            code: 'DEMO_RATE_CARD_LIMIT_REACHED',
            usedRateCards: 10,
            rateCardLimit: 10,
          }, { status: 403 });
        }
        throw err;
      }
    } else {
      card = await prisma.rateCard.create({
        data: {
          ownerType: user.role === 'ADMIN' ? 'SYSTEM' : 'USER',
          ownerId: user.role === 'ADMIN' ? null : user.id,
          companyId: user.company,
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
          regions: regions || {},
          pincodes: {},
          internationalRates: internationalRates || null,
        },
      });
    }

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
        console.error('Raw MongoDB create update error:', rawErr);
      }
    }

    const finalCard = await prisma.rateCard.findUnique({ where: { id: card.id } });

    return NextResponse.json({
      success: true,
      message: 'Custom rate card created successfully.',
      rateCard: finalCard || card,
    });
  } catch (error: any) {
    console.error('Rate cards POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
