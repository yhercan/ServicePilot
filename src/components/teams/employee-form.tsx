"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { assignableMembershipRoles, roleLabel } from "@/lib/labels";

export function EmployeeForm({
  action,
  teams,
  defaultTeamId,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  teams: { id: string; name: string }[];
  defaultTeamId?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad soyad" htmlFor="name" error={errors?.name?.[0]}>
          <Input id="name" name="name" required />
        </Field>
        <Field label="E-posta" htmlFor="email" error={errors?.email?.[0]}>
          <Input id="email" name="email" type="email" required />
        </Field>
        <Field label="Geçici şifre" htmlFor="password" error={errors?.password?.[0]}>
          <Input id="password" name="password" type="password" required minLength={8} />
        </Field>
        <Field label="Uygulama rolü" htmlFor="role" error={errors?.role?.[0]}>
          <select
            id="role"
            name="role"
            defaultValue="SERVICE_ENGINEER"
            required
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {assignableMembershipRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabel[role]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ekip (opsiyonel)" htmlFor="teamId" error={errors?.teamId?.[0]}>
          <select
            id="teamId"
            name="teamId"
            defaultValue={defaultTeamId ?? ""}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">Şimdilik ekibe bağlama</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="setAsLeader" />
        Seçilen ekibe lider olarak ata
      </label>
      <p className="text-xs text-muted-foreground">
        Personel organizasyona uygulama rolüyle eklenir. İsterseniz aynı anda bir ekibe de bağlanır.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}
