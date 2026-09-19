import { prisma } from './prisma';

export interface AuditLogOptions {
  action: string;
  adminId?: string | null;
  adminEmail?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  organizationId?: string | null;
  relatedRecordId?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Sanitizes metadata to strictly ensure no passwords, secrets, or tokens are logged.
 */
function sanitizeMetadata(meta?: Record<string, any> | null): Record<string, any> | null {
  if (!meta || typeof meta !== 'object') return null;

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('hash') ||
      lowerKey.includes('cred')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      sanitized[key] = sanitizeMetadata(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Creates an audit log entry in the database.
 */
export async function recordAuditLog(options: AuditLogOptions) {
  try {
    const sanitizedMeta = sanitizeMetadata(options.metadata);
    return await prisma.auditLog.create({
      data: {
        adminId: options.adminId || null,
        adminEmail: options.adminEmail || null,
        userId: options.userId || null,
        userEmail: options.userEmail || null,
        organizationId: options.organizationId || null,
        action: options.action,
        relatedRecordId: options.relatedRecordId || null,
        metadata: sanitizedMeta as any,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
    return null;
  }
}
