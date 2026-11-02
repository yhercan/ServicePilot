import { z } from "zod";
import { priorities, serviceStatuses, serviceTypes } from "@/lib/labels";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `En fazla ${max} karakter olabilir.`)
    .transform((value) => (value.length === 0 ? null : value));

export const visitSchema = z.object({
  customerId: z.uuid("Müşteri seçin."),
  equipmentId: z.uuid("Ekipman seçin."),
  teamId: z.uuid("İlgili ekip seçin."),
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalıdır.").max(200),
  description: optionalText(4000),
  serviceType: z.enum(serviceTypes, { error: "Servis türü seçin." }),
  priority: z.enum(priorities, { error: "Öncelik seçin." }),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Planlanan tarih zorunludur."),
  sapReferenceNumber: optionalText(100),
  technicianIds: z.array(z.uuid("Teknisyen seçimi geçersiz.")),
});

export const progressSchema = z.object({
  status: z.enum(serviceStatuses, { error: "Durum seçin." }),
  description: optionalText(4000),
  actualStartDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value), "Başlangıç tarihi geçersiz."),
  actualEndDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value), "Bitiş tarihi geçersiz."),
  note: optionalText(500),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Yorum boş olamaz.").max(2000, "Yorum en fazla 2000 karakter olabilir."),
});

export type VisitInput = z.infer<typeof visitSchema>;
