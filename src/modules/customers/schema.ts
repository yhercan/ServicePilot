import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `En fazla ${max} karakter olabilir.`)
    .transform((value) => (value.length === 0 ? null : value));

export const customerSchema = z.object({
  companyName: z.string().trim().min(2, "Şirket adı en az 2 karakter olmalıdır.").max(200),
  contactPerson: z.string().trim().min(2, "İlgili kişi en az 2 karakter olmalıdır.").max(200),
  email: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value.length === 0 ? null : value))
    .refine((value) => value === null || z.email().safeParse(value).success, "Geçerli bir e-posta girin."),
  phone: optionalText(50),
  address: optionalText(300),
  city: optionalText(100),
  notes: optionalText(2000),
  operationsManagerId: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .refine(
      (value) => value === null || z.uuid().safeParse(value).success,
      "Geçerli bir operasyon sorumlusu seçin.",
    ),
});

export const customerContactSchema = z.object({
  fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(200),
  jobTitle: optionalText(120),
  phone: optionalText(50),
  email: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value.length === 0 ? null : value))
    .refine((value) => value === null || z.email().safeParse(value).success, "Geçerli bir e-posta girin."),
  notes: optionalText(2000),
  isPrimary: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export type CustomerInput = z.infer<typeof customerSchema>;
