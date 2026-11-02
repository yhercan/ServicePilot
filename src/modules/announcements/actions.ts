"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import { requireActor } from "@/lib/auth";
import { parseDateTimeInput } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { assertCanManageAnnouncements, announcementWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { announcementSchema } from "@/modules/announcements/schema";

function refresh(id?: string) {
  revalidatePath("/duyurular");
  revalidatePath("/panel");
  if (id) revalidatePath(`/duyurular/${id}`);
}

async function parseAnnouncement(formData: FormData) {
  return announcementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    audience: formData.get("audience"),
    publishedAt: formData.get("publishedAt"),
    expiresAt: formData.get("expiresAt"),
    teamIds: formData.getAll("teamIds").map(String).filter(Boolean),
    publishNow: formData.get("publishNow") ?? "",
  });
}

async function assertLedTeams(actor: Actor, teamIds: string[]) {
  if (teamIds.length === 0) return;
  const teams = await prisma.team.findMany({
    where: {
      id: { in: teamIds },
      organizationId: actor.organizationId,
      ...(actor.role === "ADMIN" ? {} : { leaderId: actor.userId }),
    },
    select: { id: true },
  });
  if (teams.length !== teamIds.length) {
    throw new AppError(
      actor.role === "TEAM_LEADER"
        ? "Yalnızca lideri olduğunuz ekibe duyuru gönderebilirsiniz."
        : "Seçilen ekiplerden bazıları bulunamadı.",
    );
  }
}

function normalizeAudience(
  actor: Actor,
  audience: "ALL" | "TEAMS",
  teamIds: string[],
): { audience: "ALL" | "TEAMS"; teamIds: string[] } {
  if (actor.role === "TEAM_LEADER") {
    if (teamIds.length === 0) {
      throw new AppError("Ekip lideri duyurusu için ekibinizi seçmelisiniz.");
    }
    return { audience: "TEAMS", teamIds };
  }
  return { audience, teamIds };
}

export async function createAnnouncement(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageAnnouncements(actor);
    const parsed = await parseAnnouncement(formData);
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const normalized = normalizeAudience(actor, parsed.data.audience, parsed.data.teamIds);
    await assertLedTeams(actor, normalized.teamIds);

    const published = parsed.data.publishNow;
    const publishedAt = published
      ? parseDateTimeInput(parsed.data.publishedAt ?? "") ?? new Date()
      : parseDateTimeInput(parsed.data.publishedAt ?? "");
    const expiresAt = parseDateTimeInput(parsed.data.expiresAt ?? "");

    const created = await prisma.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({
        data: {
          organizationId: actor.organizationId,
          title: parsed.data.title,
          content: parsed.data.content,
          audience: normalized.audience,
          status: published ? "PUBLISHED" : "DRAFT",
          publishedAt: published ? publishedAt : null,
          expiresAt,
          createdById: actor.userId,
          teams:
            normalized.audience === "TEAMS"
              ? { create: normalized.teamIds.map((teamId) => ({ teamId })) }
              : undefined,
        },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "announcement.create",
          entityType: "Announcement",
          entityId: announcement.id,
        },
        tx,
      );
      return announcement;
    });
    id = created.id;
  } catch (error) {
    return actionError(error);
  }

  refresh(id);
  redirect(`/duyurular/${id}`);
}

export async function updateAnnouncement(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const actor = await requireActor();
    assertCanManageAnnouncements(actor);
    id = String(formData.get("id") ?? "");
    const parsed = await parseAnnouncement(formData);
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const normalized = normalizeAudience(actor, parsed.data.audience, parsed.data.teamIds);
    await assertLedTeams(actor, normalized.teamIds);

    const existing = await prisma.announcement.findFirst({
      where: { AND: [{ id }, announcementWhere(actor, { manage: true })] },
      select: { id: true, status: true, publishedAt: true },
    });
    if (!existing) return { error: "Duyuru bulunamadı." };

    const published = parsed.data.publishNow || existing.status === "PUBLISHED";
    const publishedAt = published
      ? parseDateTimeInput(parsed.data.publishedAt ?? "") ?? existing.publishedAt ?? new Date()
      : null;
    const expiresAt = parseDateTimeInput(parsed.data.expiresAt ?? "");

    await prisma.$transaction(async (tx) => {
      await tx.announcementTeam.deleteMany({ where: { announcementId: existing.id } });
      await tx.announcement.update({
        where: { id: existing.id },
        data: {
          title: parsed.data.title,
          content: parsed.data.content,
          audience: normalized.audience,
          status: published ? "PUBLISHED" : "DRAFT",
          publishedAt: published ? publishedAt : null,
          expiresAt,
          teams:
            normalized.audience === "TEAMS"
              ? { create: normalized.teamIds.map((teamId) => ({ teamId })) }
              : undefined,
        },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "announcement.update",
          entityType: "Announcement",
          entityId: existing.id,
        },
        tx,
      );
    });
  } catch (error) {
    return actionError(error);
  }

  refresh(id);
  redirect(`/duyurular/${id}`);
}

export async function publishAnnouncement(formData: FormData) {
  const actor = await requireActor();
  assertCanManageAnnouncements(actor);
  const id = String(formData.get("id") ?? "");
  await prisma.$transaction(async (tx) => {
    const existing = await tx.announcement.findFirst({
      where: { AND: [{ id }, announcementWhere(actor, { manage: true })] },
      select: { id: true },
    });
    if (!existing) return;
    await tx.announcement.update({
      where: { id: existing.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "announcement.publish",
        entityType: "Announcement",
        entityId: existing.id,
      },
      tx,
    );
  });
  refresh(id);
  redirect(`/duyurular/${id}`);
}

export async function unpublishAnnouncement(formData: FormData) {
  const actor = await requireActor();
  assertCanManageAnnouncements(actor);
  const id = String(formData.get("id") ?? "");
  await prisma.$transaction(async (tx) => {
    const existing = await tx.announcement.findFirst({
      where: { AND: [{ id }, announcementWhere(actor, { manage: true })] },
      select: { id: true },
    });
    if (!existing) return;
    await tx.announcement.update({
      where: { id: existing.id },
      data: { status: "DRAFT" },
    });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "announcement.unpublish",
        entityType: "Announcement",
        entityId: existing.id,
      },
      tx,
    );
  });
  refresh(id);
  redirect(`/duyurular/${id}`);
}

export async function deleteAnnouncement(formData: FormData) {
  const actor = await requireActor();
  assertCanManageAnnouncements(actor);
  const id = String(formData.get("id") ?? "");
  await prisma.$transaction(async (tx) => {
    const existing = await tx.announcement.findFirst({
      where: { AND: [{ id }, announcementWhere(actor, { manage: true })] },
      select: { id: true },
    });
    if (!existing) return;
    await tx.announcement.delete({ where: { id: existing.id } });
    await writeAudit(
      {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "announcement.delete",
        entityType: "Announcement",
        entityId: existing.id,
      },
      tx,
    );
  });
  refresh();
  redirect("/duyurular");
}
