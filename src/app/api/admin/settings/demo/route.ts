import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    let settings = await prisma.websiteSettings.findFirst();
    if (!settings) {
      settings = await prisma.websiteSettings.create({
        data: {
          heroHeadline: 'Calculate. Track. Manage. Ship Smarter.',
          heroSubtitle: 'GEO TRANSIT is an enterprise logistics utility platform designed to simplify volumetric calculations, pincode verification, and tracking.',
          supportEmail: 'support@geotransit.com',
          footerText: '© 2026 GEO TRANSIT. All rights reserved.',
          demoDurationDays: 10,
          maxCustomRateCards: 50,
        },
      });
    }

    return NextResponse.json({
      success: true,
      demoDurationDays: settings.demoDurationDays,
      maxCustomRateCards: settings.maxCustomRateCards,
    });
  } catch (error: any) {
    console.error('Demo Settings GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { demoDurationDays, maxCustomRateCards } = await req.json();

    const duration = parseInt(demoDurationDays);
    const limit = parseInt(maxCustomRateCards);

    if (isNaN(duration) || duration <= 0 || isNaN(limit) || limit < 0) {
      return NextResponse.json({ error: 'Values must be valid non-negative integers.' }, { status: 400 });
    }

    let settings = await prisma.websiteSettings.findFirst();

    if (settings) {
      settings = await prisma.websiteSettings.update({
        where: { id: settings.id },
        data: {
          demoDurationDays: duration,
          maxCustomRateCards: limit,
        },
      });
    } else {
      settings = await prisma.websiteSettings.create({
        data: {
          demoDurationDays: duration,
          maxCustomRateCards: limit,
        },
      });
    }

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `Updated Demo Settings: Duration = ${duration} Days, Max Custom Rate Cards = ${limit}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demo settings updated successfully.',
      demoDurationDays: settings.demoDurationDays,
      maxCustomRateCards: settings.maxCustomRateCards,
    });
  } catch (error: any) {
    console.error('Demo Settings POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
