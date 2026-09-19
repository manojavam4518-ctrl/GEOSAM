import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { verifyModuleAccess } from '@/lib/modulePermissions';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const verified = await verifyToken(token);
  if (!verified) return null;
  return verifyDeviceSession(verified.sessionToken);
}

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'PACKAGING_SHOP');
    if (!access.authorized) {
      return access.response!;
    }

    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const orders = await prisma.packagingOrder.findMany({
      where: { userId: session.userId },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'PACKAGING_SHOP');
    if (!access.authorized) {
      return access.response!;
    }

    const session = access.session;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { billingDetails } = await req.json();
    if (!billingDetails) {
      return NextResponse.json({ error: 'Billing details are required.' }, { status: 400 });
    }

    const { fullName, email, phone, companyName, address, city, state, country, pincode } = billingDetails;
    if (!fullName || !email || !phone || !companyName || !address || !city || !state || !country || !pincode) {
      return NextResponse.json({ error: 'All billing and shipping details are required.' }, { status: 400 });
    }

    // 1. Fetch user's cart
    const cart = await prisma.packagingCart.findUnique({
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

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    // 2. Calculate prices from DB items to prevent tampering
    let baseAmount = 0;
    const itemsData: any[] = [];

    for (const item of cart.items) {
      let price = item.product.price;
      let variantInfo = null;

      if (item.variantId) {
        if (!item.variant || !item.variant.active) {
          return NextResponse.json({ error: `Variant for product ${item.product.name} is no longer available.` }, { status: 400 });
        }
        price = item.variant.price;
        variantInfo = `${item.variant.length}x${item.variant.width}x${item.variant.height} ${item.variant.dimensionUnit}`;
      } else {
        if (!item.product.active) {
          return NextResponse.json({ error: `Product ${item.product.name} is no longer active.` }, { status: 400 });
        }
      }

      if (price === null || price === undefined) {
        return NextResponse.json({ error: `Price not configured for ${item.product.name}.` }, { status: 400 });
      }

      const itemTotal = price * item.quantity;
      baseAmount += itemTotal;

      itemsData.push({
        productId: item.productId,
        productName: item.product.name,
        variantId: item.variantId || null,
        variantInfo,
        price,
        quantity: item.quantity,
        totalAmount: itemTotal,
      });
    }

    // Get tax settings
    const paymentSettings = await prisma.paymentSettings.findFirst();
    const gstRate = paymentSettings?.gstRate ?? 18.0;
    const gstEnabled = paymentSettings?.gstEnabled ?? true;

    const gstAmount = gstEnabled ? baseAmount * (gstRate / 100) : 0;
    const shippingAmount = baseAmount > 2000 ? 0 : 150.0; // Free shipping above ₹2000, else ₹150
    const totalAmount = baseAmount + gstAmount + shippingAmount;

    // Generate Order Number
    const orderNumber = `ORD-PKG-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Create the order inside transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create Order
      const newOrder = await tx.packagingOrder.create({
        data: {
          userId: session.userId,
          orderNumber,
          status: 'PENDING_PAYMENT',
          baseAmount: parseFloat(baseAmount.toFixed(2)),
          gstAmount: parseFloat(gstAmount.toFixed(2)),
          shippingAmount: parseFloat(shippingAmount.toFixed(2)),
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          billingDetails,
        },
      });

      // Create Order Items & Deduct stock
      for (const item of itemsData) {
        await tx.packagingOrderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            variantInfo: item.variantInfo,
            price: item.price,
            quantity: item.quantity,
            totalAmount: item.totalAmount,
          },
        });

        if (item.variantId) {
          await tx.packagingVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        } else {
          await tx.packagingProduct.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // Clear cart items
      await tx.packagingCartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to process order.' }, { status: 500 });
  }
}
