"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Priority, ServiceStatus, ServiceType } from "@prisma/client";
import { actionError, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { requireActor } from "@/lib/auth";
import { parseDateInput, parseDateOnly } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import {
  assertCanCreateCalendarEntries,
  calendarEntryWhere,
  canCreateCalendarEntries,
  teamWhere,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calendarEntrySchema } from "@/modules/calendar/schema";
import {
  createVisitFromCalendar,
  syncVisitFromCalendar,
  type CalendarSyncPayload,
} from "@/modules/calendar/sync";
import { notifyVisitAssigned } from "@/modules/notifications/notify";

function refresh(id?: string, visitId?: string | null) {
  revalidatePath("/takvim");
  revalidatePath("/servisler");
  revalidatePath("/panel");
  if (id) revalidatePath(`/takvim/kayit/${id}`);
  if (visitId) revalidatePath(`/servisler/${visitId}`);
}

async function assertTeamAccess(actor: Awaited<ReturnType<typeof requireActor>>, teamId: string) {
  const team = await prisma.team.findFirst({
    where: { AND: [{ id: teamId }, teamWhere(actor, { activeOnly: true })] },
    select: { id: true, leaderId: true },
  });
  if (!team) throw new AppError("Ekip bulunamadı veya yetkiniz yok.");
  if (actor.role === "TEAM_LEADER" && team.leaderId !== actor.userId) {
    throw new AppError("Yalnızca lideri olduğunuz ekip için takvim kaydı yönetebilirsiniz.");
  }
  return team;
}

async function assertAssignees(
  actor: Awaited<ReturnType<typeof requireActor>>,
  teamId: string,
  assigneeIds: string[],
) {
  const unique = [...new Set(assigneeIds)];
  if (unique.length === 0) return [];

  if (actor.role === "TEAM_LEADER") {
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: actor.organizationId, leaderId: actor.userId },
      select: {
        leaderId: true,
        memberships: { select: { userId: true } },
      },
    });
    if (!team) throw new AppError("Bu ekip için personel atayamazsınız.");
    const allowed = new Set<string>([
      ...(team.leaderId ? [team.leaderId] : []),
      ...team.memberships.map((item) => item.userId),
    ]);
    if (unique.some((id) => !allowed.has(id))) {
      throw new AppError("Yalnızca kendi ekibinizdeki kişilere iş atayabilirsiniz.");
    }
    return unique;
  }

  const members = await prisma.membership.findMany({
    where: {
      organizationId: actor.organizationId,
      userId: { in: unique },
      role: { in: ["SERVICE_ENGINEER", "TEAM_LEADER"] },
    },
    select: { userId: true },
  });
  if (members.length !== unique.length) {
    throw new AppError("Seçilen personelden bazıları atanamaz.");
  }
  return unique;
}

function parseEntry(formData: FormData) {
  return calendarEntrySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    teamId: formData.get("teamId"),
    entryDate: formData.get("entryDate"),
    customerId: formData.get("customerId"),
    equipmentId: formData.get("equipmentId"),
    serviceVisitId: formData.get("serviceVisitId"),
    serviceType: formData.get("serviceType") || "MAINTENANCE",
    priority: formData.get("priority") || "NORMAL",
    status: formData.get("status") || "PLANNED",
    assigneeIds: formData.getAll("assigneeIds").map(String).filter(Boolean),
  });
}

async function assertCustomerEquipment(
  organizationId: string,
  customerId: string,
  equipmentId: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { id: true },
  });
  if (!customer) throw new AppError("Müşteri bulunamadı.");
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, organizationId, customerId },
    select: { id: true },
  });
  if (!equipment) throw new AppError("Ekipman seçilen müşteriye ait değil.");
}

