import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { getDeclarationById } from '@/lib/declarationDb';
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await verifyModuleAccess(req);
    if (!access.authorized) {
      return access.response || NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const organizationId = access.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context not found.' }, { status: 400 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Declaration ID is required.' }, { status: 400 });
    }

    const declaration = await getDeclarationById(id, organizationId);
    if (!declaration) {
      return NextResponse.json({ error: 'Declaration not found.' }, { status: 404 });
    }

    if (declaration.templateType === 'PERSONAL_GOODS') {
      if (!isValidPersonalDeclarationSignature(declaration.signatureBase64)) {
        return NextResponse.json(
          { error: PERSONAL_SIGNATURE_REQUIRED_ERROR_MESSAGE },
          { status: 400 }
        );
      }

      const doc = await generatePersonalDeclarationPdf(declaration as any);
      const pdfArrayBuffer = doc.output('arraybuffer');
      const filename = `PERSONAL_GOODS_DECLARATION_${declaration.consignmentNumber ? declaration.consignmentNumber.replace(/[^a-zA-Z0-9_-]/g, '') : 'NOTE'}_${new Date().toISOString().slice(0, 10)}.pdf`;

      return new NextResponse(Buffer.from(pdfArrayBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    if (!isValidDeclarationSignature(declaration.signatureBase64)) {
      return NextResponse.json(
        { error: SIGNATURE_REQUIRED_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    const doc = generateVectorDeclarationPdf(declaration);
    const pdfArrayBuffer = doc.output('arraybuffer');
    const filename = `GOODS_DECLARATION_NOTE_${declaration.consignmentNumber ? declaration.consignmentNumber.replace(/[^a-zA-Z0-9_-]/g, '') : 'NOTE'}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(Buffer.from(pdfArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Error serving declaration PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate declaration PDF.' },
      { status: 500 }
    );
  }
}

