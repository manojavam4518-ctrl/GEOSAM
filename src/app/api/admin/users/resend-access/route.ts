import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email';
import { formatDateIndian } from '@/utils/dateUtils';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        subscriptions: {
          where: { status: 'ACTIVE', endDate: { gte: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Find organization
    let org = user.organization;
    if (!org) {
      org = await prisma.organization.findFirst({
        where: { ownerId: user.id },
      });
    }

    if (!org) {
      return NextResponse.json({ error: 'No active organization linked to this user.' }, { status: 400 });
    }

    const adminEmail = `admin.${user.email}`;
    let orgAdminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const newTempPassword = 'Gt' + Math.random().toString(36).slice(-8) + '!';
    const hashedTempPassword = await hashPassword(newTempPassword);

    if (!orgAdminUser) {
      orgAdminUser = await prisma.user.create({
        data: {
          name: `${user.company || user.name} Admin`,
          email: adminEmail,
          mobile: user.mobile,
          company: user.company,
          password: hashedTempPassword,
          role: 'ORG_ADMIN',
          organizationId: org.id,
          mustChangePassword: true,
          emailVerified: true,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.user.update({
        where: { id: orgAdminUser.id },
        data: {
          password: hashedTempPassword,
          mustChangePassword: true,
          status: 'ACTIVE',
        },
      });
    }

    const activeSub = user.subscriptions[0];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const emailResult = await sendEmail({
      to: user.email,
      templateName: 'ORG_ADMIN_ACCESS',
      variables: {
        name: user.name,
        companyName: org.name,
        adminEmail: orgAdminUser.email,
        tempPassword: newTempPassword,
        loginUrl: `${appUrl}/login`,
        planName: activeSub?.planName || 'Active Plan',
        deviceLimit: (activeSub?.deviceLimit || 2).toString(),
        expiryDate: activeSub ? formatDateIndian(activeSub.endDate) : 'N/A',
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: 'Resent Organization Admin Access Credentials',
        relatedRecordId: org.id,
        metadata: {
          ownerEmail: user.email,
          adminEmail: orgAdminUser.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Admin access credentials reset and email sent to ${user.email}.`,
      emailStatus: emailResult,
    });
  } catch (error: any) {
    console.error('Resend Access Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
