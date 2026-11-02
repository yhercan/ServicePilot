"use client";

import { useActionState, useState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/action-state";
import {
  serviceStatusLabel,
  serviceStatuses,
  serviceTypeLabel,
  serviceTypes,
} from "@/lib/labels";
import {
  addComment,
  updateAssignments,
  updateNextVisit,
  updateVisitProgress,
} from "@/modules/visits/actions";
import { uploadServiceReport } from "@/modules/attachments/actions";

export function ProgressForm({
  visitId,
  status,
  description,
  actualStartDate,
  actualEndDate,
}: {
  visitId: string;
  status: string;
  description: string;
  actualStartDate: string;
  actualEndDate: string;
}) {
  const [state, action, pending] = useActionState(updateVisitProgress, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={visitId} />
      <FormError message={state.error} />
      <Field label="Durum" htmlFor="status" error={state.fieldErrors?.status?.[0]}>
        <select id="status" name="status" defaultValue={status} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm">
          {serviceStatuses.map((item) => (
            <option key={item} value={item}>
              {serviceStatusLabel[item]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Gerçek başlangıç" htmlFor="actualStartDate" error={state.fieldErrors?.actualStartDate?.[0]}>
          <Input id="actualStartDate" name="actualStartDate" type="datetime-local" defaultValue={actualStartDate} />
        </Field>
        <Field label="Gerçek bitiş" htmlFor="actualEndDate" error={state.fieldErrors?.actualEndDate?.[0]}>
          <Input id="actualEndDate" name="actualEndDate" type="datetime-local" defaultValue={actualEndDate} />
        </Field>
      </div>
      <Field label="Açıklama" htmlFor="progress-description" error={state.fieldErrors?.description?.[0]}>
        <Textarea id="progress-description" name="description" defaultValue={description} />
      </Field>
      <Field label="Durum notu" htmlFor="note" error={state.fieldErrors?.note?.[0]}>
        <Input id="note" name="note" placeholder="Durum değişirse geçmişe yazılır" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Servis bilgisini güncelle"}
      </Button>
    </form>
  );
}

export function AssignmentForm({
  visitId,
  technicians,
  selectedIds,
}: {
  visitId: string;
  technicians: { id: string; name: string }[];
  selectedIds: string[];
}) {
  const [state, action, pending] = useActionState(updateAssignments, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={visitId} />
      <FormError message={state.error} />
      {technicians.length === 0 ? (
        <p className="text-sm text-muted-foreground">Atanabilecek teknisyen yok.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {technicians.map((technician) => (
            <label key={technician.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="technicianIds"
                value={technician.id}
                defaultChecked={selectedIds.includes(technician.id)}
              />
              {technician.name}
            </label>
          ))}
        </div>
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Atamaları kaydet"}
      </Button>
    </form>
  );
}

export function CommentForm({ visitId }: { visitId: string }) {
  const [state, action, pending] = useActionState(addComment, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={visitId} />
      <FormError message={state.error} />
      <Field label="Yeni yorum" htmlFor="content" error={state.fieldErrors?.content?.[0]}>
        <Textarea id="content" name="content" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Ekleniyor…" : "Yorum ekle"}
      </Button>
    </form>
  );
}

export function UploadForm({ visitId }: { visitId: string }) {
  const [state, action, pending] = useActionState(uploadServiceReport, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={visitId} />
      <FormError message={state.error} />
      <Field label="PDF servis formu" htmlFor="file" error={undefined}>
        <Input id="file" name="file" type="file" accept="application/pdf,.pdf" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Yükleniyor…" : "PDF yükle"}
      </Button>
    </form>
  );
}

export function NextVisitForm({
  visitId,
  enabled,
  nextVisitDate,
  nextVisitType,
}: {
  visitId: string;
  enabled: boolean;
  nextVisitDate: string;
  nextVisitType: string;
}) {
  const [state, action, pending] = useActionState(updateNextVisit, initialActionState);
  const [active, setActive] = useState(enabled);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={visitId} />
      <FormError message={state.error} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Sıradaki ziyareti planla
      </label>
      <fieldset disabled={!active} className="space-y-3 disabled:opacity-50">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sıradaki ziyaret tarihi" htmlFor="nextVisitDate" error={state.fieldErrors?.nextVisitDate?.[0]}>
            <Input
              id="nextVisitDate"
              name="nextVisitDate"
              type="date"
              defaultValue={nextVisitDate}
              required={active}
            />
          </Field>
          <Field label="Ziyaret türü" htmlFor="nextVisitType" error={state.fieldErrors?.nextVisitType?.[0]}>
            <select
              id="nextVisitType"
              name="nextVisitType"
              defaultValue={nextVisitType || ""}
              required={active}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="" disabled>
                Tür seçin
              </option>
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {serviceTypeLabel[type]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Aktifleştirildiğinde ilgili mühendis, operasyon sorumlusu, ekip lideri ve yöneticiye bildirim
          gider. Tarihten bir hafta önce hatırlatma gönderilir.
        </p>
      </fieldset>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Sıradaki ziyareti kaydet"}
      </Button>
    </form>
  );
}
