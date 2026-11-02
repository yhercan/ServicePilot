import { z } from "zod";
import { serviceTypes } from "@/lib/labels";

export const nextVisitSchema = z
  .object({
    enabled: z.boolean(),
    nextVisitDate: z.string().trim(),
    nextVisitType: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.nextVisitDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["nextVisitDate"],
        message: "Sıradaki ziyaret tarihi gerekli.",
      });
    }
    if (!serviceTypes.includes(value.nextVisitType as (typeof serviceTypes)[number])) {
      ctx.addIssue({
        code: "custom",
        path: ["nextVisitType"],
        message: "Sıradaki ziyaret türü seçin.",
      });
    }
  });
