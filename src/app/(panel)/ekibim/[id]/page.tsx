import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { EmployeeForm } from "@/components/teams/employee-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { assignableMembershipRoles, roleLabel } from "@/lib/labels";
import { canManageTeams } from "@/lib/permissions";
import {
  addExistingMemberToTeam,
  createEmployee,
  deleteTeam,
  removeTeamMember,
  setTeamActive,
  updateTeamMemberRole,
} from "@/modules/teams/actions";
import { getTeam, listOrganizationMembers } from "@/modules/teams/queries";

export const metadata = { title: "Ekip" };

export default function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  return (
    <PageSuspense>
      <TeamDetailContent params={params} searchParams={searchParams} />
    </PageSuspense>
  );
}

async function TeamDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const { hata } = await searchParams;
  const [team, members] = await Promise.all([getTeam(actor, id), listOrganizationMembers(actor)]);
  if (!team) notFound();
  const canManage = canManageTeams(actor.role);
  const selected = new Set(team.memberships.map((item) => item.userId));
  const availableMembers = members.filter((member) => !selected.has(member.id));

  return (
    <div>
      <PageHeader
        title={team.name}
        description={team.description || "Ekip detayı ve üye rolleri"}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/ekibim">Ekiplere dön</Link>
            </Button>
            {canManage ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/ekibim/${team.id}/duzenle`}>Düzenle</Link>
                </Button>
                <form action={setTeamActive}>
                  <input type="hidden" name="id" value={team.id} />
                  <input type="hidden" name="active" value={team.isActive ? "false" : "true"} />
                  <Button type="submit" variant="outline">
                    {team.isActive ? "Pasife al" : "Aktifleştir"}
                  </Button>
                </form>
                <ConfirmSubmit
                  action={deleteTeam}
                  id={team.id}
                  label="Ekibi sil"
                  message="Bu ekip silinsin mi? Bağlı takvim kayıtları da kaldırılır; servis ziyaretleri ekipsiz kalır."
                />
              </>
            ) : null}
          </>
        }
      />
      {hata ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
          {hata}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="space-y-2 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Durum: </span>
            {team.isActive ? "Aktif" : "Pasif"}
          </p>
          <p>
            <span className="text-muted-foreground">Lider: </span>
            {team.leader?.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Üye sayısı: </span>
            {team.memberships.length}
          </p>
          {canManage ? (
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/ekibim/personel">Tüm personel</Link>
            </Button>
          ) : null}
        </Card>

        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-medium">Ekip üyeleri ve roller</h2>
            {team.memberships.length === 0 ? (
              <EmptyState title="Üye yok" description="Bu ekibe henüz üye atanmamış." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ad</th>
                      <th className="px-4 py-3 font-medium">E-posta</th>
                      <th className="px-4 py-3 font-medium">Uygulama rolü</th>
                      {canManage ? <th className="px-4 py-3 font-medium" /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {team.memberships.map((membership) => {
                      const role = membership.user.memberships[0]?.role ?? "SERVICE_ENGINEER";
                      return (
                        <tr key={membership.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            {membership.user.name}
                            {team.leaderId === membership.userId ? (
                              <span className="ml-2 text-xs text-muted-foreground">Lider</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{membership.user.email}</td>
                          <td className="px-4 py-3">
                            {canManage ? (
                              <form action={updateTeamMemberRole} className="flex flex-wrap items-center gap-2">
                                <input type="hidden" name="teamId" value={team.id} />
                                <input type="hidden" name="userId" value={membership.userId} />
                                <select
                                  name="role"
                                  defaultValue={role}
                                  className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                                  aria-label={`${membership.user.name} rolü`}
                                >
                                  {assignableMembershipRoles.map((item) => (
                                    <option key={item} value={item}>
                                      {roleLabel[item]}
                                    </option>
                                  ))}
                                </select>
                                <Button type="submit" size="sm" variant="outline">
                                  Rolü kaydet
                                </Button>
                              </form>
                            ) : (
                              roleLabel[role]
                            )}
                          </td>
                          {canManage ? (
                            <td className="px-4 py-3 text-right">
                              {team.leaderId === membership.userId ? (
                                <span className="text-xs text-muted-foreground">Lider</span>
                              ) : (
                                <form action={removeTeamMember}>
                                  <input type="hidden" name="teamId" value={team.id} />
                                  <input type="hidden" name="userId" value={membership.userId} />
                                  <button
                                    type="submit"
                                    className="text-xs text-danger underline-offset-2 hover:underline"
                                  >
                                    Ekipten çıkar
                                  </button>
                                </form>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {canManage ? (
            <>
              <section className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h2 className="mb-1 font-medium">Mevcut personeli ekle</h2>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Organizasyondaki bir çalışanı role ile bu ekibe bağlayın.
                  </p>
                  {availableMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Eklenebilecek personel kalmadı. Yeni personel oluşturun.
                    </p>
                  ) : (
                    <form action={addExistingMemberToTeam} className="space-y-3">
                      <input type="hidden" name="teamId" value={team.id} />
                      <div>
                        <label htmlFor="userId" className="mb-1 block text-sm font-medium">
                          Personel
                        </label>
                        <select
                          id="userId"
                          name="userId"
                          required
                          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                        >
                          <option value="">Seçin</option>
                          {availableMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({roleLabel[member.memberships[0]?.role ?? "SERVICE_ENGINEER"]})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="role" className="mb-1 block text-sm font-medium">
                          Uygulama rolü
                        </label>
                        <select
                          id="role"
                          name="role"
                          defaultValue="SERVICE_ENGINEER"
                          required
                          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                        >
                          {assignableMembershipRoles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabel[role]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="setAsLeader" />
                        Ekip lideri yap
                      </label>
                      <Button type="submit">Ekibe ekle</Button>
                    </form>
                  )}
                </Card>

                <Card className="p-4">
                  <h2 className="mb-1 font-medium">Yeni personel ekle</h2>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Çalışanı rolüyle içeri alın ve doğrudan bu ekibe bağlayın.
                  </p>
                  <EmployeeForm
                    action={createEmployee}
                    teams={[{ id: team.id, name: team.name }]}
                    defaultTeamId={team.id}
                    submitLabel="Personeli ekibe ekle"
                  />
                </Card>
              </section>
            </>
          ) : null}

          <section>
            <h2 className="mb-2 font-medium">Açık servisler</h2>
            {team.visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu ekibe bağlı açık servis yok.</p>
            ) : (
              <div className="space-y-2">
                {team.visits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/servisler/${visit.id}`}
                    className="block rounded-xl border border-border bg-card p-3"
                  >
                    <p className="font-medium">{visit.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(visit.plannedDate)} · {visit.customer.companyName}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
