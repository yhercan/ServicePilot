"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MembershipRole, Prisma } from "@prisma/client";
import { actionError, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { requireActor } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertCanManageTeams, teamWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  addExistingMemberSchema,
  createEmployeeSchema,
  removeTeamMemberSchema,
  teamMembersSchema,
  teamSchema,
  updateMemberRoleSchema,
  updateOrganizationRoleSchema,
} from "@/modules/teams/schema";

function refreshTeams(id?: string) {
  revalidatePath("/ekibim");
  revalidatePath("/ekibim/personel");
  revalidatePath("/panel");
  revalidatePath("/takvim");
  if (id) revalidatePath(`/ekibim/${id}`);
}

async function assertOrgUser(organizationId: string, userId: string | null) {
  if (!userId) return null;
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId },
    select: { userId: true },
  });
  if (!membership) throw new AppError("Seçilen kullanıcı bu organizasyona ait değil.");
  return userId;
}

async function assertCanChangeRole(
  tx: Prisma.TransactionClient,
  organizationId: string,
  actorUserId: string,
  targetUserId: string,
  nextRole: MembershipRole,
) {
  if (targetUserId === actorUserId && nextRole !== "ADMIN") {
    const adminCount = await tx.membership.count({
      where: { organizationId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new AppError("Son yönetici kendi rolünü değiştiremez.");
    }
  }

  const current = await tx.membership.findFirst({
    where: { organizationId, userId: targetUserId },
    select: { role: true },
  });
  if (current?.role === "ADMIN" && nextRole !== "ADMIN") {
    const adminCount = await tx.membership.count({
      where: { organizationId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new AppError("Organizasyonda en az bir yönetici kalmalıdır.");
    }
  }
}

export async function createTeam(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageTeams(actor);
    const parsed = teamSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const leaderId = await assertOrgUser(actor.organizationId, parsed.data.leaderId);

    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          organizationId: actor.organizationId,
          name: parsed.data.name,
          description: parsed.data.description,
          leaderId,
        },
      });
      if (leaderId) {
        await tx.teamMembership.create({
          data: { teamId: created.id, userId: leaderId },
        });
        const leaderMembership = await tx.membership.findFirst({
          where: { organizationId: actor.organizationId, userId: leaderId },
          select: { role: true },
        });
        if (leaderMembership?.role === "SERVICE_ENGINEER") {
          await tx.membership.updateMany({
            where: { organizationId: actor.organizationId, userId: leaderId },
            data: { role: "TEAM_LEADER" },
          });
        }
      }
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "team.create",
          entityType: "Team",
          entityId: created.id,
        },
        tx,
      );
      return created;
    });
    id = team.id;
  } catch (error) {
    return actionError(error);
  }

  refreshTeams(id);
  redirect(`/ekibim/${id}`);
}

export async function updateTeam(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageTeams(actor);
    id = String(formData.get("id") ?? "");
    const parsed = teamSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const leaderId = await assertOrgUser(actor.organizationId, parsed.data.leaderId);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.team.findFirst({
        where: { AND: [{ id }, teamWhere(actor)] },
        select: { id: true },
      });
      if (!existing) return null;
      const result = await tx.team.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          leaderId,
        },
      });
      if (leaderId) {
        await tx.teamMembership.upsert({
          where: { teamId_userId: { teamId: existing.id, userId: leaderId } },
          create: { teamId: existing.id, userId: leaderId },
          update: {},
        });
        const leaderMembership = await tx.membership.findFirst({
          where: { organizationId: actor.organizationId, userId: leaderId },
          select: { role: true },
        });
        if (leaderMembership?.role === "SERVICE_ENGINEER") {
          await tx.membership.updateMany({
            where: { organizationId: actor.organizationId, userId: leaderId },
            data: { role: "TEAM_LEADER" },
          });
        }
      }
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "team.update",
          entityType: "Team",
          entityId: result.id,
        },
        tx,
      );
      return result;
    });
    if (!updated) return { error: "Ekip bulunamadı." };
  } catch (error) {
    return actionError(error);
  }

  refreshTeams(id);
  redirect(`/ekibim/${id}`);
}

