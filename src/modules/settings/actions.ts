"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { actionError, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { writeAudit } from "@/lib/audit";
import { requireActor } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { fileStorage } from "@/server/storage";
import { assertImageUpload } from "@/server/storage/local-storage";
import {
  notificationPrefsSchema,
  passwordSchema,
  profileSchema,
} from "@/modules/settings/schema";

function refreshSettings() {
  revalidatePath("/ayarlar");
  revalidatePath("/panel");
}

export async function updateProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActor();
    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
    });
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
    const email = parsed.data.email.toLowerCase();
    const clash = await prisma.user.findFirst({
      where: { email, NOT: { id: actor.userId } },
      select: { id: true },
    });
    if (clash) return { error: "Bu e-posta başka bir hesapta kullanılıyor." };

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.userId },
        data: { name: parsed.data.name, email },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "settings.profile",
          entityType: "User",
          entityId: actor.userId,
        },
        tx,
      );
    });
  } catch (error) {
    return actionError(error);
  }
  refreshSettings();
  return {};
}

export async function updatePassword(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActor();
    const parsed = passwordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { passwordHash: true },
    });
    if (!user) throw new AppError("Hesap bulunamadı.");
    const ok = await compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return { fieldErrors: { currentPassword: ["Mevcut şifre hatalı."] } };

    const passwordHash = await hash(parsed.data.newPassword, 12);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.userId },
        data: { passwordHash },
      });
      await writeAudit(
        {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: "settings.password",
          entityType: "User",
          entityId: actor.userId,
        },
        tx,
      );
    });
  } catch (error) {
    return actionError(error);
  }
  refreshSettings();
  return {};
}

export async function updateNotificationPrefs(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor();
    const parsed = notificationPrefsSchema.safeParse({
      notifyNextVisitScheduled: formData.get("notifyNextVisitScheduled") === "on",
      notifyNextVisitReminder: formData.get("notifyNextVisitReminder") === "on",
      notifyVisitAssigned: formData.get("notifyVisitAssigned") === "on",
      showUpcomingOnDashboard: formData.get("showUpcomingOnDashboard") === "on",
      showFollowUpsOnDashboard: formData.get("showFollowUpsOnDashboard") === "on",
    });
    if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

    await prisma.userSettings.upsert({
      where: {
        organizationId_userId: {
          organizationId: actor.organizationId,
          userId: actor.userId,
        },
      },
      create: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        ...parsed.data,
      },
      update: parsed.data,
    });
  } catch (error) {
    return actionError(error);
  }
  refreshSettings();
  return {};
}

export async function updateAvatar(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireActor();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Profil fotoğrafı seçin." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = assertImageUpload(file, bytes);
    const stored = await fileStorage.saveImage({
      organizationId: actor.organizationId,
      bytes,
      extension,
    });

    const previous = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { avatarPath: true },
    });

    try {
      await prisma.user.update({
        where: { id: actor.userId },
        data: { avatarPath: stored.storagePath },
      });
    } catch (error) {
      await fileStorage.remove(stored.storagePath).catch(() => undefined);
      throw error;
    }

    if (previous?.avatarPath) {
      await fileStorage.remove(previous.avatarPath).catch(() => undefined);
    }
  } catch (error) {
    return actionError(error);
  }
  refreshSettings();
  return {};
}

export async function removeAvatar() {
  const actor = await requireActor();
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { avatarPath: true },
  });
  await prisma.user.update({
    where: { id: actor.userId },
    data: { avatarPath: null },
  });
  if (user?.avatarPath) {
    await fileStorage.remove(user.avatarPath).catch(() => undefined);
  }
  refreshSettings();
}
