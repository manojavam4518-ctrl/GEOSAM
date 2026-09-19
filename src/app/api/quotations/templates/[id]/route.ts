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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const template = await prisma.quotationTemplate.findUnique({ where: { id } });

    if (!template || template.userId !== user.id) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
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

    if (isDefault) {
      await prisma.quotationTemplate.updateMany({
        where: { userId: user.id },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.quotationTemplate.update({
      where: { id },
      data: {
        name: name || template.name,
        logo: logo !== undefined ? logo : template.logo,
        companyName: companyName || template.companyName,
        address: address || template.address,
        phone: phone || template.phone,
        email: email || template.email,
        gstNumber: gstNumber !== undefined ? gstNumber : template.gstNumber,
        website: website !== undefined ? website : template.website,
        footerText: footerText !== undefined ? footerText : template.footerText,
        terms: terms !== undefined ? terms : template.terms,
        paymentTerms: paymentTerms !== undefined ? paymentTerms : template.paymentTerms,
        validityDays: validityDays !== undefined ? parseInt(validityDays) : template.validityDays,
        signatureText: signatureText !== undefined ? signatureText : template.signatureText,
        authorizedPerson: authorizedPerson !== undefined ? authorizedPerson : template.authorizedPerson,
        isDefault: isDefault !== undefined ? !!isDefault : template.isDefault,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully.',
      template: updated
    });
  } catch (error: any) {
    console.error('Template PUT error:', error);
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
    const template = await prisma.quotationTemplate.findUnique({ where: { id } });

    if (!template || template.userId !== user.id) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
    }

    await prisma.quotationTemplate.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully.'
    });
  } catch (error: any) {
    console.error('Template DELETE error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
