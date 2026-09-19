import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-token';
import { verifyDeviceSession, hashPassword } from '@/lib/auth';
import { PLATFORM_MODULES } from '@/lib/modulePermissions';
import { recordAuditLog } from '@/lib/audit';

async function getSessionOrganization(userId: string, userOrgId?: string | null) {
  if (userOrgId) {
    const org = await prisma.organization.findUnique({ where: { id: userOrgId } });
    if (org) return org;
  }
  return await prisma.organization.findFirst({
    where: { OR: [{ ownerId: userId }, { adminUserId: userId }] },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session || (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Organization Admin access required.' }, { status: 403 });
    }

    const org = await getSessionOrganization(session.userId, session.user.organizationId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: org.id,
        isAdditionalUser: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User account not found in this organization.' }, { status: 404 });
    }

    const body = await req.json();
    const { status, roleId } = body;

    // 1. Handle Role Change (Requirements 26 & 27)
    if (roleId) {
      const platformRole = await (prisma as any).platformRole.findUnique({
        where: { id: roleId },
      });

      if (!platformRole) {
        return NextResponse.json({ error: 'Selected role does not exist.' }, { status: 404 });
      }

      if (!platformRole.active) {
        return NextResponse.json(
          { error: `The role '${platformRole.name}' is deactivated and cannot be assigned.` },
          { status: 400 }
        );
      }

      const previousRole = targetUser.assignedRoleName || 'Unassigned';
      const newRole = platformRole.name;
      const newModules = platformRole.moduleKeys || [];

      // Update User role and module permissions immediately
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          assignedRoleId: platformRole.id,
          assignedRoleName: platformRole.name,
          assignedModules: newModules,
        },
        select: {
          id: true,
          name: true,
          email: true,
          assignedRoleId: true,
          assignedRoleName: true,
          assignedModules: true,
        },
      });

      // Update UserLicense record as well
      await (prisma as any).userLicense.updateMany({
        where: { userId: id, organizationId: org.id },
        data: {
          roleId: platformRole.id,
          roleName: platformRole.name,
          assignedModules: newModules,
          designation: platformRole.name,
        },
      });

      // Update Employee record designation
      await prisma.employee.updateMany({
        where: { userId: id, organizationId: org.id },
        data: { designation: platformRole.name },
      });

      // Record Audit Log (Requirement 27)
      await recordAuditLog({
        userId: session.user.id,
        userEmail: session.user.email,
        organizationId: org.id,
        action: `Changed User Role: ${targetUser.name} (${previousRole} → ${newRole})`,
        relatedRecordId: id,
        metadata: {
          targetUserId: id,
          targetUserName: targetUser.name,
          previousRole,
          newRole,
          organizationId: org.id,
          changedBy: session.user.email,
          newModules,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Role for '${targetUser.name}' updated to '${newRole}'. Module permissions updated successfully.`,
        user: updatedUser,
      });
    }

    // 2. Handle Status Toggle (ACTIVE / DISABLED)
    if (status) {
      if (!['ACTIVE', 'DISABLED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status. Must be ACTIVE or DISABLED.' }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { status },
        select: { id: true, name: true, email: true, status: true },
      });

      await (prisma as any).userLicense.updateMany({
        where: { userId: id, organizationId: org.id },
        data: { status: status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE' },
      });

      await recordAuditLog({
        userId: session.user.id,
        userEmail: session.user.email,
        organizationId: org.id,
        action: `User Account ${status === 'ACTIVE' ? 'Activated' : 'Deactivated'}: ${targetUser.name}`,
        relatedRecordId: id,
        metadata: { targetUserId: id, targetUserName: targetUser.name, newStatus: status },
      });

      return NextResponse.json({
        success: true,
        message: `User '${updatedUser.name}' is now ${status}.`,
        user: updatedUser,
      });
    }

    return NextResponse.json({ error: 'No valid update fields provided.' }, { status: 400 });
  } catch (error: any) {
    console.error('Organization User PATCH Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const verified = await verifyToken(token);
    if (!verified) {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }

    const session = await verifyDeviceSession(verified.sessionToken);
    if (!session || (session.user.role !== 'ORG_ADMIN' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Organization Admin access required.' }, { status: 403 });
    }

    const org = await getSessionOrganization(session.userId, session.user.organizationId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 400 });
    }

    const { newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: org.id,
        isAdditionalUser: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User account not found in this organization.' }, { status: 404 });
    }

    // Securely hash with bcrypt - NEVER store or display plaintext (Requirement 22)
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
      },
    });

    await recordAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      organizationId: org.id,
      action: `Password Reset by Admin for User: ${targetUser.name}`,
      relatedRecordId: id,
      metadata: { targetUserId: id, targetUserName: targetUser.name },
    });

    return NextResponse.json({
      success: true,
      message: `Password has been reset securely for '${targetUser.name}'. The new password hash has been saved.`,
    });
  } catch (error: any) {
    console.error('Organization User Password Reset Error:', error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}
