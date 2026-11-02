import { notFound, redirect } from "next/navigation";
import { CalendarEntryForm } from "@/components/calendar/calendar-entry-form";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { requireActor } from "@/lib/auth";
import { toDateInputValue } from "@/lib/dates";
import { canCreateCalendarEntries } from "@/lib/permissions";
import { updateCalendarEntry } from "@/modules/calendar/actions";
import { getCalendarEntry, listCalendarFormOptions } from "@/modules/calendar/queries";

export const metadata = { title: "Takvim kaydı düzenle" };

export default function EditCalendarEntryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <EditCalendarEntryContent params={params} />
    </PageSuspense>
  );
}

async function EditCalendarEntryContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!canCreateCalendarEntries(actor.role)) redirect("/takvim");
  const { id } = await params;
  const [entry, options] = await Promise.all([
    getCalendarEntry(actor, id),
    listCalendarFormOptions(actor),
  ]);
  if (!entry) notFound();

  return (
    <div>
      <PageHeader title="Takvim kaydı düzenle" description={entry.title} />
      <CalendarEntryForm
        action={updateCalendarEntry}
        options={options}
        submitLabel="Değişiklikleri kaydet"
        entry={{
          id: entry.id,
          title: entry.title,
          description: entry.description ?? "",
          teamId: entry.teamId,
          entryDate: toDateInputValue(entry.entryDate),
          customerId: entry.customerId ?? "",
          equipmentId: entry.equipmentId ?? "",
          serviceVisitId: entry.serviceVisitId ?? "",
          serviceType: entry.serviceType ?? "",
          priority: entry.priority,
          status: entry.status,
          assigneeIds: entry.assignments.map((item) => item.userId),
        }}
      />
    </div>
  );
}
