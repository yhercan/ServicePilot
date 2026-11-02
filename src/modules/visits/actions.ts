"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, ServiceStatus } from "@prisma/client";
import { actionError, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import { requireActor } from "@/lib/auth";
import { parseDateInput, parseDateTimeInput } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import {
  assertCanManageOperations,
  canSuperviseTeamVisits,
  visitWhere,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fileStorage } from "@/server/storage";
import {
  createCalendarFromVisit,
  syncCalendarFromVisit,
  type VisitSyncPayload,
} from "@/modules/calendar/sync";
import { notifyVisitAssigned, notifyNextVisitScheduled } from "@/modules/notifications/notify";
import { nextVisitSchema } from "@/modules/visits/next-visit";
import { commentSchema, progressSchema, visitSchema } from "@/modules/visits/schema";
import type { ServiceType } from "@prisma/client";

function refreshVisit(id: string) {
  revalidatePath("/panel");
  revalidatePath("/servisler");
  revalidatePath("/takvim");
  revalidatePath("/ayarlar");
  revalidatePath(`/servisler/${id}`);
}

async function technicianIdsForOrganization(actor: Actor, technicianIds: string[]) {
  const unique = [...new Set(technicianIds)];
  if (unique.length === 0) return [];
  const members = await prisma.membership.findMany({
    where: {
      organizationId: actor.organizationId,
      role: { in: ["SERVICE_ENGINEER", "TEAM_LEADER"] },
      userId: { in: unique },
    },
    select: { userId: true },
  });
  if (members.length !== unique.length) {
    throw new AppError("Seçilen personel bu organizasyona ait değil.");
  }
  return unique;
}

async function equipmentForCustomer(actor: Actor, customerId: string, equipmentId: string) {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, customerId, organizationId: actor.organizationId },
    select: {
      id: true,
      teamLinks: { select: { teamId: true } },
    },
  });
  if (!equipment) {
    throw new AppError("Ekipman seçilen müşteriye ait değil.");
  }
  return equipment;
}

async function resolveVisitTeamId(
  organizationId: string,
  teamId: string | null,
  equipmentTeamIds: string[],
) {
  if (!teamId) {
    return equipmentTeamIds.length === 1 ? equipmentTeamIds[0] : null;
  }
  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId, isActive: true },
    select: { id: true },
  });
  if (!team) throw new AppError("Seçilen ekip bulunamadı.");
  if (equipmentTeamIds.length > 0 && !equipmentTeamIds.includes(teamId)) {
    throw new AppError("Seçilen ekip bu ekipmanla ilişkili değil.");
  }
  return teamId;
}

function statusAfterAssignment(current: ServiceStatus, technicianCount: number): ServiceStatus {
  if (technicianCount > 0 && current === "PLANNED") return "ASSIGNED";
  if (technicianCount === 0 && current === "ASSIGNED") return "PLANNED";
  return current;
}

async function writeStatusHistory(
  tx: Prisma.TransactionClient,
  input: {
    serviceVisitId: string;
    changedById: string;
    previousStatus: ServiceStatus | null;
    newStatus: ServiceStatus;
    note?: string | null;
  },
) {
  await tx.serviceStatusHistory.create({
    data: {
      serviceVisitId: input.serviceVisitId,
      changedById: input.changedById,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      note: input.note ?? null,
    },
  });
}

