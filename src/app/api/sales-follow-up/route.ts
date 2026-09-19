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

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'SALES_FOLLOW_UP');
    if (!access.authorized) {
      return access.response!;
    }

    const user = access.user;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const leadSource = searchParams.get('leadSource') || '';
    const furtherAction = searchParams.get('furtherAction') || '';
    const serviceType = searchParams.get('serviceType') || '';
    const businessArea = searchParams.get('businessArea') || '';

    // Build filter query
    const whereClause: any = {};

    if (user.role !== 'ADMIN') {
      if (access.organizationId) {
        whereClause.user = { organizationId: access.organizationId };
      } else {
        whereClause.userId = user.id;
      }
    }

    if (leadSource) {
      whereClause.salesLeadSource = leadSource;
    }

    if (furtherAction) {
      whereClause.furtherAction = furtherAction;
    }

    if (serviceType) {
      whereClause.serviceType = serviceType;
    }

    if (businessArea) {
      whereClause.businessArea = { contains: businessArea, mode: 'insensitive' };
    }

    if (search) {
      whereClause.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { businessArea: { contains: search, mode: 'insensitive' } },
      ];
    }

    const followUps = await prisma.salesFollowUp.findMany({
      where: whereClause,
      include: {
        history: {
          orderBy: { timestamp: 'desc' },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate Summary Metrics
    const allUserFollowUps = await prisma.salesFollowUp.findMany({
      where: user.role === 'ADMIN' ? {} : { userId: user.id },
      select: { furtherAction: true, quotationNumber: true },
    });

    const totalLeads = allUserFollowUps.length;
    const quotationsSent = allUserFollowUps.filter(f => !!f.quotationNumber).length;
    const followUpRequired = allUserFollowUps.filter(f => f.furtherAction === 'FOLLOW UP REQUIRED').length;
    const pending = allUserFollowUps.filter(f => 
      f.furtherAction.includes('PENDING') || f.furtherAction === 'FIRST APPROACH PENDING'
    ).length;
    const convertedSigned = allUserFollowUps.filter(f => f.furtherAction === 'SIGNED WITH DTDC').length;
    const rateChallenges = allUserFollowUps.filter(f => f.furtherAction === 'RATE CHALLENGE').length;

    const summary = {
      totalLeads,
      quotationsSent,
      followUpRequired,
      pending,
      convertedSigned,
      rateChallenges,
    };

    return NextResponse.json({
      success: true,
      followUps,
      summary,
    });
  } catch (error: any) {
    console.error('Sales Follow-Up GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'SALES_FOLLOW_UP');
    if (!access.authorized) {
      return access.response!;
    }

    const user = access.user;

    const body = await req.json();
    const {
      companyName,
      contactPerson,
      phone,
      email,
      salesLeadSource,
      furtherAction,
      remarks,
      businessArea,
      quotationNumber,
      courierCompany,
      serviceName,
      serviceType,
      actualWeight,
      volumetricWeight,
      chargeableWeight,
      calculatedRate,
    } = body;

    if (!companyName || !contactPerson || !phone) {
      return NextResponse.json({ error: 'Company Name, Contact Person, and Phone Number are required.' }, { status: 400 });
    }

    const action = furtherAction || 'FIRST APPROACH PENDING';

    const followUp = await prisma.salesFollowUp.create({
      data: {
        userId: user.id,
        companyName,
        contactPerson,
        phone,
        email: email || null,
        salesLeadSource: salesLeadSource || null,
        furtherAction: action,
        remarks: remarks || null,
        businessArea: businessArea || null,
        quotationNumber: quotationNumber || null,
        courierCompany: courierCompany || null,
        serviceName: serviceName || null,
        serviceType: serviceType || 'Domestic',
        actualWeight: actualWeight ? parseFloat(actualWeight) : null,
        volumetricWeight: volumetricWeight ? parseFloat(volumetricWeight) : null,
        chargeableWeight: chargeableWeight ? parseFloat(chargeableWeight) : null,
        calculatedRate: calculatedRate ? parseFloat(calculatedRate) : null,
        isManualEntry: true,
      },
    });

    // Create history entry
    await prisma.salesFollowUpHistory.create({
      data: {
        followUpId: followUp.id,
        action: `Manual lead created. Status set to ${action}`,
        previousState: null,
        newState: action,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sales follow-up created successfully.',
      followUp,
    });
  } catch (error: any) {
    console.error('Sales Follow-Up POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