export async function createCalendarEntry(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  let visitId: string | null = null;
  try {
    const actor = await requireActor();
    assertCanCreateCalendarEntries(actor);
    const parsed = parseEntry(formData);
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

    await assertTeamAccess(actor, parsed.data.teamId);
    const assignees = await assertAssignees(actor, parsed.data.teamId, parsed.data.assigneeIds);
    await assertCustomerEquipment(
      actor.organizationId,
      parsed.data.customerId,
      parsed.data.equipmentId,
    );

    if (parsed.data.serviceVisitId) {
      const visit = await prisma.serviceVisit.findFirst({
        where: { id: parsed.data.serviceVisitId, organizationId: actor.organizationId },
        select: { id: true },
      });
      if (!visit) throw new AppError("Bağlanacak servis ziyareti bulunamadı.");
    }

    const payload: CalendarSyncPayload = {
      organizationId: actor.organizationId,
      createdById: actor.userId,
      teamId: parsed.data.teamId,
      title: parsed.data.title,
      description: parsed.data.description,
      entryDate: parsed.data.entryDate,
      customerId: parsed.data.customerId,
      equipmentId: parsed.data.equipmentId,
      serviceType: parsed.data.serviceType as ServiceType,
      priority: parsed.data.priority as Priority,
      status: parsed.data.status as ServiceStatus,
      assigneeIds: assignees,
    };

    const created = await prisma.$transaction(async (tx) => {
      let linkedVisitId = parsed.data.serviceVisitId;
      if (linkedVisitId) {
        await syncVisitFromCalendar(tx, linkedVisitId, payload);
      } else {
        const visit = await createVisitFromCalendar(tx, payload);
        linkedVisitId = visit.id;
      }

      const entry = await tx.calendarEntry.create({
        data: {
          organizationId: actor.organizationId,
          teamId: parsed.data.teamId,
          title: parsed.data.title,
          description: parsed.data.description,
          entryDate: parseDateOnly(parsed.data.entryDate),
          customerId: parsed.data.customerId,
          equipmentId: parsed.data.equipmentId,
          serviceVisitId: linkedVisitId,
          serviceType: parsed.data.serviceType as ServiceType,
          priority: parsed.data.priority as Priority,
          status: parsed.data.status as ServiceStatus,
          createdById: actor.userId,
          assignments: {
            create: assignees.map((userId) => ({ userId })),
          },
        },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "calendar.create",
          entityType: "CalendarEntry",
          entityId: entry.id,
        },
        tx,
      );
      return { entry, visitId: linkedVisitId };
    });
    id = created.entry.id;
    visitId = created.visitId;
    if (assignees.length > 0 && visitId) {
      const customer = await prisma.customer.findFirst({
        where: { id: parsed.data.customerId },
        select: { companyName: true },
      });
      await notifyVisitAssigned({
        organizationId: actor.organizationId,
        visitId,
        visitTitle: parsed.data.title,
        customerName: customer?.companyName ?? "Müşteri",
        plannedDate: parseDateInput(parsed.data.entryDate),
        userIds: assignees,
      });
    }
  } catch (error) {
    return actionError(error);
  }

  refresh(id, visitId);
  redirect(`/takvim/kayit/${id}`);
}

