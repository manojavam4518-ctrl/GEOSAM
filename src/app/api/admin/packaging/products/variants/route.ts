import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, length, width, height, dimensionUnit, price, minQuantity, stock, active } = body;

    if (!productId || length === undefined || width === undefined || height === undefined || !dimensionUnit || price === undefined) {
      return NextResponse.json({ error: 'Missing required variant parameters.' }, { status: 400 });
    }

    const variant = await prisma.packagingVariant.create({
      data: {
        productId,
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
        dimensionUnit,
        price: parseFloat(price),
        minQuantity: minQuantity !== undefined ? parseInt(minQuantity) : 1,
        stock: stock !== undefined ? parseInt(stock) : 0,
        active: active !== undefined ? !!active : true,
      },
    });

    return NextResponse.json({ success: true, variant });
  } catch (error: any) {
    console.error('Admin Variant POST error:', error);
    return NextResponse.json({ error: 'Failed to create variant.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, length, width, height, dimensionUnit, price, minQuantity, stock, active } = body;

    if (!id || length === undefined || width === undefined || height === undefined || !dimensionUnit || price === undefined) {
      return NextResponse.json({ error: 'Missing required variant parameters.' }, { status: 400 });
    }

    const variant = await prisma.packagingVariant.update({
      where: { id },
      data: {
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
        dimensionUnit,
        price: parseFloat(price),
        minQuantity: minQuantity !== undefined ? parseInt(minQuantity) : 1,
        stock: stock !== undefined ? parseInt(stock) : 0,
        active: active !== undefined ? !!active : true,
      },
    });

    return NextResponse.json({ success: true, variant });
  } catch (error: any) {
    console.error('Admin Variant PUT error:', error);
    return NextResponse.json({ error: 'Failed to update variant.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Variant ID is required.' }, { status: 400 });
    }

    await prisma.packagingVariant.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Variant deleted successfully.' });
  } catch (error: any) {
    console.error('Admin Variant DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete variant.' }, { status: 500 });
  }
}
