import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value));

const roleEnum = z.enum(["ADMIN", "OPERATIONS_MANAGER", "TEAM_LEADER", "SERVICE_ENGINEER"]);

export const teamSchema = z.object({
  name: z.string().trim().min(2, "Ekip adı en az 2 karakter olmalıdır.").max(120),
  description: optionalText(2000),
  leaderId: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .refine((value) => value === null || z.uuid().safeParse(value).success, "Geçerli bir ekip lideri seçin."),
});

export const teamMembersSchema = z.object({
  teamId: z.uuid(),
  memberIds: z.array(z.uuid()).default([]),
});

export const addExistingMemberSchema = z.object({
  teamId: z.uuid(),
  userId: z.uuid("Personel seçin."),
  role: roleEnum,
  setAsLeader: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export const updateMemberRoleSchema = z.object({
  teamId: z.uuid(),
  userId: z.uuid(),
  role: roleEnum,
});

export const updateOrganizationRoleSchema = z.object({
  userId: z.uuid(),
  role: roleEnum,
});

export const removeTeamMemberSchema = z.object({
  teamId: z.uuid(),
  userId: z.uuid(),
});

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(120),
  email: z.email("Geçerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır.").max(100),
  role: roleEnum,
  teamId: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .refine((value) => value === null || z.uuid().safeParse(value).success, "Geçerli bir ekip seçin."),
  setAsLeader: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((value) => value === "on" || value === "true"),
});
