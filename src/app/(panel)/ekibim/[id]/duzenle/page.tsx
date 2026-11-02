import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { TeamForm } from "@/components/teams/team-form";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth";
import { canManageTeams } from "@/lib/permissions";
import { updateTeam } from "@/modules/teams/actions";
import { getTeam, listOrganizationMembers } from "@/modules/teams/queries";

export const metadata = { title: "Ekip düzenle" };

export default function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <EditTeamContent params={params} />
    </PageSuspense>
  );
}

async function EditTeamContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!canManageTeams(actor.role)) redirect("/ekibim");
  const { id } = await params;
  const [team, members] = await Promise.all([getTeam(actor, id), listOrganizationMembers(actor)]);
  if (!team) notFound();

  return (
    <div>
      <PageHeader
        title="Ekip düzenle"
        description={team.name}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/ekibim">Ekiplere dön</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/ekibim/${team.id}`}>Ekip detayı</Link>
            </Button>
          </>
        }
      />
      <TeamForm
        action={updateTeam}
        members={members}
        submitLabel="Değişiklikleri kaydet"
        team={{
          id: team.id,
          name: team.name,
          description: team.description ?? "",
          leaderId: team.leaderId ?? "",
        }}
      />
    </div>
  );
}
