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

export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const templates = await prisma.quotationTemplate.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('Templates GET error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const {
      name,
      logo,
      companyName,
      address,
      phone,
      email,
      gstNumber,
      website,
      footerText,
      terms,
      paymentTerms,
      validityDays,
      signatureText,
      authorizedPerson,
      isDefault
    } = await req.json();

    if (!name || !companyName || !address || !phone || !email) {
      return NextResponse.json({ error: 'Required fields are missing.' }, { status: 400 });
    }

    // If isDefault is true, unset default on other templates
    if (isDefault) {
      await prisma.quotationTemplate.updateMany({
        where: { userId: user.id },
        data: { isDefault: false }
      });
    }

    const template = await prisma.quotationTemplate.create({
      data: {
        userId: user.id,
        name,
        logo: logo || null,
        companyName,
        address,
        phone,
        email,
        gstNumber: gstNumber || null,
        website: website || null,
        footerText: footerText || null,
        terms: terms || null,
        paymentTerms: paymentTerms || null,
        validityDays: parseInt(validityDays) || 30,
        signatureText: signatureText || null,
        authorizedPerson: authorizedPerson || null,
        isDefault: !!isDefault,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Quotation template created successfully.',
      template
    });
  } catch (error: any) {
    console.error('Templates POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