export async function createVisit(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageOperations(actor);
    const parsed = visitSchema.safeParse({
      ...Object.fromEntries(formData),
      teamId: formData.get("teamId") ?? "",
      technicianIds: formData.getAll("technicianIds"),
    });
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const equipment = await equipmentForCustomer(
      actor,
      parsed.data.customerId,
      parsed.data.equipmentId,
    );
    const teamId = await resolveVisitTeamId(
      actor.organizationId,
      parsed.data.teamId,
      equipment.teamLinks.map((link) => link.teamId),
    );
    if (!teamId) {
      throw new AppError("Takvim senkronu için ilgili ekip seçilmelidir.");
    }
    const technicianIds = await technicianIdsForOrganization(actor, parsed.data.technicianIds);
    const status = technicianIds.length > 0 ? "ASSIGNED" : "PLANNED";

    const visit = await prisma.$transaction(async (tx) => {
      const created = await tx.serviceVisit.create({
        data: {
          organizationId: actor.organizationId,
          customerId: parsed.data.customerId,
          equipmentId: parsed.data.equipmentId,
          teamId,
          title: parsed.data.title,
          description: parsed.data.description,
          serviceType: parsed.data.serviceType,
          priority: parsed.data.priority,
          plannedDate: parseDateInput(parsed.data.plannedDate),
          sapReferenceNumber: parsed.data.sapReferenceNumber,
          status,
          createdById: actor.userId,
          assignments: {
            create: technicianIds.map((userId) => ({ userId })),
          },
        },
      });
      const syncPayload: VisitSyncPayload = {
        organizationId: actor.organizationId,
        createdById: actor.userId,
        teamId,
        title: parsed.data.title,
        description: parsed.data.description,
        plannedDate: created.plannedDate,
        customerId: parsed.data.customerId,
        equipmentId: parsed.data.equipmentId,
        serviceType: parsed.data.serviceType,
        priority: parsed.data.priority,
        status,
        assigneeIds: technicianIds,
      };
      await createCalendarFromVisit(tx, created.id, syncPayload);
      await writeStatusHistory(tx, {
        serviceVisitId: created.id,
        changedById: actor.userId,
        previousStatus: null,
        newStatus: status,
        note: "Servis ziyareti oluşturuldu.",
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "visit.create",
          entityType: "ServiceVisit",
          entityId: created.id,
        },
        tx,
      );
      return created;
    });
    id = visit.id;
    if (technicianIds.length > 0) {
      const customer = await prisma.customer.findFirst({
        where: { id: parsed.data.customerId },
        select: { companyName: true },
      });
      await notifyVisitAssigned({
        organizationId: actor.organizationId,
        visitId: visit.id,
        visitTitle: parsed.data.title,
        customerName: customer?.companyName ?? "Müşteri",
        plannedDate: visit.plannedDate,
        userIds: technicianIds,
      });
    }
  } catch (error) {
    return actionError(error);
  }

  refreshVisit(id);
  redirect(`/servisler/${id}`);
}

export async function updateVisit(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    const actor = await requireActor();
    assertCanManageOperations(actor);
    const parsed = visitSchema.safeParse({
      ...Object.fromEntries(formData),
      teamId: formData.get("teamId") ?? "",
      technicianIds: formData.getAll("technicianIds"),
    });
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const equipment = await equipmentForCustomer(
      actor,
      parsed.data.customerId,
      parsed.data.equipmentId,
    );
    const teamId = await resolveVisitTeamId(
      actor.organizationId,
      parsed.data.teamId,
      equipment.teamLinks.map((link) => link.teamId),
    );
    if (!teamId) {
      throw new AppError("Takvim senkronu için ilgili ekip seçilmelidir.");
    }
    const technicianIds = await technicianIdsForOrganization(actor, parsed.data.technicianIds);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceVisit.findFirst({
        where: { AND: [{ id }, visitWhere(actor)] },
        include: {
          calendarEntries: { select: { id: true }, take: 1 },
          assignments: { select: { userId: true } },
          customer: { select: { companyName: true } },
        },
      });
      if (!existing) return null;
      const previousAssigneeIds = new Set(existing.assignments.map((row) => row.userId));
      const newlyAssigned = technicianIds.filter((userId) => !previousAssigneeIds.has(userId));
      const status = statusAfterAssignment(existing.status, technicianIds.length);
      await tx.serviceAssignment.deleteMany({ where: { serviceVisitId: existing.id } });
      if (technicianIds.length > 0) {
        await tx.serviceAssignment.createMany({
          data: technicianIds.map((userId) => ({ serviceVisitId: existing.id, userId })),
        });
      }
      const result = await tx.serviceVisit.update({
        where: { id: existing.id },
        data: {
          customerId: parsed.data.customerId,
          equipmentId: parsed.data.equipmentId,
          teamId,
          title: parsed.data.title,
          description: parsed.data.description,
          serviceType: parsed.data.serviceType,
          priority: parsed.data.priority,
          plannedDate: parseDateInput(parsed.data.plannedDate),
          sapReferenceNumber: parsed.data.sapReferenceNumber,
          status,
        },
      });
      const syncPayload: VisitSyncPayload = {
        organizationId: actor.organizationId,
        createdById: actor.userId,
        teamId,
        title: parsed.data.title,
        description: parsed.data.description,
        plannedDate: result.plannedDate,
        customerId: parsed.data.customerId,
        equipmentId: parsed.data.equipmentId,
        serviceType: parsed.data.serviceType,
        priority: parsed.data.priority,
        status,
        assigneeIds: technicianIds,
      };
      const linkedEntry = existing.calendarEntries[0];
      if (linkedEntry) {
        await syncCalendarFromVisit(tx, linkedEntry.id, existing.id, syncPayload);
      } else {
        await createCalendarFromVisit(tx, existing.id, syncPayload);
      }
      if (status !== existing.status) {
        await writeStatusHistory(tx, {
          serviceVisitId: existing.id,
          changedById: actor.userId,
          previousStatus: existing.status,
          newStatus: status,
          note: "Atama değişikliği nedeniyle durum güncellendi.",
        });
      }
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "visit.update",
          entityType: "ServiceVisit",
          entityId: existing.id,
        },
        tx,
      );
      return { result, newlyAssigned, customerName: existing.customer.companyName };
    });
    if (!updated) return { error: "Servis ziyareti bulunamadı." };
    if (updated.newlyAssigned.length > 0) {
      await notifyVisitAssigned({
        organizationId: actor.organizationId,
        visitId: updated.result.id,
        visitTitle: updated.result.title,
        customerName: updated.customerName,
        plannedDate: updated.result.plannedDate,
        userIds: updated.newlyAssigned,
      });
    }
  } catch (error) {
    return actionError(error);
  }

  refreshVisit(id);
  redirect(`/servisler/${id}`);
}

