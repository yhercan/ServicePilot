import { redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { requireActor } from "@/lib/auth";
import { canManageAnnouncements } from "@/lib/permissions";
import { createAnnouncement } from "@/modules/announcements/actions";
import { listTeams } from "@/modules/teams/queries";

export const metadata = { title: "Yeni duyuru" };

export default function NewAnnouncementPage() {
  return (
    <PageSuspense>
      <NewAnnouncementContent />
    </PageSuspense>
  );
}

async function NewAnnouncementContent() {
  const actor = await requireActor();
  if (!canManageAnnouncements(actor.role)) redirect("/duyurular");
  const teamLeaderMode = actor.role === "TEAM_LEADER";
  const teams = await listTeams(actor, {
    activeOnly: true,
    ledOnly: teamLeaderMode,
  });

  return (
    <div>
      <PageHeader
        title="Yeni duyuru"
        description={
          teamLeaderMode
            ? "Duyurunuz yalnızca kendi ekibinize gider."
            : "Organizasyon duyurusu oluşturun."
        }
      />
      <AnnouncementForm
        action={createAnnouncement}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
        submitLabel="Duyuruyu kaydet"
        teamLeaderMode={teamLeaderMode}
      />
    </div>
  );
}
