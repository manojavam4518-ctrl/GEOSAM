import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, getUserAccessState } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
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
      slabs
    } = await req.json();

    if (!courierCompanyId || !serviceType || !rateCardName || !serviceName || !rateCardType || !pricingModel || !slabs || !Array.isArray(slabs)) {
      return NextResponse.json({ error: 'Required fields or slabs array are missing.' }, { status: 400 });
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
              rateCardType,
              pricingModel,
              minimumWeight: parseFloat(minimumWeight) || 0.0,
              cargoThreshold: parseFloat(cargoThreshold) || 5.0,
              active: true,
              useForComparison: true,
              slabs: slabs,
              regions: {},
              pincodes: {},
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
          ownerType: 'USER',
          ownerId: user.id,
          companyId: user.company,
          courierCompanyId,
          serviceType,
          rateCardName,
          serviceName,
          rateCardType,
          pricingModel,
          minimumWeight: parseFloat(minimumWeight) || 0.0,
          cargoThreshold: parseFloat(cargoThreshold) || 5.0,
          active: true,
          useForComparison: true,
          slabs: slabs,
          regions: {},
          pincodes: {},
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Rate card imported and saved successfully.',
      rateCard: card,
    });
  } catch (error: any) {
    console.error('Rate card import error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
