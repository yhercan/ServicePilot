import { z } from "zod";

export const announcementSchema = z
  .object({
    title: z.string().trim().min(2, "Başlık en az 2 karakter olmalıdır.").max(200),
    content: z.string().trim().min(2, "İçerik en az 2 karakter olmalıdır.").max(10000),
    audience: z.enum(["ALL", "TEAMS"]),
    publishedAt: z
      .string()
      .trim()
      .transform((value) => (value.length === 0 ? null : value)),
    expiresAt: z
      .string()
      .trim()
      .transform((value) => (value.length === 0 ? null : value)),
    teamIds: z.array(z.uuid()).default([]),
    publishNow: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
      .optional()
      .transform((value) => value === "on" || value === "true"),
  })
  .superRefine((value, ctx) => {
    if (value.audience === "TEAMS" && value.teamIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["teamIds"],
        message: "En az bir ekip seçin.",
      });
    }
  });
