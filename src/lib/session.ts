import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

export type SessionData = {
  userId?: string;
  organizationId?: string;
};

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error("SESSION_PASSWORD is missing or shorter than 32 characters.");
  }
  return {
    cookieName: SESSION_COOKIE_NAME,
    password,
    ttl: 60 * 60 * 24 * 14,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
