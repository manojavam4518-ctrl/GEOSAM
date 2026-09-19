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

    const { rateCardId } = await req.json();

    if (!rateCardId) {
      return NextResponse.json({ error: 'Rate Card ID is required.' }, { status: 400 });
    }

    const targetCard = await prisma.rateCard.findUnique({
      where: { id: rateCardId },
    });

    if (!targetCard) {
      return NextResponse.json({ error: 'Source rate card not found.' }, { status: 404 });
    }

    if (targetCard.ownerType === 'USER' && targetCard.ownerId !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    let duplicate;
    if (isDemo) {
      try {
        duplicate = await prisma.$transaction(async (tx) => {
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
              courierCompanyId: targetCard.courierCompanyId,
              serviceType: targetCard.serviceType,
              rateCardName: `${targetCard.rateCardName} - Copy`,
              serviceName: targetCard.serviceName,
              rateCardType: targetCard.rateCardType,
              pricingModel: targetCard.pricingModel,
              minimumWeight: targetCard.minimumWeight,
              cargoThreshold: targetCard.cargoThreshold,
              active: true,
              useForComparison: targetCard.useForComparison,
              slabs: targetCard.slabs || [],
              regions: targetCard.regions || {},
              pincodes: targetCard.pincodes || {},
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
      duplicate = await prisma.rateCard.create({
        data: {
          ownerType: 'USER',
          ownerId: user.id,
          companyId: user.company,
          courierCompanyId: targetCard.courierCompanyId,
          serviceType: targetCard.serviceType,
          rateCardName: `${targetCard.rateCardName} - Copy`,
          serviceName: targetCard.serviceName,
          rateCardType: targetCard.rateCardType,
          pricingModel: targetCard.pricingModel,
          minimumWeight: targetCard.minimumWeight,
          cargoThreshold: targetCard.cargoThreshold,
          active: true,
          useForComparison: targetCard.useForComparison,
          slabs: targetCard.slabs || [],
          regions: targetCard.regions || {},
          pincodes: targetCard.pincodes || {},
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Rate card duplicated successfully.',
      rateCard: duplicate,
    });
  } catch (error: any) {
    console.error('Rate card duplicate error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
