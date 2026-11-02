import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `En fazla ${max} karakter olabilir.`)
    .transform((value) => (value.length === 0 ? null : value));

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalıdır.").max(120),
  email: z.string().trim().email("Geçerli bir e-posta girin.").max(200),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifre gerekli."),
    newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır.").max(100),
    confirmPassword: z.string().min(1, "Şifre tekrarı gerekli."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export const notificationPrefsSchema = z.object({
  notifyNextVisitScheduled: z.boolean(),
  notifyNextVisitReminder: z.boolean(),
  notifyVisitAssigned: z.boolean(),
  showUpcomingOnDashboard: z.boolean(),
  showFollowUpsOnDashboard: z.boolean(),
});

export const optionalNote = optionalText(500);
