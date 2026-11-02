"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/lib/action-state";

type EquipmentValues = {
  id?: string;
  customerId: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  warrantyEndDate: string;
  contractEndDate: string;
  location: string;
  notes: string;
  teamIds: string[];
};

export function EquipmentForm({
  action,
  customers,
  teams,
  equipment,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  customers: { id: string; companyName: string }[];
  teams: { id: string; name: string }[];
  equipment?: EquipmentValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      {equipment?.id ? <input type="hidden" name="id" value={equipment.id} /> : null}
      <FormError message={state.error} />
      <Field label="Müşteri" htmlFor="customerId" error={errors?.customerId?.[0]}>
        <select
          id="customerId"
          name="customerId"
          defaultValue={equipment?.customerId ?? ""}
          required
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="" disabled>
            Müşteri seçin
          </option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.companyName}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ekipman adı" htmlFor="name" error={errors?.name?.[0]}>
          <Input id="name" name="name" defaultValue={equipment?.name} required />
        </Field>
        <Field label="Marka" htmlFor="brand" error={errors?.brand?.[0]}>
          <Input id="brand" name="brand" defaultValue={equipment?.brand} />
        </Field>
        <Field label="Model" htmlFor="model" error={errors?.model?.[0]}>
          <Input id="model" name="model" defaultValue={equipment?.model} />
        </Field>
        <Field label="Seri numarası" htmlFor="serialNumber" error={errors?.serialNumber?.[0]}>
          <Input id="serialNumber" name="serialNumber" defaultValue={equipment?.serialNumber} />
        </Field>
        <Field label="Kurulum tarihi" htmlFor="installationDate" error={errors?.installationDate?.[0]}>
          <Input
            id="installationDate"
            name="installationDate"
            type="date"
            defaultValue={equipment?.installationDate}
          />
        </Field>
        <Field label="Garanti bitiş" htmlFor="warrantyEndDate" error={errors?.warrantyEndDate?.[0]}>
          <Input
            id="warrantyEndDate"
            name="warrantyEndDate"
            type="date"
            defaultValue={equipment?.warrantyEndDate}
          />
        </Field>
        <Field label="Sözleşme bitiş" htmlFor="contractEndDate" error={errors?.contractEndDate?.[0]}>
          <Input
            id="contractEndDate"
            name="contractEndDate"
            type="date"
            defaultValue={equipment?.contractEndDate}
          />
        </Field>
        <Field label="Konum" htmlFor="location" error={errors?.location?.[0]}>
          <Input id="location" name="location" defaultValue={equipment?.location} />
        </Field>
      </div>
      <Field label="İlgili ekipler" htmlFor="teamIds" error={errors?.teamIds?.[0]}>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Henüz ekip yok. Önce Ekibim’den ekip oluşturun.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {teams.map((team) => (
              <label
                key={team.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="teamIds"
                  value={team.id}
                  defaultChecked={equipment?.teamIds.includes(team.id)}
                />
                {team.name}
              </label>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Bu ekipmanla ilgili ekipleri seçin. Ekip liderleri ve servis atamaları buna göre
          yönlendirilir.
        </p>
      </Field>
      <Field label="Notlar" htmlFor="notes" error={errors?.notes?.[0]}>
        <Textarea id="notes" name="notes" defaultValue={equipment?.notes} />
      </Field>
      <Button type="submit" disabled={pending || customers.length === 0}>
        {pending ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}
