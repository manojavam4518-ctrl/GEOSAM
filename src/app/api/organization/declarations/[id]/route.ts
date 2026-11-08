import { NextRequest, NextResponse } from 'next/server';
import { verifyModuleAccess } from '@/lib/modulePermissions';
import { getDeclarationById } from '@/lib/declarationDb';

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

    return NextResponse.json({ declaration });
  } catch (err: any) {
    console.error('Error fetching single declaration:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch declaration.' },
      { status: 500 }
    );
  }
}

