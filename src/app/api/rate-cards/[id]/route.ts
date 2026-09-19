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

export async function GET(
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
    const card = await prisma.rateCard.findUnique({
      where: { id },
    });

    if (!card) {
      return NextResponse.json({ error: 'Rate card not found.' }, { status: 404 });
    }

    if (card.ownerType === 'USER' && card.ownerId !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, rateCard: card });
  } catch (error: any) {
    console.error('Rate card GET ID error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
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
    const card = await prisma.rateCard.findUnique({
      where: { id },
    });

    if (!card) {
      return NextResponse.json({ error: 'Rate card not found.' }, { status: 404 });
    }

    if (card.ownerType === 'SYSTEM' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Cannot modify system rate cards.' }, { status: 403 });
    }

    if (card.ownerType === 'USER' && card.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const {
      rateCardName,
      serviceName,
      serviceType,
      rateCardType,
      pricingModel,
      minimumWeight,
      cargoThreshold,
      active,
      useForComparison,
      slabs,
      regions,
      pincodes,
      internationalRates,
      // Fallback keys for backward-compatibility
      name,
      service,
      minWeight,
      isActive,
      isSelectedForCalculation,
    } = await req.json();

    const parseNum = (val: any, fallback: number) => {
      if (val === undefined || val === null || val === '') return fallback;
      const p = parseFloat(val);
      return isNaN(p) ? fallback : p;
    };

    const updated = await prisma.rateCard.update({
      where: { id },
      data: {
        rateCardName: rateCardName || name || card.rateCardName,
        serviceName: serviceName || service || card.serviceName,
        serviceType: serviceType || card.serviceType,
        rateCardType: rateCardType || card.rateCardType,
        pricingModel: pricingModel || card.pricingModel,
        minimumWeight: parseNum(minimumWeight ?? minWeight, card.minimumWeight),
        cargoThreshold: parseNum(cargoThreshold, card.cargoThreshold),
        active: active !== undefined ? !!active : (isActive !== undefined ? !!isActive : card.active),
        useForComparison: useForComparison !== undefined ? !!useForComparison : (isSelectedForCalculation !== undefined ? !!isSelectedForCalculation : card.useForComparison),
        slabs: slabs !== undefined ? slabs : card.slabs,
        regions: regions !== undefined ? regions : card.regions,
        pincodes: pincodes !== undefined ? pincodes : card.pincodes,
      },
    });

    if (internationalRates !== undefined) {
      try {
        await prisma.$runCommandRaw({
          update: 'RateCard',
          updates: [
            {
              q: { _id: { $oid: id } },
              u: {
                $set: {
                  internationalRates: internationalRates,
                  updatedAt: { $date: new Date().toISOString() },
                },
              },
            },
          ],
        });
      } catch (rawErr) {
        console.error('Raw MongoDB update error:', rawErr);
      }
    }

    const finalCard = await prisma.rateCard.findUnique({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Rate card updated successfully.',
      rateCard: finalCard || updated,
    });
  } catch (error: any) {
    console.error('Rate card PUT error:', error);
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
    const card = await prisma.rateCard.findUnique({
      where: { id },
    });

    if (!card) {
      return NextResponse.json({ error: 'Rate card not found.' }, { status: 404 });
    }

    if (card.ownerType === 'SYSTEM') {
      return NextResponse.json({ error: 'Cannot delete system templates.' }, { status: 403 });
    }

    if (card.ownerId !== user.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    await prisma.rateCard.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Rate card deleted successfully.',
    });
  } catch (error: any) {
    console.error('Rate card DELETE error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
