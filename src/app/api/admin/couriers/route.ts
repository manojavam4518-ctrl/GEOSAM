import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const couriers = await prisma.courierPartner.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      couriers,
    });
  } catch (error: any) {
    console.error('Admin Couriers GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id, name, trackingUrl, pincodeServiceabilityUrl, active, displayOrder, logoUrl } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Courier name is required.' }, { status: 400 });
    }

    const order = parseInt(displayOrder) || 0;

    let courier;

    if (id) {
      // Edit Courier
      courier = await prisma.courierPartner.update({
        where: { id },
        data: {
          name,
          trackingUrl: trackingUrl || null,
          pincodeServiceabilityUrl: pincodeServiceabilityUrl || null,
          active: active !== undefined ? !!active : true,
          displayOrder: order,
          logoUrl,
        },
      });

      await prisma.auditLog.create({
        data: {
          adminId: adminSession.userId,
          adminEmail: adminSession.user.email,
          action: `Modified Courier Partner: ${name}`,
          relatedRecordId: courier.id,
        },
      });
    } else {
      // Add Courier
      // Check if duplicate name
      const existing = await prisma.courierPartner.findUnique({ where: { name } });
      if (existing) {
        return NextResponse.json({ error: 'Courier company name already exists.' }, { status: 400 });
      }

      courier = await prisma.courierPartner.create({
        data: {
          name,
          trackingUrl: trackingUrl || null,
          pincodeServiceabilityUrl: pincodeServiceabilityUrl || null,
          active: active !== undefined ? !!active : true,
          displayOrder: order,
          logoUrl,
        },
      });

      await prisma.auditLog.create({
        data: {
          adminId: adminSession.userId,
          adminEmail: adminSession.user.email,
          action: `Added Courier Partner: ${name}`,
          relatedRecordId: courier.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Courier partner saved successfully.',
      courier,
    });
  } catch (error: any) {
    console.error('Admin Couriers POST error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSession = await verifyAdminSession(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Courier ID is required.' }, { status: 400 });
    }

    const courier = await prisma.courierPartner.findUnique({ where: { id } });
    if (!courier) {
      return NextResponse.json({ error: 'Courier not found.' }, { status: 404 });
    }

    await prisma.courierPartner.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        adminId: adminSession.userId,
        adminEmail: adminSession.user.email,
        action: `Deleted Courier Partner: ${courier.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Courier partner '${courier.name}' deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Admin Couriers DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
