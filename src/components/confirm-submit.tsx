"use client";

import { Button } from "@/components/ui/button";

export function ConfirmSubmit({
  action,
  id,
  label,
  message,
  fieldName = "id",
  variant = "danger",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  message: string;
  fieldName?: string;
  variant?: "default" | "outline" | "ghost" | "danger";
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name={fieldName} value={id} />
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}
