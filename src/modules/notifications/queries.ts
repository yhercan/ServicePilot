import "server-only";
import { connection } from "next/server";
import type { Actor } from "@/lib/actor";
import { prisma } from "@/lib/prisma";

export async function listRecentNotifications(actor: Actor, take = 12) {
  await connection();
  return prisma.notification.findMany({
    where: { organizationId: actor.organizationId, userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function countUnreadNotifications(actor: Actor) {
  await connection();
  return prisma.notification.count({
    where: {
      organizationId: actor.organizationId,
      userId: actor.userId,
      readAt: null,
    },
  });
}
