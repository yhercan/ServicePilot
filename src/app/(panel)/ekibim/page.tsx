import Link from "next/link";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth";
import { canManageTeams } from "@/lib/permissions";
import { deleteTeam } from "@/modules/teams/actions";
import { listTeams } from "@/modules/teams/queries";

export const metadata = { title: "Ekibim" };

export default function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  return (
    <PageSuspense>
      <TeamsContent searchParams={searchParams} />
    </PageSuspense>
  );
}

async function TeamsContent({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const actor = await requireActor();
  const { hata } = await searchParams;
  const teams = await listTeams(actor);
  const canManage = canManageTeams(actor.role);

  return (
    <div>
      <PageHeader
        title="Ekibim"
        description="Ekipleri yönetin ve yönetici altındaki personeli rolleriyle içeri alın."
        actions={
          canManage ? (
            <>
              <Button asChild variant="outline">
                <Link href="/ekibim/personel">Personel</Link>
              </Button>
              <Button asChild>
                <Link href="/ekibim/yeni">Yeni ekip</Link>
              </Button>
            </>
          ) : null
        }
      />
      {hata ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
          {hata}
        </p>
      ) : null}
      {teams.length === 0 ? (
        <EmptyState title="Ekip yok" description="Henüz ekip oluşturulmamış." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ekip</th>
                <th className="px-4 py-3 font-medium">Lider</th>
                <th className="px-4 py-3 font-medium">Üye</th>
                <th className="px-4 py-3 font-medium">Açık servis</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                {canManage ? <th className="px-4 py-3 font-medium" /> : null}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/ekibim/${team.id}`} className="font-medium text-primary">
                      {team.name}
                    </Link>
                    {team.description ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{team.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{team.leader?.name ?? "—"}</td>
                  <td className="px-4 py-3">{team._count.memberships}</td>
                  <td className="px-4 py-3">{team._count.visits}</td>
                  <td className="px-4 py-3">{team.isActive ? "Aktif" : "Pasif"}</td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/ekibim/${team.id}/duzenle`}>Düzenle</Link>
                        </Button>
                        <ConfirmSubmit
                          action={deleteTeam}
                          id={team.id}
                          label="Sil"
                          message="Bu ekip silinsin mi? Bağlı takvim kayıtları da kaldırılır; servis ziyaretleri ekipsiz kalır."
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
