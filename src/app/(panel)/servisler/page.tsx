import Link from "next/link";
import type { ServiceStatus } from "@prisma/client";
import { PageSuspense } from "@/components/page-suspense";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireActor } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { serviceStatusLabel, serviceStatuses } from "@/lib/labels";
import { canManageOperations } from "@/lib/permissions";
import { listVisits } from "@/modules/visits/queries";

export const metadata = { title: "Servis ziyaretleri" };

export default function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string }>;
}) {
  return (
    <PageSuspense>
      <VisitsContent searchParams={searchParams} />
    </PageSuspense>
  );
}

async function VisitsContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string }>;
}) {
  const actor = await requireActor();
  const { q = "", durum = "" } = await searchParams;
  const query = q.trim();
  const status = serviceStatuses.find((item) => item === durum) as ServiceStatus | undefined;
  const visits = await listVisits(actor, query, status);
  const canManage = canManageOperations(actor.role);

  return (
    <div>
      <PageHeader
        title="Servis ziyaretleri"
        description={canManage ? "Organizasyondaki tüm servis faaliyetleri." : "Size atanan servis ziyaretleri."}
        actions={canManage ? <Button asChild><Link href="/servisler/yeni">Yeni servis</Link></Button> : null}
      />
      <form className="mb-4 flex flex-col gap-2 sm:flex-row" action="/servisler">
        <Input name="q" defaultValue={query} placeholder="Başlık, müşteri, ekipman veya SAP referansı" aria-label="Servis ara" />
        <select name="durum" defaultValue={status ?? ""} aria-label="Durum" className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
          <option value="">Tüm durumlar</option>
          {serviceStatuses.map((item) => (
            <option key={item} value={item}>{serviceStatusLabel[item]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Filtrele</Button>
      </form>
      {visits.length === 0 ? (
        <EmptyState title="Servis ziyareti yok" description="Filtreyi temizleyin veya yeni bir servis kaydı oluşturun." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Servis</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Teknisyen</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/servisler/${visit.id}`} className="font-medium text-primary">{visit.title}</Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <TypeBadge type={visit.serviceType} />
                      <StatusBadge status={visit.status} />
                      <PriorityBadge priority={visit.priority} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {visit.customer.companyName}
                    <p className="text-xs text-muted-foreground">{visit.equipment.name}</p>
                  </td>
                  <td className="px-4 py-3">{formatDate(visit.plannedDate)}</td>
                  <td className="px-4 py-3">{visit.assignments.map((item) => item.user.name).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
