"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/lib/action-state";

export function TeamForm({
  action,
  team,
  members,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  team?: { id?: string; name: string; description: string; leaderId: string };
  members: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      {team?.id ? <input type="hidden" name="id" value={team.id} /> : null}
      <FormError message={state.error} />
      <Field label="Ekip adı" htmlFor="name" error={errors?.name?.[0]}>
        <Input id="name" name="name" defaultValue={team?.name} required />
      </Field>
      <Field label="Ekip lideri" htmlFor="leaderId" error={errors?.leaderId?.[0]}>
        <select
          id="leaderId"
          name="leaderId"
          defaultValue={team?.leaderId ?? ""}
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="">Seçilmedi</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Açıklama" htmlFor="description" error={errors?.description?.[0]}>
        <Textarea id="description" name="description" defaultValue={team?.description} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}
