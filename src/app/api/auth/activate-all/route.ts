import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const result = await prisma.user.updateMany({
      data: {
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully activated ${result.count} user accounts.`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Activate All Accounts Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
