import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { announcementAudienceLabel, announcementStatusLabel } from "@/lib/labels";
import { canManageAnnouncements } from "@/lib/permissions";
import { listAnnouncements } from "@/modules/announcements/queries";

export const metadata = { title: "Duyurular" };

export default function AnnouncementsPage() {
  return (
    <PageSuspense>
      <AnnouncementsContent />
    </PageSuspense>
  );
}

async function AnnouncementsContent() {
  const actor = await requireActor();
  const canManage = canManageAnnouncements(actor.role);
  const announcements = await listAnnouncements(actor, canManage);

  return (
    <div>
      <PageHeader
        title="Duyurular"
        description="Organizasyon duyuruları ve yayın durumu."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/duyurular/yeni">Yeni duyuru</Link>
            </Button>
          ) : null
        }
      />
      {announcements.length === 0 ? (
        <EmptyState title="Duyuru yok" description="Görüntülenecek duyuru bulunmuyor." />
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <Link
              key={item.id}
              href={`/duyurular/${item.id}`}
              className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium">{item.title}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {announcementStatusLabel[item.status]}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {announcementAudienceLabel[item.audience]}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.createdBy.name}
                {item.publishedAt ? ` · ${formatDateTime(item.publishedAt)}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
