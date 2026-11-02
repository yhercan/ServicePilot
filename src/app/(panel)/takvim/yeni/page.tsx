import { redirect } from "next/navigation";
import { CalendarEntryForm } from "@/components/calendar/calendar-entry-form";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { requireActor } from "@/lib/auth";
import { canCreateCalendarEntries } from "@/lib/permissions";
import { createCalendarEntry } from "@/modules/calendar/actions";
import { listCalendarFormOptions } from "@/modules/calendar/queries";

export const metadata = { title: "Yeni takvim kaydı" };

export default function NewCalendarEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ ekip?: string }>;
}) {
  return (
    <PageSuspense>
      <NewCalendarEntryContent searchParams={searchParams} />
    </PageSuspense>
  );
}

async function NewCalendarEntryContent({
  searchParams,
}: {
  searchParams: Promise<{ ekip?: string }>;
}) {
  const actor = await requireActor();
  if (!canCreateCalendarEntries(actor.role)) redirect("/takvim");
  const params = await searchParams;
  const options = await listCalendarFormOptions(actor);
  const teamId =
    params.ekip && options.teams.some((team) => team.id === params.ekip) ? params.ekip : "";

  return (
    <div>
      <PageHeader
        title="Takvim kaydı"
        description="Takvim kaydı oluşturulunca aynı anda servis ziyareti de açılır ve birbirine bağlanır."
      />
      <CalendarEntryForm
        action={createCalendarEntry}
        options={options}
        entry={
          teamId
            ? {
                title: "",
                description: "",
                teamId,
                entryDate: "",
                customerId: "",
                equipmentId: "",
                serviceVisitId: "",
                serviceType: "MAINTENANCE",
                priority: "NORMAL",
                status: "PLANNED",
                assigneeIds: [],
              }
            : undefined
        }
        submitLabel="Kaydı oluştur"
      />
    </div>
  );
}
