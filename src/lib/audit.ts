import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type LogAuditInput = {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

/**
 * Tulis entry audit (best-effort).
 * Sengaja tidak `throw` supaya kegagalan logging tidak mengganggu flow utama.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] gagal menulis entry", err);
  }
}
