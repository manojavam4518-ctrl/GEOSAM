import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const result = await prisma.user.updateMany({
      data: {
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `Approved & Verified All (${result.count}) User Accounts`,
        metadata: { updatedCount: result.count },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully approved and verified all ${result.count} user accounts.`,
      updatedCount: result.count,
    });
  } catch (error: any) {
    console.error('Approve All Users Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
