import type { MembershipRole, Prisma } from "@prisma/client";
import type { Actor } from "@/lib/actor";
import { AppError } from "@/lib/errors";

export function isAdmin(role: MembershipRole) {
  return role === "ADMIN";
}

export function canManageOperations(role: MembershipRole) {
  return role === "ADMIN" || role === "OPERATIONS_MANAGER";
}

export function canManageTeams(role: MembershipRole) {
  return role === "ADMIN";
}

export function canManageAnnouncements(role: MembershipRole) {
  return role === "ADMIN" || role === "TEAM_LEADER";
}

export function canCreateCalendarEntries(role: MembershipRole) {
  return role === "ADMIN" || role === "OPERATIONS_MANAGER" || role === "TEAM_LEADER";
}

/** Ekip lideri kendi ekibinin ziyaretlerini görebilir ve saha kontrolü yapabilir. */
export function canSuperviseTeamVisits(role: MembershipRole) {
  return role === "ADMIN" || role === "OPERATIONS_MANAGER" || role === "TEAM_LEADER";
}

export function assertCanManageOperations(actor: Actor) {
  if (!canManageOperations(actor.role)) {
    throw new AppError("Bu işlem için yetkiniz yok.");
  }
}

export function assertCanManageTeams(actor: Actor) {
  if (!canManageTeams(actor.role)) {
    throw new AppError("Ekip yönetimi için yetkiniz yok.");
  }
}

export function assertCanManageAnnouncements(actor: Actor) {
  if (!canManageAnnouncements(actor.role)) {
    throw new AppError("Duyuru yönetimi için yetkiniz yok.");
  }
}

export function assertCanCreateCalendarEntries(actor: Actor) {
  if (!canCreateCalendarEntries(actor.role)) {
    throw new AppError("Takvim kaydı oluşturmak için yetkiniz yok.");
  }
}

export function assignableFieldRoles(): MembershipRole[] {
  return ["SERVICE_ENGINEER", "TEAM_LEADER"];
}

export function customerWhere(actor: Actor): Prisma.CustomerWhereInput {
  if (actor.role === "ADMIN" || actor.role === "OPERATIONS_MANAGER") {
    return { organizationId: actor.organizationId };
  }
  if (actor.role === "TEAM_LEADER" || actor.role === "SERVICE_ENGINEER") {
    return {
      organizationId: actor.organizationId,
      OR: [
        { visits: { some: { assignments: { some: { userId: actor.userId } } } } },
        {
          visits: {
            some: {
              team: { memberships: { some: { userId: actor.userId } } },
            },
          },
        },
        {
          calendarEntries: {
            some: {
              OR: [
                { assignments: { some: { userId: actor.userId } } },
                { team: { memberships: { some: { userId: actor.userId } } } },
              ],
            },
          },
        },
      ],
    };
  }
  return { organizationId: actor.organizationId };
}

export function equipmentWhere(actor: Actor): Prisma.EquipmentWhereInput {
  if (actor.role === "ADMIN" || actor.role === "OPERATIONS_MANAGER") {
    return { organizationId: actor.organizationId };
  }
  if (actor.role === "TEAM_LEADER") {
    return {
      organizationId: actor.organizationId,
      OR: [
        { teamLinks: { some: { team: { leaderId: actor.userId } } } },
        { visits: { some: { assignments: { some: { userId: actor.userId } } } } },
        { visits: { some: { team: { leaderId: actor.userId } } } },
      ],
    };
  }
  if (actor.role === "SERVICE_ENGINEER") {
    return {
      organizationId: actor.organizationId,
      OR: [
        { teamLinks: { some: { team: { memberships: { some: { userId: actor.userId } } } } } },
        { visits: { some: { assignments: { some: { userId: actor.userId } } } } },
      ],
    };
  }
  return { organizationId: actor.organizationId };
}

