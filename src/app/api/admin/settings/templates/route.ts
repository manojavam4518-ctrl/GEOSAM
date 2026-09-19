import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error('Email templates GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id, subject, body } = await req.json();

    if (!id || !subject || !body) {
      return NextResponse.json({ error: 'Template ID, subject, and body are required.' }, { status: 400 });
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: { id },
      data: {
        subject,
        body,
      },
    });

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `Updated Email Template: ${updatedTemplate.name}`,
        relatedRecordId: updatedTemplate.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Email template '${updatedTemplate.name}' updated successfully.`,
      template: updatedTemplate,
    });
  } catch (error: any) {
    console.error('Email templates POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
