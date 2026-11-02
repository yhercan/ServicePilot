import { z } from "zod";

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .refine((value) => value === null || z.uuid().safeParse(value).success, "Geçersiz kimlik.");

export const calendarEntrySchema = z.object({
  title: z.string().trim().min(2, "Başlık en az 2 karakter olmalıdır.").max(200),
  description: z
    .string()
    .trim()
    .max(5000)
    .transform((value) => (value.length === 0 ? null : value)),
  teamId: z.uuid("Ekip seçin."),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin."),
  customerId: z.uuid("Müşteri seçin."),
  equipmentId: z.uuid("Ekipman seçin."),
  serviceVisitId: optionalUuid,
  serviceType: z.enum(["MAINTENANCE", "BREAKDOWN", "INSTALLATION"], {
    error: "Servis türü seçin.",
  }),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  status: z
    .enum(["PLANNED", "ASSIGNED", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED"])
    .default("PLANNED"),
  assigneeIds: z.array(z.uuid()).default([]),
});
