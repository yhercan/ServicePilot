import "server-only";
import type { Actor } from "@/lib/actor";
import { calendarEntryWhere, teamWhere, visitWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function listCalendarEntriesBetween(
  actor: Actor,
  start: Date,
  end: Date,
  teamId: string,
  personId?: string | null,
) {
  return prisma.calendarEntry.findMany({
    where: {
      AND: [
        calendarEntryWhere(actor),
        { entryDate: { gte: start, lte: end } },
        { teamId },
        personId ? { assignments: { some: { userId: personId } } } : {},
      ],
    },
    include: {
      team: { select: { id: true, name: true } },
      customer: { select: { id: true, companyName: true } },
      equipment: { select: { id: true, name: true } },
      serviceVisit: { select: { id: true, title: true, status: true } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ entryDate: "asc" }, { title: "asc" }],
  });
}

export async function listVisitsForCalendar(
  actor: Actor,
  start: Date,
  end: Date,
  teamId: string,
  personId?: string | null,
) {
  return prisma.serviceVisit.findMany({
    where: {
      AND: [
        visitWhere(actor),
        { plannedDate: { gte: start, lte: end } },
        { teamId },
        personId ? { assignments: { some: { userId: personId } } } : {},
      ],
    },
    include: {
      customer: { select: { companyName: true } },
      equipment: { select: { name: true } },
      team: { select: { id: true, name: true } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { plannedDate: "asc" },
  });
}

export async function listTeamPeople(actor: Actor, teamId: string) {
  const team = await prisma.team.findFirst({
    where: { AND: [{ id: teamId }, teamWhere(actor)] },
    include: {
      leader: { select: { id: true, name: true } },
      memberships: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!team) return [];
  const map = new Map<string, string>();
  for (const membership of team.memberships) {
    map.set(membership.user.id, membership.user.name);
  }
  if (team.leader) map.set(team.leader.id, team.leader.name);
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function getCalendarEntry(actor: Actor, id: string) {
  return prisma.calendarEntry.findFirst({
    where: { AND: [{ id }, calendarEntryWhere(actor)] },
    include: {
      team: { select: { id: true, name: true, leaderId: true } },
      customer: { select: { id: true, companyName: true } },
      equipment: { select: { id: true, name: true } },
      serviceVisit: { select: { id: true, title: true, status: true } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function listCalendarFormOptions(actor: Actor) {
  const ledOnly = actor.role === "TEAM_LEADER";
  const [teams, customers, teamRows, visits] = await Promise.all([
    prisma.team.findMany({
      where: teamWhere(actor, { activeOnly: true, ledOnly }),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { organizationId: actor.organizationId },
      select: {
        id: true,
        companyName: true,
        equipment: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: { companyName: "asc" },
    }),
    prisma.team.findMany({
      where: teamWhere(actor, { activeOnly: true, ledOnly }),
      select: {
        id: true,
        leaderId: true,
        leader: { select: { id: true, name: true } },
        memberships: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.serviceVisit.findMany({
      where: {
        AND: [
          visitWhere(actor),
          { status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS", "WAITING"] } },
        ],
      },
      select: { id: true, title: true, customerId: true, equipmentId: true, plannedDate: true },
      orderBy: { plannedDate: "asc" },
      take: 100,
    }),
  ]);

  const memberMap = new Map<string, { id: string; name: string; teamIds: string[] }>();
  for (const team of teamRows) {
    if (team.leader) {
      const existing = memberMap.get(team.leader.id);
      memberMap.set(team.leader.id, {
        id: team.leader.id,
        name: team.leader.name,
        teamIds: [...(existing?.teamIds ?? []), team.id],
      });
    }
    for (const membership of team.memberships) {
      const existing = memberMap.get(membership.user.id);
      memberMap.set(membership.user.id, {
        id: membership.user.id,
        name: membership.user.name,
        teamIds: [...new Set([...(existing?.teamIds ?? []), team.id])],
      });
    }
  }

  const members = [...memberMap.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return { teams, customers, members, visits };
}
