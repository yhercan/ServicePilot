import "server-only";
import { after, connection } from "next/server";
import type { Actor } from "@/lib/actor";
import { istanbulDateKey, parseDateInput } from "@/lib/dates";
import {
  customerWhere,
  dashboardVisitWhere,
  equipmentWhere,
  teamWhere,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { listDashboardAnnouncements } from "@/modules/announcements/queries";
import { processDueNextVisitReminders } from "@/modules/notifications/notify";
import { listRecentNotifications } from "@/modules/notifications/queries";
import { getOrCreateUserSettings } from "@/modules/settings/queries";

const openStatuses = ["PLANNED", "ASSIGNED", "IN_PROGRESS", "WAITING"] as const;

export async function getDashboard(actor: Actor) {
  await connection();
  const organizationId = actor.organizationId;
  after(() => {
    void processDueNextVisitReminders(organizationId);
  });

  const todayKey = istanbulDateKey(new Date());
  const startOfToday = parseDateInput(todayKey);
  const scope = dashboardVisitWhere(actor);
  const settings = await getOrCreateUserSettings(actor);

  const [
    customerCount,
    equipmentCount,
    openCount,
    inProgressCount,
    upcoming,
    followUps,
    completed,
    recentVisits,
    teams,
    announcements,
    notifications,
  ] = await Promise.all([
    prisma.customer.count({ where: customerWhere(actor) }),
    prisma.equipment.count({ where: equipmentWhere(actor) }),
    prisma.serviceVisit.count({ where: { AND: [scope, { status: { in: [...openStatuses] } }] } }),
    prisma.serviceVisit.count({ where: { AND: [scope, { status: "IN_PROGRESS" }] } }),
    settings.showUpcomingOnDashboard
      ? prisma.serviceVisit.findMany({
          where: {
            AND: [scope, { status: { in: [...openStatuses] } }, { plannedDate: { gte: startOfToday } }],
          },
          include: {
            customer: { select: { companyName: true } },
            equipment: { select: { name: true } },
            team: { select: { id: true, name: true } },
          },
          orderBy: { plannedDate: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    settings.showFollowUpsOnDashboard
      ? prisma.serviceVisit.findMany({
          where: {
            AND: [scope, { nextVisitEnabled: true, nextVisitDate: { not: null } }],
          },
          include: {
            customer: { select: { companyName: true } },
            equipment: { select: { name: true } },
            team: { select: { id: true, name: true } },
          },
          orderBy: { nextVisitDate: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    prisma.serviceVisit.findMany({
      where: { AND: [scope, { status: "COMPLETED" }] },
      include: {
        customer: { select: { companyName: true } },
        equipment: { select: { name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: [{ actualEndDate: "desc" }, { updatedAt: "desc" }],
      take: 5,
    }),
    prisma.serviceVisit.findMany({
      where: scope,
      include: {
        customer: { select: { companyName: true } },
        team: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.team.findMany({
      where: teamWhere(actor, { activeOnly: true }),
      include: {
        _count: {
          select: {
            memberships: true,
            visits: { where: { status: { in: [...openStatuses] } } },
          },
        },
      },
      orderBy: { name: "asc" },
      take: 12,
    }),
    listDashboardAnnouncements(actor),
    listRecentNotifications(actor, 8),
  ]);

  const visitsByTeam = await prisma.serviceVisit.groupBy({
    by: ["teamId"],
    where: { AND: [scope, { status: { in: [...openStatuses] } }] },
    _count: { _all: true },
  });

  const teamNames = await prisma.team.findMany({
    where: {
      organizationId: actor.organizationId,
      id: { in: visitsByTeam.map((row) => row.teamId).filter((id): id is string => Boolean(id)) },
    },
    select: { id: true, name: true },
  });
  const teamNameMap = new Map(teamNames.map((team) => [team.id, team.name]));

  return {
    settings,
    customerCount,
    equipmentCount,
    openCount,
    inProgressCount,
    upcoming,
    followUps,
    completed,
    recentVisits,
    teams,
    announcements,
    notifications,
    visitsByTeam: [
      ...visitsByTeam
        .filter((row) => row.teamId)
        .map((row) => ({
          teamId: row.teamId as string,
          teamName: teamNameMap.get(row.teamId as string) ?? "Ekip",
          count: row._count._all,
        })),
      ...(() => {
        const unassigned = visitsByTeam.find((row) => row.teamId === null);
        return unassigned
          ? [{ teamId: "unassigned", teamName: "Ekipsiz", count: unassigned._count._all }]
          : [];
      })(),
    ],
  };
}