export async function setTeamActive(formData: FormData) {
  const actor = await requireActor();
  assertCanManageTeams(actor);
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  await prisma.$transaction(async (tx) => {
    const existing = await tx.team.findFirst({
      where: { AND: [{ id }, teamWhere(actor)] },
      select: { id: true },
    });
    if (!existing) return;
    await tx.team.update({ where: { id: existing.id }, data: { isActive: active } });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: active ? "team.activate" : "team.deactivate",
        entityType: "Team",
        entityId: existing.id,
      },
      tx,
    );
  });

  refreshTeams(id);
  redirect(`/ekibim/${id}`);
}

export async function deleteTeam(formData: FormData) {
  const actor = await requireActor();
  assertCanManageTeams(actor);
  const id = String(formData.get("id") ?? "");

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.team.findFirst({
        where: { AND: [{ id }, teamWhere(actor)] },
        select: { id: true },
      });
      if (!existing) return;

      await tx.serviceVisit.updateMany({
        where: { teamId: existing.id, organizationId: actor.organizationId },
        data: { teamId: null },
      });
      await tx.calendarEntry.deleteMany({
        where: { teamId: existing.id, organizationId: actor.organizationId },
      });
      await tx.announcementTeam.deleteMany({ where: { teamId: existing.id } });
      await tx.teamMembership.deleteMany({ where: { teamId: existing.id } });
      await tx.team.delete({ where: { id: existing.id } });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "team.delete",
          entityType: "Team",
          entityId: existing.id,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/ekibim/${id}?hata=${encodeURIComponent(error.message)}`);
    }
    redirect(`/ekibim/${id}?hata=${encodeURIComponent("Ekip silinemedi.")}`);
  }

  refreshTeams();
  redirect("/ekibim");
}

export async function removeEmployeeFromOrganization(formData: FormData) {
  const actor = await requireActor();
  assertCanManageTeams(actor);
  const userId = String(formData.get("userId") ?? "");

  try {
    if (!z.uuid().safeParse(userId).success) {
      throw new AppError("Personel bilgisi geçersiz.");
    }
    if (userId === actor.userId) {
      throw new AppError("Kendi hesabınızı silemezsiniz.");
    }

    await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findFirst({
        where: { organizationId: actor.organizationId, userId },
        select: { id: true, role: true },
      });
      if (!membership) throw new AppError("Personel bulunamadı.");

      if (membership.role === "ADMIN") {
        const adminCount = await tx.membership.count({
          where: { organizationId: actor.organizationId, role: "ADMIN" },
        });
        if (adminCount <= 1) {
          throw new AppError("Organizasyonda en az bir yönetici kalmalıdır.");
        }
      }

      await tx.team.updateMany({
        where: { organizationId: actor.organizationId, leaderId: userId },
        data: { leaderId: null },
      });
      await tx.teamMembership.deleteMany({
        where: {
          userId,
          team: { organizationId: actor.organizationId },
        },
      });
      await tx.customer.updateMany({
        where: { organizationId: actor.organizationId, operationsManagerId: userId },
        data: { operationsManagerId: null },
      });
      await tx.calendarEntryAssignment.deleteMany({
        where: {
          userId,
          calendarEntry: { organizationId: actor.organizationId },
        },
      });
      await tx.membership.delete({ where: { id: membership.id } });

      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "employee.remove",
          entityType: "User",
          entityId: userId,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/ekibim/personel?hata=${encodeURIComponent(error.message)}`);
    }
    redirect(`/ekibim/personel?hata=${encodeURIComponent("Personel silinemedi.")}`);
  }

  refreshTeams();
  redirect("/ekibim/personel");
}

