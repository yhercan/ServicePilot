import "server-only";
import type { Prisma, ServiceStatus } from "@prisma/client";
import type { Actor } from "@/lib/actor";
import { visitWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const visitListInclude = {
  customer: { select: { id: true, companyName: true } },
  equipment: { select: { id: true, name: true } },
  assignments: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.ServiceVisitInclude;

export const visitDetailInclude = {
  customer: true,
  equipment: true,
  team: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  assignments: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { assignedAt: "asc" },
  },
  comments: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
  statusHistory: {
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  },
  attachments: {
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.ServiceVisitInclude;

export async function listVisits(actor: Actor, query: string, status?: ServiceStatus) {
  return prisma.serviceVisit.findMany({
    where: {
      AND: [
        visitWhere(actor),
        status ? { status } : {},
        query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { customer: { companyName: { contains: query, mode: "insensitive" } } },
                { equipment: { name: { contains: query, mode: "insensitive" } } },
                { sapReferenceNumber: { contains: query, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    include: visitListInclude,
    orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function getVisit(actor: Actor, id: string) {
  return prisma.serviceVisit.findFirst({
    where: { AND: [{ id }, visitWhere(actor)] },
    include: visitDetailInclude,
  });
}

export async function listVisitsBetween(actor: Actor, start: Date, end: Date) {
  return prisma.serviceVisit.findMany({
    where: {
      AND: [visitWhere(actor), { plannedDate: { gte: start, lte: end } }],
    },
    select: {
      id: true,
      title: true,
      plannedDate: true,
      serviceType: true,
      status: true,
      priority: true,
      customer: { select: { companyName: true } },
    },
    orderBy: { plannedDate: "asc" },
  });
}

export async function listVisitFormOptions(actor: Actor) {
  const [customers, orgTeams] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId: actor.organizationId },
      select: {
        id: true,
        companyName: true,
        equipment: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            teamLinks: {
              select: { team: { select: { id: true, name: true } } },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { companyName: "asc" },
    }),
    prisma.team.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        leaderId: true,
        leader: { select: { id: true, name: true } },
        memberships: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const teams = orgTeams.map((team) => ({ id: team.id, name: team.name }));

  if (actor.role === "TEAM_LEADER") {
    const led = orgTeams.filter((team) => team.leaderId === actor.userId);
    const map = new Map<string, { id: string; name: string; teamIds: string[] }>();
    for (const team of led) {
      if (team.leader) {
        const existing = map.get(team.leader.id);
        map.set(team.leader.id, {
          id: team.leader.id,
          name: team.leader.name,
          teamIds: [...new Set([...(existing?.teamIds ?? []), team.id])],
        });
      }
      for (const membership of team.memberships) {
        const existing = map.get(membership.user.id);
        map.set(membership.user.id, {
          id: membership.user.id,
          name: membership.user.name,
          teamIds: [...new Set([...(existing?.teamIds ?? []), team.id])],
        });
      }
    }
    const technicians = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return { customers, technicians, teams: led.map((team) => ({ id: team.id, name: team.name })) };
  }

  const techMap = new Map<string, { id: string; name: string; teamIds: string[] }>();
  for (const team of orgTeams) {
    if (team.leader) {
      const existing = techMap.get(team.leader.id);
      techMap.set(team.leader.id, {
        id: team.leader.id,
        name: team.leader.name,
        teamIds: [...new Set([...(existing?.teamIds ?? []), team.id])],
      });
    }
    for (const membership of team.memberships) {
      const existing = techMap.get(membership.user.id);
      techMap.set(membership.user.id, {
        id: membership.user.id,
        name: membership.user.name,
        teamIds: [...new Set([...(existing?.teamIds ?? []), team.id])],
      });
    }
  }

  // Ekibe bağlı olmayan saha personeli de listede kalsın
  const loose = await prisma.user.findMany({
    where: {
      memberships: {
        some: {
          organizationId: actor.organizationId,
          role: { in: ["SERVICE_ENGINEER", "TEAM_LEADER"] },
        },
      },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  for (const user of loose) {
    if (!techMap.has(user.id)) {
      techMap.set(user.id, { id: user.id, name: user.name, teamIds: [] });
    }
  }

  const technicians = [...techMap.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return { customers, technicians, teams };
}
