import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.paymentSettings.findFirst();

    if (!settings) {
      return NextResponse.json({
        success: true,
        paymentSettings: {
          upiId: '',
          upiName: '',
          qrCodeUrl: '',
          bankAccountHolder: '',
          bankName: '',
          bankAccountNumber: '',
          bankIfsc: '',
          bankBranch: '',
          bankAccountType: 'Current Account',
          gstEnabled: true,
          gstRate: 18.0,
          paymentInstructions: '',
          upiInstructions: '',
          bankInstructions: '',
        },
      });
    }

    return NextResponse.json({
      success: true,
      paymentSettings: settings,
    });
  } catch (error: any) {
    console.error('Payment Settings GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const {
      upiId,
      upiName,
      qrCodeUrl,
      bankAccountHolder,
      bankName,
      bankAccountNumber,
      bankIfsc,
      bankBranch,
      bankAccountType,
      gstEnabled,
      gstRate,
      paymentInstructions,
      upiInstructions,
      bankInstructions,
    } = await req.json();

    if (!upiId || !upiName || !bankAccountHolder || !bankName || !bankAccountNumber || !bankIfsc) {
      return NextResponse.json({ error: 'UPI details and basic bank details are required.' }, { status: 400 });
    }

    const rate = parseFloat(gstRate);
    if (isNaN(rate) || rate < 0) {
      return NextResponse.json({ error: 'GST rate must be a non-negative number.' }, { status: 400 });
    }

    let existing = await prisma.paymentSettings.findFirst();

    if (existing) {
      existing = await prisma.paymentSettings.update({
        where: { id: existing.id },
        data: {
          upiId,
          upiName,
          qrCodeUrl,
          bankAccountHolder,
          bankName,
          bankAccountNumber,
          bankIfsc,
          bankBranch,
          bankAccountType,
          gstEnabled: !!gstEnabled,
          gstRate: rate,
          paymentInstructions,
          upiInstructions,
          bankInstructions,
        },
      });
    } else {
      existing = await prisma.paymentSettings.create({
        data: {
          upiId,
          upiName,
          qrCodeUrl,
          bankAccountHolder,
          bankName,
          bankAccountNumber,
          bankIfsc,
          bankBranch,
          bankAccountType,
          gstEnabled: !!gstEnabled,
          gstRate: rate,
          paymentInstructions,
          upiInstructions,
          bankInstructions,
        },
      });
    }

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: 'Updated Payment Gateway Details & Tax Settings',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment and Tax settings saved successfully.',
      paymentSettings: existing,
    });
  } catch (error: any) {
    console.error('Payment Settings POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
