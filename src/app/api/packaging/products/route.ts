import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Session invalidated.' }, { status: 401 });
    }

    // Auto-seed default products if empty
    const count = await prisma.packagingProduct.count();
    if (count === 0) {
      // 1. Seed Cotton Box
      const boxProduct = await prisma.packagingProduct.create({
        data: {
          name: 'Cotton Box',
          description: 'High-quality heavy-duty corrugated cotton boxes for industrial shipping.',
          category: 'Cotton Box',
          price: null,
          unit: 'piece',
          minQuantity: 50,
          stock: 1000,
          active: true,
        }
      });

      await prisma.packagingVariant.createMany({
        data: [
          {
            productId: boxProduct.id,
            length: 12,
            width: 10,
            height: 8,
            dimensionUnit: 'Inch',
            price: 25.0,
            minQuantity: 50,
            stock: 1000,
            active: true,
          },
          {
            productId: boxProduct.id,
            length: 18,
            width: 12,
            height: 10,
            dimensionUnit: 'Inch',
            price: 45.0,
            minQuantity: 50,
            stock: 500,
            active: true,
          },
          {
            productId: boxProduct.id,
            length: 24,
            width: 18,
            height: 18,
            dimensionUnit: 'Inch',
            price: 75.0,
            minQuantity: 20,
            stock: 300,
            active: true,
          }
        ]
      });

      // 2. Seed Sin Wrap
      await prisma.packagingProduct.create({
        data: {
          name: 'Sin Wrap',
          description: 'High-tensile stretch film wrap for securing cargo and pallet packaging.',
          category: 'Sin Wrap',
          price: 350.0,
          unit: 'roll',
          minQuantity: 5,
          stock: 200,
          active: true,
        }
      });

      // 3. Seed Tape
      await prisma.packagingProduct.create({
        data: {
          name: 'Tape',
          description: 'Strong adhesive packaging tape for boxes sealing.',
          category: 'Tape',
          price: 45.0,
          unit: 'roll',
          minQuantity: 12,
          stock: 500,
          active: true,
        }
      });
    }

    const products = await prisma.packagingProduct.findMany({
      where: { active: true },
      include: {
        variants: {
          where: { active: true }
        }
      }
    });

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ error: 'Failed to load products.' }, { status: 500 });
  }
}
