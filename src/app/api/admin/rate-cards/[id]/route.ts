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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const card = await prisma.rateCard.findUnique({
      where: { id },
    });

    if (!card) {
      return NextResponse.json({ error: 'Rate card not found.' }, { status: 404 });
    }

    const body = await req.json();
    const {
      courierCompanyId,
      serviceType,
      rateCardName,
      serviceName,
      rateCardType,
      pricingModel,
      minimumWeight,
      cargoThreshold,
      active,
      useForComparison,
      slabs,
      internationalRates,
    } = body;

    const parseNum = (val: any, fallback: number) => {
      if (val === undefined || val === null || val === '') return fallback;
      const p = parseFloat(val);
      return isNaN(p) ? fallback : p;
    };

    const updated = await prisma.rateCard.update({
      where: { id },
      data: {
        courierCompanyId: courierCompanyId || card.courierCompanyId,
        serviceType: serviceType || card.serviceType,
        rateCardName: rateCardName || card.rateCardName,
        serviceName: serviceName || card.serviceName,
        rateCardType: rateCardType || card.rateCardType,
        pricingModel: pricingModel || card.pricingModel,
        minimumWeight: parseNum(minimumWeight, card.minimumWeight),
        cargoThreshold: parseNum(cargoThreshold, card.cargoThreshold),
        active: active !== undefined ? !!active : card.active,
        useForComparison: useForComparison !== undefined ? !!useForComparison : card.useForComparison,
        slabs: slabs !== undefined ? slabs : card.slabs,
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
        console.error('Raw MongoDB update error (Admin):', rawErr);
      }
    }

    const finalCard = await prisma.rateCard.findUnique({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `Updated System Rate Card (ID: ${card.id}, Name: ${card.rateCardName})`,
        relatedRecordId: card.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Rate card updated successfully.',
      rateCard: finalCard || updated,
    });
  } catch (error: any) {
    console.error('Admin rate card PUT error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const card = await prisma.rateCard.findUnique({
      where: { id },
    });

    if (!card) {
      return NextResponse.json({ error: 'Rate card not found.' }, { status: 404 });
    }

    await prisma.rateCard.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `Deleted System Rate Card (ID: ${card.id}, Name: ${card.rateCardName})`,
        relatedRecordId: card.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Rate card deleted successfully.',
    });
  } catch (error: any) {
    console.error('Admin rate card DELETE error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