export async function updateVisitProgress(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    const actor = await requireActor();
    const parsed = progressSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const actualStartDate = parsed.data.actualStartDate
      ? parseDateTimeInput(parsed.data.actualStartDate)
      : null;
    const actualEndDate = parsed.data.actualEndDate ? parseDateTimeInput(parsed.data.actualEndDate) : null;
    if (actualStartDate && actualEndDate && actualEndDate < actualStartDate) {
      return { error: "Bitiş tarihi başlangıçtan önce olamaz." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceVisit.findFirst({
        where: { AND: [{ id }, visitWhere(actor)] },
      });
      if (!existing) return null;
      const nextStart =
        actualStartDate ??
        (parsed.data.status === "IN_PROGRESS" && !existing.actualStartDate ? new Date() : existing.actualStartDate);
      const nextEnd =
        actualEndDate ??
        (parsed.data.status === "COMPLETED" && !existing.actualEndDate ? new Date() : existing.actualEndDate);
      const result = await tx.serviceVisit.update({
        where: { id: existing.id },
        data: {
          status: parsed.data.status,
          description: parsed.data.description,
          actualStartDate: nextStart,
          actualEndDate: nextEnd,
        },
      });
      await tx.calendarEntry.updateMany({
        where: { serviceVisitId: existing.id },
        data: {
          status: parsed.data.status,
          description: parsed.data.description,
        },
      });
      if (parsed.data.status !== existing.status) {
        await writeStatusHistory(tx, {
          serviceVisitId: existing.id,
          changedById: actor.userId,
          previousStatus: existing.status,
          newStatus: parsed.data.status,
          note: parsed.data.note,
        });
        await writeAudit(
          {
            organizationId: actor.organizationId,
            userId: actor.userId,
            action: "visit.status",
            entityType: "ServiceVisit",
            entityId: existing.id,
          },
          tx,
        );
      }
      return result;
    });
    if (!updated) return { error: "Servis ziyareti bulunamadı." };
  } catch (error) {
    return actionError(error);
  }

  refreshVisit(id);
  return { error: undefined };
}

export async function updateAssignments(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    const actor = await requireActor();
    if (!canSuperviseTeamVisits(actor.role)) {
      throw new AppError("Bu işlem için yetkiniz yok.");
    }
    let technicianIds = await technicianIdsForOrganization(
      actor,
      formData.getAll("technicianIds").map(String),
    );
    if (actor.role === "TEAM_LEADER") {
      const allowed = await prisma.team.findMany({
        where: { organizationId: actor.organizationId, leaderId: actor.userId },
        select: {
          leaderId: true,
          memberships: { select: { userId: true } },
        },
      });
      const allowedIds = new Set<string>();
      for (const team of allowed) {
        if (team.leaderId) allowedIds.add(team.leaderId);
        for (const membership of team.memberships) allowedIds.add(membership.userId);
      }
      if (technicianIds.some((userId) => !allowedIds.has(userId))) {
        throw new AppError("Yalnızca kendi ekibinizdeki personele atama yapabilirsiniz.");
      }
    }
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceVisit.findFirst({
        where: { AND: [{ id }, visitWhere(actor)] },
        include: {
          assignments: { select: { userId: true } },
          customer: { select: { companyName: true } },
        },
      });
      if (!existing) return null;
      const previousAssigneeIds = new Set(existing.assignments.map((row) => row.userId));
      const newlyAssigned = technicianIds.filter((userId) => !previousAssigneeIds.has(userId));
      const status = statusAfterAssignment(existing.status, technicianIds.length);
      await tx.serviceAssignment.deleteMany({ where: { serviceVisitId: existing.id } });
      if (technicianIds.length > 0) {
        await tx.serviceAssignment.createMany({
          data: technicianIds.map((userId) => ({ serviceVisitId: existing.id, userId })),
        });
      }
      await tx.serviceVisit.update({ where: { id: existing.id }, data: { status } });
      if (status !== existing.status) {
        await writeStatusHistory(tx, {
          serviceVisitId: existing.id,
          changedById: actor.userId,
          previousStatus: existing.status,
          newStatus: status,
          note: "Teknisyen ataması güncellendi.",
        });
      }
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "visit.assign",
          entityType: "ServiceVisit",
          entityId: existing.id,
        },
        tx,
      );
      return { existing, newlyAssigned };
    });
    if (!updated) return { error: "Servis ziyareti bulunamadı." };
    if (updated.newlyAssigned.length > 0) {
      await notifyVisitAssigned({
        organizationId: actor.organizationId,
        visitId: updated.existing.id,
        visitTitle: updated.existing.title,
        customerName: updated.existing.customer.companyName,
        plannedDate: updated.existing.plannedDate,
        userIds: updated.newlyAssigned,
      });
    }
  } catch (error) {
    return actionError(error);
  }

  refreshVisit(id);
  return {};
}

