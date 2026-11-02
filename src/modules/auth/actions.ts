"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionError, type ActionState, zodFieldErrors } from "@/lib/action-state";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const DUMMY_PASSWORD_HASH = "$2b$12$9qHD19HM8NjDZWRtUSC9lu/d0S8U010HuL.XsuCb7ht35ogjwh0.i";

const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifre zorunludur."),
});

export async function login(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
        memberships: {
          select: { organizationId: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    const passwordMatches = await compare(
      parsed.data.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    const membership = user?.memberships[0];
    if (!user || !passwordMatches || !membership) {
      return { error: "E-posta veya şifre hatalı." };
    }

    const session = await getSession();
    session.userId = user.id;
    session.organizationId = membership.organizationId;
    await session.save();
  } catch (error) {
    return actionError(error);
  }

  redirect("/panel");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/giris");
}
