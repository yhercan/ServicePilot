import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { EmployeeForm } from "@/components/teams/employee-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { assignableMembershipRoles, roleLabel } from "@/lib/labels";
import { canManageTeams } from "@/lib/permissions";
import {
  createEmployee,
  removeEmployeeFromOrganization,
  updateOrganizationMemberRole,
} from "@/modules/teams/actions";
import { listOrganizationMembers, listTeams } from "@/modules/teams/queries";

export const metadata = { title: "Personel" };

export default function PersonnelPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  return (
    <PageSuspense>
      <PersonnelContent searchParams={searchParams} />
    </PageSuspense>
  );
}

async function PersonnelContent({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const actor = await requireActor();
  if (!canManageTeams(actor.role)) redirect("/ekibim");
  const { hata } = await searchParams;
  const [members, teams] = await Promise.all([
    listOrganizationMembers(actor),
    listTeams(actor, { activeOnly: true }),
  ]);

  return (
    <div>
      <PageHeader
        title="Personel"
        description="Yönetici altındaki çalışanları rollerle organizasyona ekleyin."
        actions={
          <Button asChild variant="outline">
            <Link href="/ekibim">Ekiplere dön</Link>
          </Button>
        }
      />
      {hata ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
          {hata}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h2 className="mb-2 font-medium">Organizasyon personeli</h2>
          {members.length === 0 ? (
            <EmptyState title="Personel yok" description="Henüz personel eklenmemiş." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ad</th>
                    <th className="px-4 py-3 font-medium">E-posta</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Ekipler</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const role = member.memberships[0]?.role ?? "SERVICE_ENGINEER";
                    return (
                      <tr key={member.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{member.name}</td>
                        <td className="px-4 py-3">{member.email}</td>
                        <td className="px-4 py-3">
                          <form action={updateOrganizationMemberRole} className="flex items-center gap-2">
                            <input type="hidden" name="userId" value={member.id} />
                            <select
                              name="role"
                              defaultValue={role}
                              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                              aria-label={`${member.name} rolü`}
                            >
                              {assignableMembershipRoles.map((item) => (
                                <option key={item} value={item}>
                                  {roleLabel[item]}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" size="sm" variant="outline">
                              Kaydet
                            </Button>
                          </form>
                        </td>
                        <td className="px-4 py-3">
                          {member.teamMemberships.length === 0
                            ? "—"
                            : member.teamMemberships
                                .map((item) => item.team.name)
                                .join(", ")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {member.id === actor.userId ? (
                            <span className="text-xs text-muted-foreground">Siz</span>
                          ) : (
                            <ConfirmSubmit
                              action={removeEmployeeFromOrganization}
                              id={member.id}
                              fieldName="userId"
                              label="Sil"
                              message={`${member.name} organizasyondan kaldırılsın mı? Ekip üyelikleri ve liderlik atamaları temizlenir.`}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Card className="p-4">
          <h2 className="mb-1 font-medium">Yeni personel ekle</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Çalışanı rolüyle birlikte içeri alın. İsterseniz doğrudan bir ekibe de bağlayın.
          </p>
          <EmployeeForm
            action={createEmployee}
            teams={teams.map((team) => ({ id: team.id, name: team.name }))}
            submitLabel="Personeli kaydet"
          />
        </Card>
      </div>
    </div>
  );
}