export async function updateNextVisit(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    const actor = await requireActor();
    const parsed = nextVisitSchema.safeParse({
      enabled: formData.get("enabled") === "on",
      nextVisitDate: String(formData.get("nextVisitDate") ?? ""),
      nextVisitType: String(formData.get("nextVisitType") ?? ""),
    });
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

    const existing = await prisma.serviceVisit.findFirst({
      where: { AND: [{ id }, visitWhere(actor)] },
      include: { customer: { select: { companyName: true } } },
    });
    if (!existing) return { error: "Servis ziyareti bulunamadı." };

    const enabled = parsed.data.enabled;
    const nextVisitDate = enabled ? parseDateInput(parsed.data.nextVisitDate) : null;
    const nextVisitType = enabled ? (parsed.data.nextVisitType as ServiceType) : null;
    const firstActivation =
      enabled &&
      Boolean(nextVisitDate) &&
      Boolean(nextVisitType) &&
      (!existing.nextVisitEnabled || !existing.nextVisitNotifiedAt);
    const dateChanged =
      enabled &&
      nextVisitDate &&
      (!existing.nextVisitDate || existing.nextVisitDate.getTime() !== nextVisitDate.getTime());

    if (firstActivation && nextVisitDate && nextVisitType) {
      await notifyNextVisitScheduled({
        organizationId: actor.organizationId,
        visitId: existing.id,
        visitTitle: existing.title,
        customerName: existing.customer.companyName,
        nextVisitDate,
        nextVisitType,
        teamId: existing.teamId,
        customerId: existing.customerId,
      });
    }

    await prisma.serviceVisit.update({
      where: { id: existing.id },
      data: {
        nextVisitEnabled: enabled,
        nextVisitDate,
        nextVisitType,
        nextVisitNotifiedAt: enabled
          ? firstActivation
            ? new Date()
            : existing.nextVisitNotifiedAt
          : null,
        nextVisitReminderSentAt: enabled
          ? dateChanged
            ? null
            : existing.nextVisitReminderSentAt
          : null,
      },
    });

    await writeAudit({
      organizationId: actor.organizationId,
      userId: actor.userId,
      action: "visit.nextVisit",
      entityType: "ServiceVisit",
      entityId: existing.id,
    });
  } catch (error) {
    return actionError(error);
  }

  refreshVisit(id);
  return {};
}

export async function addComment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    const actor = await requireActor();
    const parsed = commentSchema.safeParse({ content: formData.get("content") });
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const visit = await prisma.serviceVisit.findFirst({
      where: { AND: [{ id }, visitWhere(actor)] },
      select: { id: true },
    });
    if (!visit) return { error: "Servis ziyareti bulunamadı." };
    await prisma.$transaction(async (tx) => {
      const comment = await tx.serviceComment.create({
        data: { serviceVisitId: visit.id, userId: actor.userId, content: parsed.data.content },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "comment.create",
          entityType: "ServiceComment",
          entityId: comment.id,
        },
        tx,
      );
    });
  } catch (error) {
    return actionError(error);
  }

  refreshVisit(id);
  return {};
}

export async function deleteVisit(formData: FormData) {
  const actor = await requireActor();
  assertCanManageOperations(actor);
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.serviceVisit.findFirst({
    where: { AND: [{ id }, visitWhere(actor)] },
    include: { attachments: { select: { storagePath: true } } },
  });
  if (!existing) redirect("/servisler");

  await prisma.$transaction(async (tx) => {
    await tx.calendarEntry.deleteMany({ where: { serviceVisitId: existing.id } });
    await tx.serviceVisit.delete({ where: { id: existing.id } });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "visit.delete",
        entityType: "ServiceVisit",
        entityId: existing.id,
      },
      tx,
    );
  });

  await Promise.all(
    existing.attachments.map(async (attachment) => {
      try {
        await fileStorage.remove(attachment.storagePath);
      } catch {
        console.error("Stored file could not be removed after visit delete.");
      }
    }),
  );

  revalidatePath("/panel");
  revalidatePath("/servisler");
  revalidatePath("/takvim");
  redirect("/servisler");
}
