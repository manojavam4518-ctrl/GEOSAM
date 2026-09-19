import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const products = await prisma.packagingProduct.findMany({
      include: {
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('Admin Products GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve products.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, category, price, unit, stock, minQuantity, image, active } = body;

    if (!name || !category || !description) {
      return NextResponse.json({ error: 'Name, description, and category are required.' }, { status: 400 });
    }

    const product = await prisma.packagingProduct.create({
      data: {
        name,
        description,
        category,
        price: price !== undefined && price !== null ? parseFloat(price) : null,
        unit: unit || null,
        stock: stock !== undefined ? parseInt(stock) : 0,
        minQuantity: minQuantity !== undefined ? parseInt(minQuantity) : 1,
        image: image || null,
        active: active !== undefined ? !!active : true,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('Admin Product POST error:', error);
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, description, category, price, unit, stock, minQuantity, image, active } = body;

    if (!id || !name || !category) {
      return NextResponse.json({ error: 'ID, name, and category are required.' }, { status: 400 });
    }

    const product = await prisma.packagingProduct.update({
      where: { id },
      data: {
        name,
        description,
        category,
        price: price !== undefined && price !== null ? parseFloat(price) : null,
        unit: unit || null,
        stock: stock !== undefined ? parseInt(stock) : 0,
        minQuantity: minQuantity !== undefined ? parseInt(minQuantity) : 1,
        image: image || null,
        active: active !== undefined ? !!active : true,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('Admin Product PUT error:', error);
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
  }
}
