import "server-only";
import type { NotificationType, Prisma, ServiceType } from "@prisma/client";
import { formatDate, istanbulDateKey, parseDateInput } from "@/lib/dates";
import { serviceTypeLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | typeof prisma;

type NotifyItem = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
};

const settingKeyForType: Record<
  NotificationType,
  "notifyNextVisitScheduled" | "notifyNextVisitReminder" | "notifyVisitAssigned"
> = {
  NEXT_VISIT_SCHEDULED: "notifyNextVisitScheduled",
  NEXT_VISIT_REMINDER: "notifyNextVisitReminder",
  VISIT_ASSIGNED: "notifyVisitAssigned",
};

async function filterBySettings(organizationId: string, items: NotifyItem[]) {
  if (items.length === 0) return [];
  const userIds = [...new Set(items.map((item) => item.userId))];
  const settings = await prisma.userSettings.findMany({
    where: { organizationId, userId: { in: userIds } },
  });
  const map = new Map(settings.map((row) => [row.userId, row]));
  return items.filter((item) => {
    const prefs = map.get(item.userId);
    if (!prefs) return true;
    return prefs[settingKeyForType[item.type]];
  });
}

export async function createNotifications(organizationId: string, items: NotifyItem[], tx?: Tx) {
  const db = tx ?? prisma;
  const allowed = await filterBySettings(organizationId, items);
  if (allowed.length === 0) return;
  await db.notification.createMany({
    data: allowed.map((item) => ({
      organizationId,
      userId: item.userId,
      type: item.type,
      title: item.title,
      body: item.body,
      href: item.href ?? null,
    })),
  });
}

export async function resolveNextVisitRecipients(input: {
  organizationId: string;
  visitId: string;
  teamId: string | null;
  customerId: string;
}) {
  const [assignments, team, customer, admins] = await Promise.all([
    prisma.serviceAssignment.findMany({
      where: { serviceVisitId: input.visitId },
      select: { userId: true },
    }),
    input.teamId
      ? prisma.team.findFirst({
          where: { id: input.teamId, organizationId: input.organizationId },
          select: { leaderId: true },
        })
      : Promise.resolve(null),
    prisma.customer.findFirst({
      where: { id: input.customerId, organizationId: input.organizationId },
      select: { operationsManagerId: true },
    }),
    prisma.membership.findMany({
      where: { organizationId: input.organizationId, role: "ADMIN" },
      select: { userId: true },
    }),
  ]);

  const ids = new Set<string>();
  for (const row of assignments) ids.add(row.userId);
  if (team?.leaderId) ids.add(team.leaderId);
  if (customer?.operationsManagerId) ids.add(customer.operationsManagerId);
  for (const admin of admins) ids.add(admin.userId);
  return [...ids];
}

export async function notifyNextVisitScheduled(input: {
  organizationId: string;
  visitId: string;
  visitTitle: string;
  customerName: string;
  nextVisitDate: Date;
  nextVisitType: ServiceType;
  teamId: string | null;
  customerId: string;
}) {
  const recipients = await resolveNextVisitRecipients(input);
  const typeLabel = serviceTypeLabel[input.nextVisitType];
  const dateLabel = formatDate(input.nextVisitDate);
  await createNotifications(
    input.organizationId,
    recipients.map((userId) => ({
      userId,
      type: "NEXT_VISIT_SCHEDULED" as const,
      title: "Sıradaki ziyaret planlandı",
      body: `${input.customerName} · ${input.visitTitle} için ${dateLabel} tarihinde ${typeLabel} ziyareti planlandı.`,
      href: `/servisler/${input.visitId}`,
    })),
  );
}

export async function notifyNextVisitReminder(input: {
  organizationId: string;
  visitId: string;
  visitTitle: string;
  customerName: string;
  nextVisitDate: Date;
  nextVisitType: ServiceType;
  userIds: string[];
}) {
  const typeLabel = serviceTypeLabel[input.nextVisitType];
  const dateLabel = formatDate(input.nextVisitDate);
  await createNotifications(
    input.organizationId,
    input.userIds.map((userId) => ({
      userId,
      type: "NEXT_VISIT_REMINDER" as const,
      title: "Yaklaşan sıradaki ziyaret",
      body: `${input.customerName} · ${input.visitTitle} için ${dateLabel} tarihinde ${typeLabel} hatırlatması.`,
      href: `/servisler/${input.visitId}`,
    })),
  );
}

export async function notifyVisitAssigned(input: {
  organizationId: string;
  visitId: string;
  visitTitle: string;
  customerName: string;
  plannedDate: Date;
  userIds: string[];
}) {
  if (input.userIds.length === 0) return;
  const dateLabel = formatDate(input.plannedDate);
  await createNotifications(
    input.organizationId,
    input.userIds.map((userId) => ({
      userId,
      type: "VISIT_ASSIGNED" as const,
      title: "Yeni servis ataması",
      body: `${input.customerName} · ${input.visitTitle} size atandı (${dateLabel}).`,
      href: `/servisler/${input.visitId}`,
    })),
  );
}

/** Gösterge / ayarlar yüklenirken: 1 hafta kala hatırlatmaları üretir. */
export async function processDueNextVisitReminders(organizationId: string) {
  const todayKey = istanbulDateKey(new Date());
  const windowEnd = parseDateInput(
    (() => {
      const [y, m, d] = todayKey.split("-").map(Number);
      const base = new Date(Date.UTC(y, m - 1, d));
      base.setUTCDate(base.getUTCDate() + 7);
      return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
    })(),
  );
  const windowStart = parseDateInput(todayKey);

  const due = await prisma.serviceVisit.findMany({
    where: {
      organizationId,
      nextVisitEnabled: true,
      nextVisitDate: { gte: windowStart, lte: windowEnd },
      nextVisitReminderSentAt: null,
      nextVisitType: { not: null },
    },
    select: {
      id: true,
      title: true,
      teamId: true,
      customerId: true,
      nextVisitDate: true,
      nextVisitType: true,
      customer: { select: { companyName: true } },
    },
    take: 50,
  });

  for (const visit of due) {
    if (!visit.nextVisitDate || !visit.nextVisitType) continue;
    const recipients = await resolveNextVisitRecipients({
      organizationId,
      visitId: visit.id,
      teamId: visit.teamId,
      customerId: visit.customerId,
    });
    await notifyNextVisitReminder({
      organizationId,
      visitId: visit.id,
      visitTitle: visit.title,
      customerName: visit.customer.companyName,
      nextVisitDate: visit.nextVisitDate,
      nextVisitType: visit.nextVisitType,
      userIds: recipients,
    });
    await prisma.serviceVisit.update({
      where: { id: visit.id },
      data: { nextVisitReminderSentAt: new Date() },
    });
  }
}
