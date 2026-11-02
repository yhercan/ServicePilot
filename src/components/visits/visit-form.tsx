"use client";

import { useActionState, useMemo, useState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { priorities, priorityLabel, serviceTypeLabel, serviceTypes } from "@/lib/labels";

type CustomerOption = {
  id: string;
  companyName: string;
  equipment: {
    id: string;
    name: string;
    serialNumber: string | null;
    teamLinks: { team: { id: string; name: string } }[];
  }[];
};

type VisitValues = {
  id?: string;
  customerId: string;
  equipmentId: string;
  teamId: string;
  title: string;
  description: string;
  serviceType: string;
  priority: string;
  plannedDate: string;
  sapReferenceNumber: string;
  technicianIds: string[];
};

export function VisitForm({
  action,
  customers,
  technicians,
  teams,
  visit,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  customers: CustomerOption[];
  technicians: { id: string; name: string; teamIds?: string[] }[];
  teams: { id: string; name: string }[];
  visit?: VisitValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [customerId, setCustomerId] = useState(visit?.customerId ?? customers[0]?.id ?? "");
  const equipment = customers.find((customer) => customer.id === customerId)?.equipment ?? [];
  const [equipmentId, setEquipmentId] = useState(
    visit?.equipmentId ?? equipment[0]?.id ?? "",
  );
  const selectedEquipment = equipment.find((item) => item.id === equipmentId);
  const equipmentTeams = useMemo(() => {
    const linked = selectedEquipment?.teamLinks.map((link) => link.team) ?? [];
    if (linked.length > 0) return linked;
    return teams;
  }, [selectedEquipment, teams]);
  const [teamId, setTeamId] = useState(
    visit?.teamId ??
      (equipmentTeams.length === 1 ? equipmentTeams[0].id : "") ??
      "",
  );
  const errors = state.fieldErrors;

  const visibleTechnicians = useMemo(() => {
    if (!teamId) return technicians;
    return technicians.filter(
      (person) => !person.teamIds || person.teamIds.length === 0 || person.teamIds.includes(teamId),
    );
  }, [technicians, teamId]);

  function changeCustomer(nextCustomerId: string) {
    const nextEquipment = customers.find((customer) => customer.id === nextCustomerId)?.equipment ?? [];
    const nextEquipmentId = nextEquipment.some((item) => item.id === equipmentId)
      ? equipmentId
      : (nextEquipment[0]?.id ?? "");
    setCustomerId(nextCustomerId);
    setEquipmentId(nextEquipmentId);
    const nextTeams =
      nextEquipment.find((item) => item.id === nextEquipmentId)?.teamLinks.map((link) => link.team) ??
      teams;
    setTeamId(nextTeams.length === 1 ? nextTeams[0].id : "");
  }

  function changeEquipment(nextEquipmentId: string) {
    setEquipmentId(nextEquipmentId);
    const nextTeams =
      equipment.find((item) => item.id === nextEquipmentId)?.teamLinks.map((link) => link.team) ??
      teams;
    setTeamId((current) =>
      nextTeams.some((team) => team.id === current)
        ? current
        : nextTeams.length === 1
          ? nextTeams[0].id
          : "",
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {visit?.id ? <input type="hidden" name="id" value={visit.id} /> : null}
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Müşteri" htmlFor="customerId" error={errors?.customerId?.[0]}>
          <select
            id="customerId"
            name="customerId"
            value={customerId}
            onChange={(event) => changeCustomer(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            required
          >
            {customers.map((customer) => (
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
            onChange={(event) => changeEquipment(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            required
          >
            {equipment.length === 0 ? <option value="">Bu müşterinin ekipmanı yok</option> : null}
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.serialNumber ? ` · ${item.serialNumber}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="İlgili ekip" htmlFor="teamId" error={errors?.teamId?.[0]}>
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
            {equipmentTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Seçilen ekibin takvimine de otomatik kayıt düşer.
          </p>
        </Field>
        <Field label="Başlık" htmlFor="title" error={errors?.title?.[0]}>
          <Input id="title" name="title" defaultValue={visit?.title} required />
        </Field>
        <Field label="Planlanan tarih" htmlFor="plannedDate" error={errors?.plannedDate?.[0]}>
          <Input id="plannedDate" name="plannedDate" type="date" defaultValue={visit?.plannedDate} required />
        </Field>
        <Field label="Servis türü" htmlFor="serviceType" error={errors?.serviceType?.[0]}>
          <select
            id="serviceType"
            name="serviceType"
            defaultValue={visit?.serviceType ?? "MAINTENANCE"}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {serviceTypeLabel[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Öncelik" htmlFor="priority" error={errors?.priority?.[0]}>
          <select
            id="priority"
            name="priority"
            defaultValue={visit?.priority ?? "NORMAL"}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabel[priority]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Açıklama" htmlFor="description" error={errors?.description?.[0]}>
        <Textarea id="description" name="description" defaultValue={visit?.description} />
      </Field>
      <Field label="SAP referans numarası" htmlFor="sapReferenceNumber" error={errors?.sapReferenceNumber?.[0]}>
        <Input
          id="sapReferenceNumber"
          name="sapReferenceNumber"
          defaultValue={visit?.sapReferenceNumber}
          placeholder="İsteğe bağlı, ileride kullanılmak üzere"
        />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Teknisyenler</legend>
        {visibleTechnicians.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {teamId ? "Seçilen ekipte atanacak personel yok." : "Bu organizasyonda teknisyen kaydı yok."}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleTechnicians.map((technician) => (
              <label
                key={technician.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="technicianIds"
                  value={technician.id}
                  defaultChecked={visit?.technicianIds.includes(technician.id)}
                />
                {technician.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <Button type="submit" disabled={pending || equipment.length === 0}>
        {pending ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}
