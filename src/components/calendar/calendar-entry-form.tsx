"use client";

import { useActionState, useMemo, useState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { priorities, serviceStatuses, serviceTypes, priorityLabel, serviceStatusLabel, serviceTypeLabel } from "@/lib/labels";

type Options = {
  teams: { id: string; name: string }[];
  customers: {
    id: string;
    companyName: string;
    equipment: { id: string; name: string }[];
  }[];
  members: { id: string; name: string; teamIds: string[] }[];
  visits: {
    id: string;
    title: string;
    customerId: string;
    equipmentId: string;
  }[];
};

type EntryValues = {
  id?: string;
  title: string;
  description: string;
  teamId: string;
  entryDate: string;
  customerId: string;
  equipmentId: string;
  serviceVisitId: string;
  serviceType: string;
  priority: string;
  status: string;
  assigneeIds: string[];
};

export function CalendarEntryForm({
  action,
  options,
  entry,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  options: Options;
  entry?: EntryValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [customerId, setCustomerId] = useState(entry?.customerId ?? "");
  const [equipmentId, setEquipmentId] = useState(entry?.equipmentId ?? "");
  const [teamId, setTeamId] = useState(entry?.teamId ?? options.teams[0]?.id ?? "");
  const errors = state.fieldErrors;
  const equipment = useMemo(
    () => options.customers.find((customer) => customer.id === customerId)?.equipment ?? [],
    [customerId, options.customers],
  );
  const teamMembers = useMemo(
    () =>
      options.members.filter((member) =>
        teamId ? member.teamIds.includes(teamId) : true,
      ),
    [options.members, teamId],
  );

  function changeCustomer(nextCustomerId: string) {
    const nextEquipment =
      options.customers.find((customer) => customer.id === nextCustomerId)?.equipment ?? [];
    setCustomerId(nextCustomerId);
    setEquipmentId(
      nextEquipment.some((item) => item.id === equipmentId)
        ? equipmentId
        : (nextEquipment[0]?.id ?? ""),
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {entry?.id ? <input type="hidden" name="id" value={entry.id} /> : null}
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Başlık" htmlFor="title" error={errors?.title?.[0]}>
          <Input id="title" name="title" defaultValue={entry?.title} required />
        </Field>
        <Field label="Tarih" htmlFor="entryDate" error={errors?.entryDate?.[0]}>
          <Input id="entryDate" name="entryDate" type="date" defaultValue={entry?.entryDate} required />
        </Field>
        <Field label="Ekip" htmlFor="teamId" error={errors?.teamId?.[0]}>
          <select
            id="teamId"
            name="teamId"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            required
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="" disabled>
              Ekip seçin
            </option>
            {options.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Müşteri" htmlFor="customerId" error={errors?.customerId?.[0]}>
          <select
            id="customerId"
            name="customerId"
            value={customerId}
            onChange={(event) => changeCustomer(event.target.value)}
            required
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="" disabled>
              Müşteri seçin
            </option>
            {options.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.companyName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ekipman" htmlFor="equipmentId" error={errors?.equipmentId?.[0]}>
          <select
            id="equipmentId"
            name="equipmentId"
            value={equipmentId}
            onChange={(event) => setEquipmentId(event.target.value)}
            required
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="" disabled>
              {equipment.length === 0 ? "Önce müşteri seçin" : "Ekipman seçin"}
            </option>
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Servis türü" htmlFor="serviceType" error={errors?.serviceType?.[0]}>
          <select
            id="serviceType"
            name="serviceType"
            defaultValue={entry?.serviceType || "MAINTENANCE"}
            required
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {serviceTypeLabel[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mevcut servise bağla (opsiyonel)" htmlFor="serviceVisitId" error={errors?.serviceVisitId?.[0]}>
          <select
            id="serviceVisitId"
            name="serviceVisitId"
            defaultValue={entry?.serviceVisitId ?? ""}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">Yeni servis ziyareti oluştur</option>
            {options.visits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {visit.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Boş bırakırsanız takvim kaydıyla birlikte servis ziyareti de açılır.
          </p>
        </Field>
        <Field label="Öncelik" htmlFor="priority" error={errors?.priority?.[0]}>
          <select
            id="priority"
            name="priority"
            defaultValue={entry?.priority ?? "NORMAL"}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabel[priority]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Durum" htmlFor="status" error={errors?.status?.[0]}>
          <select
            id="status"
            name="status"
            defaultValue={entry?.status ?? "PLANNED"}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {serviceStatuses.map((status) => (
              <option key={status} value={status}>
                {serviceStatusLabel[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Açıklama" htmlFor="description" error={errors?.description?.[0]}>
        <Textarea id="description" name="description" defaultValue={entry?.description} />
      </Field>
      <Field label="Atanan personel" htmlFor="assigneeIds" error={errors?.assigneeIds?.[0]}>
        <div className="grid gap-2 sm:grid-cols-2">
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu ekipte atanacak personel yok.</p>
          ) : (
            teamMembers.map((member) => (
              <label key={member.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="assigneeIds"
                  value={member.id}
                  defaultChecked={entry?.assigneeIds.includes(member.id)}
                />
                {member.name}
              </label>
            ))
          )}
        </div>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}