export async function updateCalendarEntry(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  let visitId: string | null = null;
  try {
    const actor = await requireActor();
    assertCanCreateCalendarEntries(actor);
    id = String(formData.get("id") ?? "");
    const parsed = parseEntry(formData);
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

    const existing = await prisma.calendarEntry.findFirst({
      where: { AND: [{ id }, calendarEntryWhere(actor)] },
      select: {
        id: true,
        teamId: true,
        serviceVisitId: true,
        assignments: { select: { userId: true } },
      },
    });
    if (!existing) return { error: "Takvim kaydı bulunamadı." };

    await assertTeamAccess(actor, parsed.data.teamId);
    if (actor.role === "TEAM_LEADER") {
      await assertTeamAccess(actor, existing.teamId);
    }
    const assignees = await assertAssignees(actor, parsed.data.teamId, parsed.data.assigneeIds);
    await assertCustomerEquipment(
      actor.organizationId,
      parsed.data.customerId,
      parsed.data.equipmentId,
    );
    const previousAssigneeIds = new Set(existing.assignments.map((row) => row.userId));
    const newlyAssigned = assignees.filter((userId) => !previousAssigneeIds.has(userId));

    const payload: CalendarSyncPayload = {
      organizationId: actor.organizationId,
      createdById: actor.userId,
      teamId: parsed.data.teamId,
      title: parsed.data.title,
      description: parsed.data.description,
      entryDate: parsed.data.entryDate,
      customerId: parsed.data.customerId,
      equipmentId: parsed.data.equipmentId,
      serviceType: parsed.data.serviceType as ServiceType,
      priority: parsed.data.priority as Priority,
      status: parsed.data.status as ServiceStatus,
      assigneeIds: assignees,
    };

    await prisma.$transaction(async (tx) => {
      let linkedVisitId = parsed.data.serviceVisitId ?? existing.serviceVisitId;
      if (linkedVisitId) {
        const visit = await tx.serviceVisit.findFirst({
          where: { id: linkedVisitId, organizationId: actor.organizationId },
          select: { id: true },
        });
        if (!visit) linkedVisitId = null;
      }
      if (linkedVisitId) {
        await syncVisitFromCalendar(tx, linkedVisitId, payload);
      } else {
        const visit = await createVisitFromCalendar(tx, payload);
        linkedVisitId = visit.id;
      }
      visitId = linkedVisitId;

      await tx.calendarEntryAssignment.deleteMany({ where: { calendarEntryId: existing.id } });
      await tx.calendarEntry.update({
        where: { id: existing.id },
        data: {
          teamId: parsed.data.teamId,
          title: parsed.data.title,
          description: parsed.data.description,
          entryDate: parseDateOnly(parsed.data.entryDate),
          customerId: parsed.data.customerId,
          equipmentId: parsed.data.equipmentId,
          serviceVisitId: linkedVisitId,
          serviceType: parsed.data.serviceType as ServiceType,
          priority: parsed.data.priority as Priority,
          status: parsed.data.status as ServiceStatus,
          assignments: {
            create: assignees.map((userId) => ({ userId })),
          },
        },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "calendar.update",
          entityType: "CalendarEntry",
          entityId: existing.id,
        },
        tx,
      );
    });

    if (newlyAssigned.length > 0 && visitId) {
      const customer = await prisma.customer.findFirst({
        where: { id: parsed.data.customerId },
        select: { companyName: true },
      });
      await notifyVisitAssigned({
        organizationId: actor.organizationId,
        visitId,
        visitTitle: parsed.data.title,
        customerName: customer?.companyName ?? "Müşteri",
        plannedDate: parseDateInput(parsed.data.entryDate),
        userIds: newlyAssigned,
      });
    }
  } catch (error) {
    return actionError(error);
  }

  refresh(id, visitId);
  redirect(`/takvim/kayit/${id}`);
}

export async function deleteCalendarEntry(formData: FormData) {
  const actor = await requireActor();
  if (!canCreateCalendarEntries(actor.role)) {
    throw new AppError("Takvim kaydı silmek için yetkiniz yok.");
  }
  const id = String(formData.get("id") ?? "");
  let visitId: string | null = null;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.calendarEntry.findFirst({
      where: { AND: [{ id }, calendarEntryWhere(actor)] },
      select: { id: true, teamId: true, serviceVisitId: true },
    });
    if (!existing) return;
    if (actor.role === "TEAM_LEADER") {
      const team = await tx.team.findFirst({
        where: {
          id: existing.teamId,
          OR: [{ leaderId: actor.userId }, { memberships: { some: { userId: actor.userId } } }],
        },
        select: { id: true },
      });
      if (!team) throw new AppError("Bu kaydı silmek için yetkiniz yok.");
    }
    visitId = existing.serviceVisitId;
    await tx.calendarEntry.delete({ where: { id: existing.id } });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "calendar.delete",
        entityType: "CalendarEntry",
        entityId: existing.id,
      },
      tx,
    );
  });
  refresh(undefined, visitId);
  redirect("/takvim");
}
