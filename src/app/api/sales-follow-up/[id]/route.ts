import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

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
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;

    const followUp = await prisma.salesFollowUp.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!followUp) {
      return NextResponse.json({ error: 'Follow-Up record not found.' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && followUp.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    // Also fetch associated Quotation details if linked
    let quotationDetails = null;
    if (followUp.quotationNumber || followUp.quotationId) {
      if (followUp.quotationId) {
        quotationDetails = await prisma.quotation.findUnique({
          where: { id: followUp.quotationId },
        });
      } else if (followUp.quotationNumber) {
        quotationDetails = await prisma.quotation.findFirst({
          where: { quotationNumber: followUp.quotationNumber },
        });
      }
    }

    return NextResponse.json({
      success: true,
      followUp,
      quotationDetails,
    });
  } catch (error: any) {
    console.error('Sales Follow-Up GET [id] error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.salesFollowUp.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Follow-Up record not found.' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const {
      companyName,
      contactPerson,
      phone,
      email,
      salesLeadSource,
      furtherAction,
      remarks,
      businessArea,
    } = body;

    const updateData: any = {};
    const historyEntries: { action: string; previousState?: string; newState?: string }[] = [];

    if (companyName !== undefined && companyName !== existing.companyName) {
      updateData.companyName = companyName;
      historyEntries.push({
        action: `Company Name changed from "${existing.companyName}" to "${companyName}"`,
        previousState: existing.companyName,
        newState: companyName,
      });
    }

    if (contactPerson !== undefined && contactPerson !== existing.contactPerson) {
      updateData.contactPerson = contactPerson;
    }

    if (phone !== undefined && phone !== existing.phone) {
      updateData.phone = phone;
    }

    if (email !== undefined && email !== existing.email) {
      updateData.email = email;
    }

    if (salesLeadSource !== undefined && salesLeadSource !== existing.salesLeadSource) {
      updateData.salesLeadSource = salesLeadSource;
      historyEntries.push({
        action: `Sales Lead Source updated to ${salesLeadSource || 'None'}`,
        previousState: existing.salesLeadSource || 'None',
        newState: salesLeadSource || 'None',
      });
    }

    if (furtherAction !== undefined && furtherAction !== existing.furtherAction) {
      updateData.furtherAction = furtherAction;
      historyEntries.push({
        action: `Further Action updated from "${existing.furtherAction}" to "${furtherAction}"`,
        previousState: existing.furtherAction,
        newState: furtherAction,
      });
    }

    if (remarks !== undefined && remarks !== existing.remarks) {
      updateData.remarks = remarks;
      historyEntries.push({
        action: `Remarks updated: "${remarks}"`,
        previousState: existing.remarks || '',
        newState: remarks,
      });
    }

    if (businessArea !== undefined && businessArea !== existing.businessArea) {
      updateData.businessArea = businessArea;
    }

    const updated = await prisma.salesFollowUp.update({
      where: { id },
      data: updateData,
    });

    // Create history records
    for (const h of historyEntries) {
      await prisma.salesFollowUpHistory.create({
        data: {
          followUpId: id,
          action: h.action,
          previousState: h.previousState || null,
          newState: h.newState || null,
          timestamp: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sales Follow-Up updated successfully.',
      followUp: updated,
    });
  } catch (error: any) {
    console.error('Sales Follow-Up PATCH [id] error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.salesFollowUp.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Follow-Up record not found.' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    await prisma.salesFollowUp.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Sales Follow-Up record deleted successfully.',
    });
  } catch (error: any) {
    console.error('Sales Follow-Up DELETE [id] error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
