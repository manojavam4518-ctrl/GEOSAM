import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import {
  isValidDeclarationSignature,
  SIGNATURE_REQUIRED_ERROR_MESSAGE,
  generateVectorDeclarationPdf,
} from '@/utils/declarationPdfExport';
import {
  isValidPersonalDeclarationSignature,
  PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE,
  generatePersonalDeclarationPdf,
} from '@/utils/personalDeclarationPdfExport';

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: 'Declaration data is required.' }, { status: 400 });
    }

    if (body.templateType === 'PERSONAL_GOODS') {
      if (!isValidPersonalDeclarationSignature(body.signatureBase64)) {
        return NextResponse.json(
          { error: PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE },
          { status: 400 }
        );
      }

      const doc = await generatePersonalDeclarationPdf(body);
      const pdfArrayBuffer = doc.output('arraybuffer');
      const filename = `PERSONAL_GOODS_DECLARATION_${body.docketNumber || body.consignmentNumber ? String(body.docketNumber || body.consignmentNumber).replace(/[^a-zA-Z0-9_-]/g, '') : 'NOTE'}_${new Date().toISOString().slice(0, 10)}.pdf`;

      return new NextResponse(Buffer.from(pdfArrayBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    if (!isValidDeclarationSignature(body.signatureBase64)) {
      return NextResponse.json(
        { error: SIGNATURE_REQUIRED_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    const doc = generateVectorDeclarationPdf(body);
    const pdfArrayBuffer = doc.output('arraybuffer');
    const filename = `GOODS_DECLARATION_NOTE_${body.consignmentNumber ? String(body.consignmentNumber).replace(/[^a-zA-Z0-9_-]/g, '') : 'NOTE'}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(Buffer.from(pdfArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Error generating declaration PDF on API:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate declaration PDF.' },
      { status: 500 }
    );
  }
}

