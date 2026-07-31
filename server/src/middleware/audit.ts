import { prisma } from "../db.js";
import { AuthenticatedRequest } from "../types.js";

export interface AuditEntry {
  action: string;
  entity?: string;
  entityId?: string | number;
  details?: string;
}

/**
 * Persists an audit log entry from an authenticated admin request.
 */
export async function writeAudit(req: AuthenticatedRequest, entry: AuditEntry): Promise<void> {
  try {
    const ipAddress = req.ip || req.socket?.remoteAddress || null;
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.admin ? Number(req.admin.sub) : null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId != null ? String(entry.entityId) : null,
        details: entry.details,
        ipAddress,
      },
    });
  } catch (e) {
    // Audit logging must never break the main request flow.
    console.error("[audit] failed to write log", e);
  }
}

