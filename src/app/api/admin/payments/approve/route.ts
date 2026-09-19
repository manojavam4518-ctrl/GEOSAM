import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email';
import { formatDateIndian } from '@/utils/dateUtils';
import { hashPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { paymentId } = await req.json();
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required.' }, { status: 400 });
    }

    // 1. Fetch Payment Record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: 'This payment has already been processed.' }, { status: 400 });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + payment.duration);

    // Fetch the plan to retrieve entitlements
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: payment.planId },
    });

    let rawTempPassword = '';

    // 2. Perform DB Updates in transaction
    const [updatedPayment, subscription, invoice, organization, orgAdmin] = await prisma.$transaction(async (tx) => {
      // Approve Payment
      const pay = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' },
      });

      // Deactivate user's previous subscriptions
      await tx.subscription.updateMany({
        where: { userId: payment.userId, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });

      // Find or create Organization for the Customer Owner
      let org = await tx.organization.findFirst({
        where: { ownerId: payment.userId },
      });

      if (!org) {
        org = await tx.organization.create({
          data: {
            name: payment.user.company || `${payment.user.name} Organization`,
            ownerId: payment.userId,
            status: 'ACTIVE',
          },
        });
      } else {
        org = await tx.organization.update({
          where: { id: org.id },
          data: { status: 'ACTIVE' },
        });
      }

      // Link Owner with Organization
      await tx.user.update({
        where: { id: payment.userId },
        data: {
          role: 'OWNER',
          organizationId: org.id,
        },
      });

      // Create new Subscription belonging to the Organization & User
      const sub = await tx.subscription.create({
        data: {
          organizationId: org.id,
          userId: payment.userId,
          planId: payment.planId,
          planName: payment.planName,
          deviceLimit: payment.deviceLimit,
          customRateCardLimit: plan?.customRateCardLimit ?? 0,
          systemRateCardAccess: plan?.systemRateCardAccess ?? false,
          rateComparisonEnabled: plan?.rateComparisonEnabled ?? false,
          rateCardImportEnabled: plan?.rateCardImportEnabled ?? false,
          rateCardExportEnabled: plan?.rateCardExportEnabled ?? false,
          duration: payment.duration,
          amount: payment.totalAmount,
          startDate,
          endDate,
          paymentRef: payment.id,
          status: 'ACTIVE',
        },
      });

      // Update Organization subscriptionId
      org = await tx.organization.update({
        where: { id: org.id },
        data: { subscriptionId: sub.id },
      });

      // Provision Organization Admin User
      const adminEmail = `admin.${payment.user.email}`;
      let orgAdminUser = await tx.user.findUnique({
        where: { email: adminEmail },
      });

      if (!orgAdminUser) {
        rawTempPassword = 'Gt' + Math.random().toString(36).slice(-8) + '!';
        const hashedTempPassword = await hashPassword(rawTempPassword);
        orgAdminUser = await tx.user.create({
          data: {
            name: `${payment.user.company || payment.user.name} Admin`,
            email: adminEmail,
            mobile: payment.user.mobile,
            company: payment.user.company,
            password: hashedTempPassword,
            role: 'ORG_ADMIN',
            organizationId: org.id,
            mustChangePassword: true,
            emailVerified: true,
            status: 'ACTIVE',
          },
        });

        await tx.organization.update({
          where: { id: org.id },
          data: { adminUserId: orgAdminUser.id },
        });
      } else {
        // Link existing admin user if unlinked
        if (!orgAdminUser.organizationId || orgAdminUser.role !== 'ORG_ADMIN') {
          orgAdminUser = await tx.user.update({
            where: { id: orgAdminUser.id },
            data: { organizationId: org.id, role: 'ORG_ADMIN', status: 'ACTIVE' },
          });
        }
      }

      // Generate invoice serial number
      const invoiceCount = await tx.invoice.count();
      const invoiceNumber = `GT-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

      // Create Invoice
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          userId: payment.userId,
          paymentId: payment.id,
          planName: payment.planName,
          deviceLimit: payment.deviceLimit,
          duration: payment.duration,
          baseAmount: payment.baseAmount,
          gstAmount: payment.gstAmount,
          totalAmount: payment.totalAmount,
          billingDetails: payment.billingDetails as any,
          startDate,
          endDate,
          paymentRef: payment.utr,
        },
      });

      return [pay, sub, inv, org, orgAdminUser];
    });

    // 3. Trigger Email Notifications
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Payment approved / Subscription activated email
    await sendEmail({
      to: payment.user.email,
      templateName: 'PAYMENT_APPROVED',
      variables: {
        name: payment.user.name,
        planName: payment.planName,
        duration: payment.duration.toString(),
        amount: `INR ${payment.totalAmount.toFixed(2)}`,
        deviceLimit: payment.deviceLimit.toString(),
        expiryDate: formatDateIndian(endDate),
      },
    });

    // Organization Admin Credentials Email
    if (orgAdmin && rawTempPassword) {
      await sendEmail({
        to: payment.user.email,
        templateName: 'ORG_ADMIN_ACCESS',
        variables: {
          name: payment.user.name,
          companyName: organization.name,
          adminEmail: orgAdmin.email,
          tempPassword: rawTempPassword,
          loginUrl: `${appUrl}/login`,
          planName: payment.planName,
          deviceLimit: payment.deviceLimit.toString(),
          expiryDate: formatDateIndian(endDate),
        },
      });
    }

    // Invoice details email (if invoice requested)
    if (payment.invoiceRequired) {
      await sendEmail({
        to: payment.user.email,
        templateName: 'INVOICE',
        variables: {
          name: payment.user.name,
          invoiceNumber: invoice.invoiceNumber,
          planName: payment.planName,
          duration: payment.duration.toString(),
          amount: `INR ${payment.totalAmount.toFixed(2)}`,
        },
      });
    }

    // 4. Log Audit Log
    await recordAuditLog({
      adminId: adminSession.userId,
      adminEmail: adminSession.user.email,
      organizationId: organization.id,
      action: 'Approved Subscription Payment & Provisioned Org Admin',
      relatedRecordId: payment.id,
      metadata: {
        userId: payment.userId,
        organizationId: organization.id,
        adminUserId: orgAdmin.id,
        planName: payment.planName,
        duration: payment.duration,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment approved successfully. Subscription activated, Organization created, and Admin credentials sent.',
      subscription,
      invoice,
      organization,
    });
  } catch (error: any) {
    console.error('Approve Payment Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

