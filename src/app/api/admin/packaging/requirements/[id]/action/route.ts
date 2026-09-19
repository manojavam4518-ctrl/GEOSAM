import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/admin-auth';
import { formatDateIndian } from '@/utils/dateUtils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await verifyAdminSession(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, note, question } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
    }

    const requirement = await prisma.customPackagingRequirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
    }

    let updatedStatus = requirement.status;
    let clarificationQuestion = requirement.clarificationQuestion;

    if (action === 'clarify') {
      if (!question) {
        return NextResponse.json({ error: 'Clarification question is required.' }, { status: 400 });
      }
      updatedStatus = 'CLARIFICATION_REQUIRED';
      clarificationQuestion = question;
    } else if (action === 'reject') {
      updatedStatus = 'CUSTOMER_REJECTED';
    } else if (action === 'review') {
      updatedStatus = 'UNDER_REVIEW';
    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    const adminNotes = note
      ? requirement.adminNotes
        ? `${requirement.adminNotes}\n[${formatDateIndian(new Date())}] ${note}`
        : `[${formatDateIndian(new Date())}] ${note}`
      : requirement.adminNotes;

    const updated = await prisma.customPackagingRequirement.update({
      where: { id },
      data: {
        status: updatedStatus,
        clarificationQuestion,
        adminNotes,
      },
    });

    return NextResponse.json({ success: true, requirement: updated });
  } catch (error: any) {
    console.error('Admin requirement action error:', error);
    return NextResponse.json({ error: 'Failed to process action.' }, { status: 500 });
  }
}