export function visitWhere(actor: Actor): Prisma.ServiceVisitWhereInput {
  if (actor.role === "ADMIN" || actor.role === "OPERATIONS_MANAGER") {
    return { organizationId: actor.organizationId };
  }
  if (actor.role === "TEAM_LEADER") {
    return {
      organizationId: actor.organizationId,
      OR: [
        { assignments: { some: { userId: actor.userId } } },
        { team: { leaderId: actor.userId } },
        { team: { memberships: { some: { userId: actor.userId } } } },
        { equipment: { teamLinks: { some: { team: { leaderId: actor.userId } } } } },
        {
          assignments: {
            some: {
              user: {
                teamMemberships: {
                  some: { team: { leaderId: actor.userId } },
                },
              },
            },
          },
        },
      ],
    };
  }
  if (actor.role === "SERVICE_ENGINEER") {
    // Kendi atamaları + üyesi olduğu ekiplerin ziyaretleri (seçilen teamId ile takvimde daralır)
    return {
      organizationId: actor.organizationId,
      OR: [
        { assignments: { some: { userId: actor.userId } } },
        { team: { memberships: { some: { userId: actor.userId } } } },
        { team: { leaderId: actor.userId } },
      ],
    };
  }
  return { organizationId: actor.organizationId };
}

/**
 * Gösterge paneli kapsamı:
 * - Mühendis: yalnızca kendisine atananlar
 * - Operasyon sorumlusu: yalnızca kendi sorumlu olduğu müşterilerin planları
 */
export function dashboardVisitWhere(actor: Actor): Prisma.ServiceVisitWhereInput {
  if (actor.role === "SERVICE_ENGINEER") {
    return {
      organizationId: actor.organizationId,
      assignments: { some: { userId: actor.userId } },
    };
  }
  if (actor.role === "OPERATIONS_MANAGER") {
    return {
      organizationId: actor.organizationId,
      customer: { operationsManagerId: actor.userId },
    };
  }
  return visitWhere(actor);
}

export function teamWhere(
  actor: Actor,
  options?: { activeOnly?: boolean; ledOnly?: boolean },
): Prisma.TeamWhereInput {
  const base: Prisma.TeamWhereInput = {
    organizationId: actor.organizationId,
    ...(options?.activeOnly ? { isActive: true } : {}),
  };
  if (options?.ledOnly) {
    return { ...base, leaderId: actor.userId };
  }
  if (actor.role === "ADMIN" || actor.role === "OPERATIONS_MANAGER") return base;
  return {
    ...base,
    OR: [{ leaderId: actor.userId }, { memberships: { some: { userId: actor.userId } } }],
  };
}

export function calendarEntryWhere(actor: Actor): Prisma.CalendarEntryWhereInput {
  if (actor.role === "ADMIN" || actor.role === "OPERATIONS_MANAGER") {
    return { organizationId: actor.organizationId };
  }
  if (actor.role === "TEAM_LEADER") {
    return {
      organizationId: actor.organizationId,
      team: {
        OR: [{ leaderId: actor.userId }, { memberships: { some: { userId: actor.userId } } }],
      },
    };
  }
  if (actor.role === "SERVICE_ENGINEER") {
    // Takvim kaydının ekibi esas: yalnızca üyesi/lideri olduğu ekiplerin planı
    return {
      organizationId: actor.organizationId,
      OR: [
        { assignments: { some: { userId: actor.userId } } },
        { team: { memberships: { some: { userId: actor.userId } } } },
        { team: { leaderId: actor.userId } },
      ],
    };
  }
  return { organizationId: actor.organizationId };
}

export function announcementWhere(actor: Actor, options?: { manage?: boolean }): Prisma.AnnouncementWhereInput {
  const org = { organizationId: actor.organizationId };

  if (options?.manage) {
    if (actor.role === "ADMIN") return org;
    if (actor.role === "TEAM_LEADER") {
      return {
        ...org,
        OR: [
          { createdById: actor.userId },
          {
            audience: "TEAMS",
            teams: { some: { team: { leaderId: actor.userId } } },
          },
        ],
      };
    }
    return { ...org, id: "00000000-0000-0000-0000-000000000000" };
  }

  const now = new Date();
  const publishedValid: Prisma.AnnouncementWhereInput = {
    ...org,
    status: "PUBLISHED",
    OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
    AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
  };

  // Yönetici tüm yayınlanmış duyuruları görür (ekip hedefli dahil)
  if (actor.role === "ADMIN") return publishedValid;

  return {
    AND: [
      publishedValid,
      {
        OR: [
          { audience: "ALL" },
          {
            audience: "TEAMS",
            teams: {
              some: {
                team: {
                  OR: [{ leaderId: actor.userId }, { memberships: { some: { userId: actor.userId } } }],
                },
              },
            },
          },
        ],
      },
    ],
  };
}
