"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationRead(formData: FormData) {
  const actor = await requireActor();
  const id = String(formData.get("id") ?? "");
  await prisma.notification.updateMany({
    where: {
      id,
      userId: actor.userId,
      organizationId: actor.organizationId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/panel");
  revalidatePath("/ayarlar");
}

export async function markAllNotificationsRead() {
  const actor = await requireActor();
  await prisma.notification.updateMany({
    where: {
      userId: actor.userId,
      organizationId: actor.organizationId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/panel");
  revalidatePath("/ayarlar");
}
