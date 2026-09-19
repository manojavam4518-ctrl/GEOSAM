import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.websiteSettings.findFirst();

    if (!settings) {
      return NextResponse.json({
        success: true,
        cms: {
          heroHeadline: 'Calculate. Track. Manage. Ship Smarter.',
          heroSubtitle: 'GEO TRANSIT is an enterprise logistics utility platform designed to simplify volumetric calculations, pincode verification, and tracking.',
          supportEmail: 'support@geotransit.com',
          footerText: '© 2026 GEO TRANSIT. All rights reserved.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      cms: settings,
    });
  } catch (error: any) {
    console.error('CMS GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { heroHeadline, heroSubtitle, supportEmail, footerText } = await req.json();

    if (!heroHeadline || !heroSubtitle || !supportEmail || !footerText) {
      return NextResponse.json({ error: 'All CMS settings fields are required.' }, { status: 400 });
    }

    let existing = await prisma.websiteSettings.findFirst();

    if (existing) {
      existing = await prisma.websiteSettings.update({
        where: { id: existing.id },
        data: { heroHeadline, heroSubtitle, supportEmail, footerText },
      });
    } else {
      existing = await prisma.websiteSettings.create({
        data: { heroHeadline, heroSubtitle, supportEmail, footerText },
      });
    }

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: 'Updated Website CMS Settings',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Website CMS settings updated successfully.',
      cms: existing,
    });
  } catch (error: any) {
    console.error('CMS POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
