import { notFound, redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { requireActor } from "@/lib/auth";
import { toDateTimeInputValue } from "@/lib/dates";
import { canManageAnnouncements } from "@/lib/permissions";
import { updateAnnouncement } from "@/modules/announcements/actions";
import { getAnnouncement } from "@/modules/announcements/queries";
import { listTeams } from "@/modules/teams/queries";

export const metadata = { title: "Duyuru düzenle" };

export default function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <EditAnnouncementContent params={params} />
    </PageSuspense>
  );
}

async function EditAnnouncementContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!canManageAnnouncements(actor.role)) redirect("/duyurular");
  const { id } = await params;
  const teamLeaderMode = actor.role === "TEAM_LEADER";
  const [announcement, teams] = await Promise.all([
    getAnnouncement(actor, id, true),
    listTeams(actor, { activeOnly: true, ledOnly: teamLeaderMode }),
  ]);
  if (!announcement) notFound();

  return (
    <div>
      <PageHeader title="Duyuru düzenle" description={announcement.title} />
      <AnnouncementForm
        action={updateAnnouncement}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
        submitLabel="Değişiklikleri kaydet"
        teamLeaderMode={teamLeaderMode}
        announcement={{
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          audience: announcement.audience,
          publishedAt: toDateTimeInputValue(announcement.publishedAt),
          expiresAt: toDateTimeInputValue(announcement.expiresAt),
          teamIds: announcement.teams.map((item) => item.teamId),
          publishNow: announcement.status === "PUBLISHED",
        }}
      />
    </div>
  );
}
