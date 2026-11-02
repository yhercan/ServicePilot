import "server-only";
import type { Prisma, Priority, ServiceStatus, ServiceType } from "@prisma/client";
import { parseDateOnly } from "@/lib/dates";

type Tx = Prisma.TransactionClient;

export type CalendarSyncPayload = {
  organizationId: string;
  createdById: string;
  teamId: string;
  title: string;
  description: string | null;
  entryDate: string;
  customerId: string;
  equipmentId: string;
  serviceType: ServiceType;
  priority: Priority;
  status: ServiceStatus;
  assigneeIds: string[];
};

export type VisitSyncPayload = {
  organizationId: string;
  createdById: string;
  teamId: string;
  title: string;
  description: string | null;
  plannedDate: Date;
  customerId: string;
  equipmentId: string;
  serviceType: ServiceType;
  priority: Priority;
  status: ServiceStatus;
  assigneeIds: string[];
};

export async function createVisitFromCalendar(tx: Tx, payload: CalendarSyncPayload) {
  const plannedDate = parseDateOnly(payload.entryDate);
  const status =
    payload.assigneeIds.length > 0 && payload.status === "PLANNED" ? "ASSIGNED" : payload.status;

  const visit = await tx.serviceVisit.create({
    data: {
      organizationId: payload.organizationId,
      customerId: payload.customerId,
      equipmentId: payload.equipmentId,
      teamId: payload.teamId,
      title: payload.title,
      description: payload.description,
      serviceType: payload.serviceType,
      priority: payload.priority,
      status,
      plannedDate,
      createdById: payload.createdById,
      assignments: {
        create: payload.assigneeIds.map((userId) => ({ userId })),
      },
      statusHistory: {
        create: {
          changedById: payload.createdById,
          previousStatus: null,
          newStatus: status,
          note: "Takvim kaydından servis ziyareti oluşturuldu.",
        },
      },
    },
  });
  return visit;
}

export async function syncVisitFromCalendar(
  tx: Tx,
  visitId: string,
  payload: CalendarSyncPayload,
) {
  const plannedDate = parseDateOnly(payload.entryDate);
  await tx.serviceAssignment.deleteMany({ where: { serviceVisitId: visitId } });
  if (payload.assigneeIds.length > 0) {
    await tx.serviceAssignment.createMany({
      data: payload.assigneeIds.map((userId) => ({ serviceVisitId: visitId, userId })),
    });
  }
  return tx.serviceVisit.update({
    where: { id: visitId },
    data: {
      customerId: payload.customerId,
      equipmentId: payload.equipmentId,
      teamId: payload.teamId,
      title: payload.title,
      description: payload.description,
      serviceType: payload.serviceType,
      priority: payload.priority,
      status: payload.status,
      plannedDate,
    },
  });
}

export async function createCalendarFromVisit(tx: Tx, visitId: string, payload: VisitSyncPayload) {
  return tx.calendarEntry.create({
    data: {
      organizationId: payload.organizationId,
      teamId: payload.teamId,
      title: payload.title,
      description: payload.description,
      entryDate: payload.plannedDate,
      customerId: payload.customerId,
      equipmentId: payload.equipmentId,
      serviceVisitId: visitId,
      serviceType: payload.serviceType,
      priority: payload.priority,
      status: payload.status,
      createdById: payload.createdById,
      assignments: {
        create: payload.assigneeIds.map((userId) => ({ userId })),
      },
    },
  });
}

export async function syncCalendarFromVisit(
  tx: Tx,
  entryId: string,
  visitId: string,
  payload: VisitSyncPayload,
) {
  await tx.calendarEntryAssignment.deleteMany({ where: { calendarEntryId: entryId } });
  return tx.calendarEntry.update({
    where: { id: entryId },
    data: {
      teamId: payload.teamId,
      title: payload.title,
      description: payload.description,
      entryDate: payload.plannedDate,
      customerId: payload.customerId,
      equipmentId: payload.equipmentId,
      serviceVisitId: visitId,
      serviceType: payload.serviceType,
      priority: payload.priority,
      status: payload.status,
      assignments: {
        create: payload.assigneeIds.map((userId) => ({ userId })),
      },
    },
  });
}
