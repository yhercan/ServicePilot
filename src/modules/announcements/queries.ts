import "server-only";
import type { Actor } from "@/lib/actor";
import { announcementWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function listAnnouncements(actor: Actor, manage = false) {
  const where =
    manage && actor.role === "TEAM_LEADER"
      ? {
          OR: [announcementWhere(actor, { manage: true }), announcementWhere(actor)],
        }
      : announcementWhere(actor, { manage });

  return prisma.announcement.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      teams: { include: { team: { select: { id: true, name: true } } } },
    },
    orderBy: [{ status: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function getAnnouncement(actor: Actor, id: string, manage = false) {
  return prisma.announcement.findFirst({
    where: { AND: [{ id }, announcementWhere(actor, { manage })] },
    include: {
      createdBy: { select: { id: true, name: true } },
      teams: { include: { team: { select: { id: true, name: true } } } },
    },
  });
}

export async function listDashboardAnnouncements(actor: Actor) {
  return prisma.announcement.findMany({
    where: announcementWhere(actor),
    include: {
      createdBy: { select: { name: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 5,
  });
}
