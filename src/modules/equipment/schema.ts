import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `En fazla ${max} karakter olabilir.`)
    .transform((value) => (value.length === 0 ? null : value));

export const equipmentSchema = z.object({
  customerId: z.uuid("Müşteri seçin."),
  name: z.string().trim().min(2, "Ekipman adı en az 2 karakter olmalıdır.").max(200),
  brand: optionalText(100),
  model: optionalText(100),
  serialNumber: optionalText(100),
  installationDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Kurulum tarihi geçersiz."),
  warrantyEndDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Garanti bitiş tarihi geçersiz."),
  contractEndDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Sözleşme bitiş tarihi geçersiz."),
  location: optionalText(200),
  notes: optionalText(2000),
  teamIds: z.array(z.uuid("Ekip seçimi geçersiz.")).default([]),
});

export type EquipmentInput = z.infer<typeof equipmentSchema>;
