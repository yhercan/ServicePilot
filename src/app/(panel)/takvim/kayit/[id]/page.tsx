import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { toDateInputValue } from "@/lib/dates";
import { canCreateCalendarEntries } from "@/lib/permissions";
import { deleteCalendarEntry } from "@/modules/calendar/actions";
import { getCalendarEntry } from "@/modules/calendar/queries";

export const metadata = { title: "Takvim kaydı" };

export default function CalendarEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <CalendarEntryDetailContent params={params} />
    </PageSuspense>
  );
}

async function CalendarEntryDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const entry = await getCalendarEntry(actor, id);
  if (!entry) notFound();
  const canManage = canCreateCalendarEntries(actor.role);

  return (
    <div>
      <PageHeader
        title={entry.title}
        description={`${entry.team.name} · ${toDateInputValue(entry.entryDate)}`}
        actions={
          canManage ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/takvim/kayit/${entry.id}/duzenle`}>Düzenle</Link>
              </Button>
              <ConfirmSubmit
                action={deleteCalendarEntry}
                id={entry.id}
                label="Sil"
                message="Bu takvim kaydı silinsin mi?"
              />
            </>
          ) : null
        }
      />
      <Card className="space-y-2 p-4 text-sm">
        <div className="flex flex-wrap gap-2">
          {entry.serviceType ? <TypeBadge type={entry.serviceType} /> : null}
          <StatusBadge status={entry.status} />
          <PriorityBadge priority={entry.priority} />
        </div>
        <p>
          <span className="text-muted-foreground">Müşteri: </span>
          {entry.customer ? (
            <Link href={`/musteriler/${entry.customer.id}`} className="text-primary">
              {entry.customer.companyName}
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p>
          <span className="text-muted-foreground">Ekipman: </span>
          {entry.equipment ? (
            <Link href={`/ekipmanlar/${entry.equipment.id}`} className="text-primary">
              {entry.equipment.name}
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p>
          <span className="text-muted-foreground">Servis ziyareti: </span>
          {entry.serviceVisit ? (
            <Link href={`/servisler/${entry.serviceVisit.id}`} className="text-primary">
              {entry.serviceVisit.title}
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p>
          <span className="text-muted-foreground">Atananlar: </span>
          {entry.assignments.map((item) => item.user.name).join(", ") || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Açıklama: </span>
          {entry.description || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Oluşturan: </span>
          {entry.createdBy.name}
        </p>
      </Card>
    </div>
  );
}
