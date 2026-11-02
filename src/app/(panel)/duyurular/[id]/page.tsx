import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { announcementAudienceLabel, announcementStatusLabel } from "@/lib/labels";
import { canManageAnnouncements } from "@/lib/permissions";
import {
  deleteAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
} from "@/modules/announcements/actions";
import { getAnnouncement } from "@/modules/announcements/queries";

export const metadata = { title: "Duyuru" };

export default function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <AnnouncementDetailContent params={params} />
    </PageSuspense>
  );
}

async function AnnouncementDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const canManage = canManageAnnouncements(actor.role);
  const announcement = await getAnnouncement(actor, id, canManage);
  if (!announcement) notFound();

  return (
    <div>
      <PageHeader
        title={announcement.title}
        description={`${announcementStatusLabel[announcement.status]} · ${announcementAudienceLabel[announcement.audience]}`}
        actions={
          canManage ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/duyurular/${announcement.id}/duzenle`}>Düzenle</Link>
              </Button>
              {announcement.status === "PUBLISHED" ? (
                <form action={unpublishAnnouncement}>
                  <input type="hidden" name="id" value={announcement.id} />
                  <Button type="submit" variant="outline">
                    Yayından kaldır
                  </Button>
                </form>
              ) : (
                <form action={publishAnnouncement}>
                  <input type="hidden" name="id" value={announcement.id} />
                  <Button type="submit">Yayınla</Button>
                </form>
              )}
              <ConfirmSubmit
                action={deleteAnnouncement}
                id={announcement.id}
                label="Sil"
                message="Bu duyuru silinsin mi?"
              />
            </>
          ) : null
        }
      />
      <Card className="space-y-3 p-5 text-sm">
        <p className="whitespace-pre-wrap leading-6">{announcement.content}</p>
        <div className="border-t border-border pt-3 text-muted-foreground">
          <p>Oluşturan: {announcement.createdBy.name}</p>
          <p>Oluşturma: {formatDateTime(announcement.createdAt)}</p>
          <p>Yayın: {announcement.publishedAt ? formatDateTime(announcement.publishedAt) : "—"}</p>
          <p>Bitiş: {announcement.expiresAt ? formatDateTime(announcement.expiresAt) : "—"}</p>
          {announcement.audience === "TEAMS" ? (
            <p>
              Ekipler:{" "}
              {announcement.teams.map((item) => item.team.name).join(", ") || "—"}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
