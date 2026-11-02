import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Actor } from "@/lib/actor";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function getActor(): Promise<Actor | null> {
  // Session / cookies are request-time only; avoid Cache Components prerender traps.
  await connection();

  const session = await getSession();
  if (!session.userId || !session.organizationId) {
    return null;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: session.organizationId,
        userId: session.userId,
      },
    },
    select: {
      role: true,
      organization: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, avatarPath: true } },
    },
  });

  if (!membership) {
    session.destroy();
    return null;
  }

  return {
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    avatarPath: membership.user.avatarPath,
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    role: membership.role,
  };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) {
    redirect("/giris");
  }
  return actor;
}
