import "server-only";
import type { Actor } from "@/lib/actor";
import { teamWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function listTeams(
  actor: Actor,
  options?: { activeOnly?: boolean; ledOnly?: boolean },
) {
  return prisma.team.findMany({
    where: teamWhere(actor, options),
    include: {
      leader: { select: { id: true, name: true, email: true } },
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { memberships: true, calendarEntries: true, visits: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getTeam(actor: Actor, id: string) {
  return prisma.team.findFirst({
    where: { AND: [{ id }, teamWhere(actor)] },
    include: {
      leader: { select: { id: true, name: true, email: true } },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              memberships: {
                where: { organizationId: actor.organizationId },
                select: { role: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      visits: {
        where: { status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS", "WAITING"] } },
        include: { customer: { select: { companyName: true } } },
        orderBy: { plannedDate: "asc" },
        take: 10,
      },
    },
  });
}

export async function listOrganizationMembers(actor: Actor) {
  return prisma.user.findMany({
    where: { memberships: { some: { organizationId: actor.organizationId } } },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        where: { organizationId: actor.organizationId },
        select: { role: true },
      },
      teamMemberships: {
        where: { team: { organizationId: actor.organizationId } },
        select: {
          team: { select: { id: true, name: true, isActive: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}
