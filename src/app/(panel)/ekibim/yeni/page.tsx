import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { TeamForm } from "@/components/teams/team-form";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth";
import { canManageTeams } from "@/lib/permissions";
import { createTeam } from "@/modules/teams/actions";
import { listOrganizationMembers } from "@/modules/teams/queries";

export const metadata = { title: "Yeni ekip" };

export default function NewTeamPage() {
  return (
    <PageSuspense>
      <NewTeamContent />
    </PageSuspense>
  );
}

async function NewTeamContent() {
  const actor = await requireActor();
  if (!canManageTeams(actor.role)) redirect("/ekibim");
  const members = await listOrganizationMembers(actor);

  return (
    <div>
      <PageHeader
        title="Yeni ekip"
        description="Ekip oluşturun ve lider atayın."
        actions={
          <Button asChild variant="outline">
            <Link href="/ekibim">Ekiplere dön</Link>
          </Button>
        }
      />
      <TeamForm action={createTeam} members={members} submitLabel="Ekibi kaydet" />
    </div>
  );
}
