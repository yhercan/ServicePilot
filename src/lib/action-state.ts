import { unstable_rethrow } from "next/navigation";
import type { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = {};

export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") continue;
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

export function actionError(error: unknown): ActionState {
  unstable_rethrow(error);
  if (error instanceof AppError) {
    return { error: error.message };
  }
  console.error("Unexpected server action failure.", error);
  return { error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." };
}