export async function updateTeamMembers(formData: FormData) {
  const actor = await requireActor();
  assertCanManageTeams(actor);
  const teamId = String(formData.get("teamId") ?? "");
  const memberIds = formData.getAll("memberIds").map(String).filter(Boolean);
  const parsed = teamMembersSchema.safeParse({ teamId, memberIds });
  if (!parsed.success) {
    redirect(`/ekibim/${teamId}?hata=${encodeURIComponent("Üye seçimi geçersiz.")}`);
  }

  const team = await prisma.team.findFirst({
    where: { AND: [{ id: parsed.data.teamId }, teamWhere(actor)] },
    select: { id: true, leaderId: true },
  });
  if (!team) {
    redirect(`/ekibim?hata=${encodeURIComponent("Ekip bulunamadı.")}`);
  }

  const unique = [...new Set(parsed.data.memberIds)];
  if (team.leaderId && !unique.includes(team.leaderId)) {
    unique.push(team.leaderId);
  }

  const members = await prisma.membership.findMany({
    where: { organizationId: actor.organizationId, userId: { in: unique } },
    select: { userId: true },
  });
  if (members.length !== unique.length) {
    redirect(
      `/ekibim/${teamId}?hata=${encodeURIComponent("Seçilen üyelerden bazıları organizasyona ait değil.")}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMembership.deleteMany({
      where: {
        teamId: team.id,
        userId: { notIn: unique },
      },
    });
    for (const userId of unique) {
      await tx.teamMembership.upsert({
        where: { teamId_userId: { teamId: team.id, userId } },
        create: { teamId: team.id, userId },
        update: {},
      });
    }
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "team.members.update",
        entityType: "Team",
        entityId: team.id,
      },
      tx,
    );
  });

  refreshTeams(teamId);
  redirect(`/ekibim/${teamId}`);
}

export async function createEmployee(_state: ActionState, formData: FormData): Promise<ActionState> {
  let redirectTo = "/ekibim/personel";
  try {
    const actor = await requireActor();
    assertCanManageTeams(actor);
    const parsed = createEmployeeSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

    const email = parsed.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        memberships: {
          where: { organizationId: actor.organizationId },
          select: { id: true },
        },
      },
    });
    if (existingUser?.memberships.length) {
      return { error: "Bu e-posta ile organizasyonda zaten bir personel var." };
    }

    if (parsed.data.teamId) {
      const team = await prisma.team.findFirst({
        where: { AND: [{ id: parsed.data.teamId }, teamWhere(actor)] },
        select: { id: true },
      });
      if (!team) return { error: "Seçilen ekip bulunamadı." };
      redirectTo = `/ekibim/${team.id}`;
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const role = parsed.data.role as MembershipRole;

    await prisma.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            name: parsed.data.name,
            email,
            passwordHash,
          },
          select: { id: true },
        }));

      if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { name: parsed.data.name, passwordHash },
        });
      }

      await tx.membership.create({
        data: {
          organizationId: actor.organizationId,
          userId: user.id,
          role,
        },
      });

      if (parsed.data.teamId) {
        await tx.teamMembership.create({
          data: { teamId: parsed.data.teamId, userId: user.id },
        });
        if (parsed.data.setAsLeader) {
          await tx.team.update({
            where: { id: parsed.data.teamId },
            data: { leaderId: user.id },
          });
        }
      }

      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "employee.create",
          entityType: "User",
          entityId: user.id,
        },
        tx,
      );
    });
  } catch (error) {
    return actionError(error);
  }

  refreshTeams();
  redirect(redirectTo);
}

export async function addExistingMemberToTeam(formData: FormData) {
  const actor = await requireActor();
  assertCanManageTeams(actor);
  const parsed = addExistingMemberSchema.safeParse({
    teamId: formData.get("teamId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
    setAsLeader: formData.get("setAsLeader") ?? "",
  });
  if (!parsed.success) {
    const teamId = String(formData.get("teamId") ?? "");
    redirect(`/ekibim/${teamId}?hata=${encodeURIComponent("Üye bilgileri geçersiz.")}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const team = await tx.team.findFirst({
        where: { AND: [{ id: parsed.data.teamId }, teamWhere(actor)] },
        select: { id: true },
      });
      if (!team) throw new AppError("Ekip bulunamadı.");

      const membership = await tx.membership.findFirst({
        where: { organizationId: actor.organizationId, userId: parsed.data.userId },
        select: { id: true, role: true },
      });
      if (!membership) throw new AppError("Personel bu organizasyonda değil.");

      await assertCanChangeRole(
        tx,
        actor.organizationId,
        actor.userId,
        parsed.data.userId,
        parsed.data.role as MembershipRole,
      );

      await tx.membership.update({
        where: { id: membership.id },
        data: { role: parsed.data.role as MembershipRole },
      });

      await tx.teamMembership.upsert({
        where: { teamId_userId: { teamId: team.id, userId: parsed.data.userId } },
        create: { teamId: team.id, userId: parsed.data.userId },
        update: {},
      });

      if (parsed.data.setAsLeader) {
        await tx.team.update({
          where: { id: team.id },
          data: { leaderId: parsed.data.userId },
        });
      }

      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "team.member.add",
          entityType: "Team",
          entityId: team.id,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/ekibim/${parsed.data.teamId}?hata=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  refreshTeams(parsed.data.teamId);
  redirect(`/ekibim/${parsed.data.teamId}`);
}

export async function updateTeamMemberRole(formData: FormData) {
  const actor = await requireActor();
  assertCanManageTeams(actor);
  const parsed = updateMemberRoleSchema.safeParse({
    teamId: formData.get("teamId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    const teamId = String(formData.get("teamId") ?? "");
    redirect(`/ekibim/${teamId}?hata=${encodeURIComponent("Rol bilgisi geçersiz.")}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const teamMember = await tx.teamMembership.findFirst({
        where: {
          teamId: parsed.data.teamId,
          userId: parsed.data.userId,
          team: { organizationId: actor.organizationId },
        },
        select: { id: true },
      });
      if (!teamMember) throw new AppError("Üye bu ekipte bulunamadı.");

      const membership = await tx.membership.findFirst({
        where: { organizationId: actor.organizationId, userId: parsed.data.userId },
        select: { id: true },
      });
      if (!membership) throw new AppError("Organizasyon üyeliği bulunamadı.");

      await assertCanChangeRole(
        tx,
        actor.organizationId,
        actor.userId,
        parsed.data.userId,
        parsed.data.role as MembershipRole,
      );

      await tx.membership.update({
        where: { id: membership.id },
        data: { role: parsed.data.role as MembershipRole },
      });

      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "employee.role.update",
          entityType: "User",
          entityId: parsed.data.userId,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/ekibim/${parsed.data.teamId}?hata=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  refreshTeams(parsed.data.teamId);
  redirect(`/ekibim/${parsed.data.teamId}`);
}

export async function removeTeamMember(formData: FormData) {
  const actor = await requireActor();
  assertCanManageTeams(actor);
  const parsed = removeTeamMemberSchema.safeParse({
    teamId: formData.get("teamId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    const teamId = String(formData.get("teamId") ?? "");
    redirect(`/ekibim/${teamId}?hata=${encodeURIComponent("Üye bilgisi geçersiz.")}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const team = await tx.team.findFirst({
        where: { AND: [{ id: parsed.data.teamId }, teamWhere(actor)] },
        select: { id: true, leaderId: true },
      });
      if (!team) throw new AppError("Ekip bulunamadı.");
      if (team.leaderId === parsed.data.userId) {
        throw new AppError("Ekip liderini çıkarmadan önce yeni lider atayın.");
      }

      await tx.teamMembership.deleteMany({
        where: { teamId: team.id, userId: parsed.data.userId },
      });

      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "team.member.remove",
          entityType: "Team",
          entityId: team.id,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/ekibim/${parsed.data.teamId}?hata=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  refreshTeams(parsed.data.teamId);
  redirect(`/ekibim/${parsed.data.teamId}`);
}

export async function updateOrganizationMemberRole(formData: FormData) {
  const actor = await requireActor();
  assertCanManageTeams(actor);
  const parsed = updateOrganizationRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    redirect(`/ekibim/personel?hata=${encodeURIComponent("Rol bilgisi geçersiz.")}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findFirst({
        where: { organizationId: actor.organizationId, userId: parsed.data.userId },
        select: { id: true },
      });
      if (!membership) throw new AppError("Personel bulunamadı.");

      await assertCanChangeRole(
        tx,
        actor.organizationId,
        actor.userId,
        parsed.data.userId,
        parsed.data.role as MembershipRole,
      );

      await tx.membership.update({
        where: { id: membership.id },
        data: { role: parsed.data.role as MembershipRole },
      });

      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "employee.role.update",
          entityType: "User",
          entityId: parsed.data.userId,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof AppError) {
      redirect(`/ekibim/personel?hata=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  refreshTeams();
  redirect("/ekibim/personel");
}
