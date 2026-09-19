import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { formatDateIndian } from '@/utils/dateUtils';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const verified = await verifyToken(token);
  if (!verified) return null;
  return verifyDeviceSession(verified.sessionToken);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const requirements = await prisma.customPackagingRequirement.findMany({
      where: { userId: session.userId },
      include: {
        quotations: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, requirements });
  } catch (error: any) {
    console.error('Requirements GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve requirements.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerName,
      companyName,
      email,
      phone,
      productMaterial,
      requiredDimension,
      requiredQuantity,
      deliveryLocation,
      requiredDate,
      additionalRequirements,
      attachmentUrl,
    } = body;

    if (!customerName || !companyName || !email || !phone || !productMaterial || !requiredQuantity || !deliveryLocation || !requiredDate) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const qty = parseInt(requiredQuantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive integer.' }, { status: 400 });
    }

    const deliveryDate = new Date(requiredDate);
    if (isNaN(deliveryDate.getTime())) {
      return NextResponse.json({ error: 'Invalid delivery date.' }, { status: 400 });
    }

    const requirement = await prisma.customPackagingRequirement.create({
      data: {
        userId: session.userId,
        customerName,
        companyName,
        email,
        phone,
        productMaterial,
        requiredDimension: requiredDimension || null,
        requiredQuantity: qty,
        deliveryLocation,
        requiredDate: deliveryDate,
        additionalRequirements: additionalRequirements || null,
        attachmentUrl: attachmentUrl || null,
        status: 'NEW',
      },
    });

    // Send email notification
    try {
      await sendEmail({
        to: email,
        templateName: 'PACKAGING_REQUIREMENT_SUBMITTED',
        variables: {
          name: customerName,
          productMaterial: productMaterial,
          quantity: qty.toString(),
          location: deliveryLocation,
          requiredDate: formatDateIndian(deliveryDate),
        },
      });
    } catch (emailErr) {
      console.error('Email notification failed:', emailErr);
    }

    return NextResponse.json({ success: true, requirement });
  } catch (error: any) {
    console.error('Requirement POST error:', error);
    return NextResponse.json({ error: 'Failed to submit requirement.' }, { status: 500 });
  }
}
