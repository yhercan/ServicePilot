"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/lib/action-state";

type CustomerValues = {
  id?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  operationsManagerId: string;
};

export function CustomerForm({
  action,
  customer,
  managers,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  customer?: CustomerValues;
  managers: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      {customer?.id ? <input type="hidden" name="id" value={customer.id} /> : null}
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Şirket adı" htmlFor="companyName" error={errors?.companyName?.[0]}>
          <Input id="companyName" name="companyName" defaultValue={customer?.companyName} required />
        </Field>
        <Field label="İlgili kişi" htmlFor="contactPerson" error={errors?.contactPerson?.[0]}>
          <Input id="contactPerson" name="contactPerson" defaultValue={customer?.contactPerson} required />
        </Field>
        <Field label="Operasyon Sorumlusu" htmlFor="operationsManagerId" error={errors?.operationsManagerId?.[0]}>
          <select
            id="operationsManagerId"
            name="operationsManagerId"
            defaultValue={customer?.operationsManagerId ?? ""}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">Seçilmedi</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="E-posta" htmlFor="email" error={errors?.email?.[0]}>
          <Input id="email" name="email" type="email" defaultValue={customer?.email} />
        </Field>
        <Field label="Telefon" htmlFor="phone" error={errors?.phone?.[0]}>
          <Input id="phone" name="phone" defaultValue={customer?.phone} />
        </Field>
        <Field label="Şehir" htmlFor="city" error={errors?.city?.[0]}>
          <Input id="city" name="city" defaultValue={customer?.city} />
        </Field>
        <Field label="Adres" htmlFor="address" error={errors?.address?.[0]}>
          <Input id="address" name="address" defaultValue={customer?.address} />
        </Field>
      </div>
      <Field label="Notlar" htmlFor="notes" error={errors?.notes?.[0]}>
        <Textarea id="notes" name="notes" defaultValue={customer?.notes} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}
