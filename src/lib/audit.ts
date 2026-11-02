import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditClient = Prisma.TransactionClient | typeof prisma;

export async function writeAudit(
  entry: {
    organizationId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
  },
  client: AuditClient = prisma,
) {
  await client.auditLog.create({ data: entry });
}
