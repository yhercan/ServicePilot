import "server-only";
import { connection } from "next/server";
import type { Actor } from "@/lib/actor";
import { prisma } from "@/lib/prisma";

export const defaultUserSettings = {
  notifyNextVisitScheduled: true,
  notifyNextVisitReminder: true,
  notifyVisitAssigned: true,
  showUpcomingOnDashboard: true,
  showFollowUpsOnDashboard: true,
};

export async function getOrCreateUserSettings(actor: Actor) {
  await connection();
  const existing = await prisma.userSettings.findUnique({
    where: {
      organizationId_userId: {
        organizationId: actor.organizationId,
        userId: actor.userId,
      },
    },
  });
  if (existing) return existing;
  return prisma.userSettings.create({
    data: {
      organizationId: actor.organizationId,
      userId: actor.userId,
      ...defaultUserSettings,
    },
  });
}

export async function getProfile(actor: Actor) {
  await connection();
  return prisma.user.findUnique({
    where: { id: actor.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarPath: true,
      updatedAt: true,
    },
  });
}
