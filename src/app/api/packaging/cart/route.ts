import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';

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

    let cart = await prisma.packagingCart.findUnique({
      where: { userId: session.userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.packagingCart.create({
        data: { userId: session.userId },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true, cart });
  } catch (error: any) {
    console.error('Cart GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve cart.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { productId, variantId, quantity } = await req.json();
    if (!productId || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid item parameters.' }, { status: 400 });
    }

    // 1. Get or create cart
    let cart = await prisma.packagingCart.findUnique({
      where: { userId: session.userId },
    });

    if (!cart) {
      cart = await prisma.packagingCart.create({
        data: { userId: session.userId },
      });
    }

    // 2. Validate product / variant exists and check limits/min-quantities
    const product = await prisma.packagingProduct.findUnique({
      where: { id: productId },
    });
    if (!product || !product.active) {
      return NextResponse.json({ error: 'Product not found or inactive.' }, { status: 404 });
    }

    let price = product.price;
    let minQty = product.minQuantity;
    let stock = product.stock;

    if (variantId) {
      const variant = await prisma.packagingVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant || !variant.active || variant.productId !== productId) {
        return NextResponse.json({ error: 'Variant not found or inactive.' }, { status: 404 });
      }
      price = variant.price;
      minQty = variant.minQuantity;
      stock = variant.stock;
    }

    if (quantity < minQty) {
      return NextResponse.json({ error: `Minimum order quantity is ${minQty}.` }, { status: 400 });
    }

    if (quantity > stock) {
      return NextResponse.json({ error: `Only ${stock} items available in stock.` }, { status: 400 });
    }

    // 3. Upsert item in cart
    const existingItem = await prisma.packagingCartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      await prisma.packagingCartItem.update({
        where: { id: existingItem.id },
        data: { quantity },
      });
    } else {
      await prisma.packagingCartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Item updated in cart successfully.' });
  } catch (error: any) {
    console.error('Cart POST error:', error);
    return NextResponse.json({ error: 'Failed to update cart.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    // Check if the item belongs to user's cart
    const item = await prisma.packagingCartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== session.userId) {
      return NextResponse.json({ error: 'Item not found in your cart.' }, { status: 404 });
    }

    await prisma.packagingCartItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true, message: 'Item removed from cart.' });
  } catch (error: any) {
    console.error('Cart DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete cart item.' }, { status: 500 });
  }
}
