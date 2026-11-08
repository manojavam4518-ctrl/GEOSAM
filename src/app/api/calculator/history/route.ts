import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession } from '@/lib/auth';
import { verifyModuleAccess } from '@/lib/modulePermissions';

export async function GET(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'CALCULATION_HISTORY');
    if (!access.authorized) {
      return access.response!;
    }

    // 1. Session Verification
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

    // 2. Build User / Organization Scope
    const where: any = {};
    if (access.user.role !== 'ADMIN') {
      if (access.organizationId) {
        where.user = { organizationId: access.organizationId };
      } else {
        where.userId = session.userId;
      }
    }

    // 3. Auto-Cleanup: Permanently remove calculation history records older than 20 days
    // Each record's 20-day retention is calculated individually from its original creation timestamp
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    try {
      await prisma.calculation.deleteMany({
        where: {
          ...where,
          createdAt: { lt: twentyDaysAgo },
        },
      });
    } catch (cleanupError) {
      console.error('Calculation History Auto-Cleanup Error:', cleanupError);
    }

    // 4. Fetch latest 20 calculations within 20 days
    const history = await prisma.calculation.findMany({
      where: {
        ...where,
        createdAt: { gte: twentyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error('Fetch History Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching history.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const access = await verifyModuleAccess(req, 'CALCULATION_HISTORY');
    if (!access.authorized) {
      return access.response!;
    }

    // 1. Session Verification
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

    // 2. Build User / Organization Scope
    const where: any = {};
    if (access.user.role !== 'ADMIN') {
      if (access.organizationId) {
        where.user = { organizationId: access.organizationId };
      } else {
        where.userId = session.userId;
      }
    }

    const body = await req.json().catch(() => ({}));
    const { mode, startDate, endDate } = body;

    // Mode: DELETE ALL
    if (mode === 'ALL') {
      const result = await prisma.calculation.deleteMany({
        where,
      });

      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `Successfully deleted all (${result.count}) calculation history records.`,
      });
    }

    // Mode: DELETE BY PERIOD
    if (mode === 'PERIOD') {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'Please provide both Start Date and End Date.' },
          { status: 400 }
        );
      }

      // Bound start date to 00:00:00.000 and end date to 23:59:59.999
      let start: Date;
      let end: Date;

      if (typeof startDate === 'string' && startDate.includes('T')) {
        start = new Date(startDate);
      } else {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      }

      if (typeof endDate === 'string' && endDate.includes('T')) {
        end = new Date(endDate);
      } else {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start or end date format.' },
          { status: 400 }
        );
      }

      if (start.getTime() > end.getTime()) {
        return NextResponse.json(
          { error: 'Start Date cannot be after End Date.' },
          { status: 400 }
        );
      }

      const periodWhere = {
        ...where,
        createdAt: {
          gte: start,
          lte: end,
        },
      };

      // Check if any matching records exist before attempting deletion
      const matchingCount = await prisma.calculation.count({
        where: periodWhere,
      });

      if (matchingCount === 0) {
        return NextResponse.json({
          success: false,
          matchingCount: 0,
          message: 'No calculation history records found in the selected period.',
        });
      }

      const result = await prisma.calculation.deleteMany({
        where: periodWhere,
      });

      return NextResponse.json({
        success: true,
        deletedCount: result.count,
        message: `Successfully deleted ${result.count} calculation history record(s) from the selected period.`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid deletion mode specified. Must be "ALL" or "PERIOD".' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Delete History Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting calculation history.' },
      { status: 500 }
    );
  }
}
