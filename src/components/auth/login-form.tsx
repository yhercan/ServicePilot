"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/action-state";
import { login } from "@/modules/auth/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <Field label="E-posta" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Şifre" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>
    </form>
  );
}
