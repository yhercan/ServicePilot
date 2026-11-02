import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireActor } from "@/lib/auth";
import { canManageOperations } from "@/lib/permissions";
import { listEquipment } from "@/modules/equipment/queries";

export const metadata = { title: "Ekipmanlar" };

export default function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <PageSuspense>
      <EquipmentContent searchParams={searchParams} />
    </PageSuspense>
  );
}

async function EquipmentContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const actor = await requireActor();
  const { q = "" } = await searchParams;
  const query = q.trim();
  const equipment = await listEquipment(actor, query);
  const canManage = canManageOperations(actor.role);

  return (
    <div>
      <PageHeader
        title="Ekipmanlar"
        description="Müşterilere bağlı cihaz ve ekipman kayıtları."
        actions={canManage ? <Button asChild><Link href="/ekipmanlar/yeni">Yeni ekipman</Link></Button> : null}
      />
      <form className="mb-4 flex gap-2" action="/ekipmanlar">
        <Input name="q" defaultValue={query} placeholder="Ad, marka, model, seri no veya müşteri" aria-label="Ekipman ara" />
        <Button type="submit" variant="outline">Ara</Button>
      </form>
      {equipment.length === 0 ? (
        <EmptyState title="Ekipman bulunamadı" description="Aramayı değiştirin veya yeni bir ekipman ekleyin." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ekipman</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">İlgili ekipler</th>
                <th className="px-4 py-3 font-medium">Seri no</th>
                <th className="px-4 py-3 font-medium">Konum</th>
                <th className="px-4 py-3 font-medium">Servis</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/ekipmanlar/${item.id}`} className="font-medium text-primary">{item.name}</Link>
                    <p className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(" ") || "—"}</p>
                  </td>
                  <td className="px-4 py-3">{item.customer.companyName}</td>
                  <td className="px-4 py-3">
                    {item.teamLinks.length === 0
                      ? "—"
                      : item.teamLinks.map((link) => link.team.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">{item.serialNumber || "—"}</td>
                  <td className="px-4 py-3">{item.location || "—"}</td>
                  <td className="px-4 py-3">{item._count.visits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
