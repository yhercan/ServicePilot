import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSuspense } from "@/components/page-suspense";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatusBadge, TypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { canManageOperations } from "@/lib/permissions";
import { deleteEquipment } from "@/modules/equipment/actions";
import { getEquipment } from "@/modules/equipment/queries";

export const metadata = { title: "Ekipman" };

export default function EquipmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  return (
    <PageSuspense>
      <EquipmentDetailContent params={params} searchParams={searchParams} />
    </PageSuspense>
  );
}

async function EquipmentDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const { hata } = await searchParams;
  const equipment = await getEquipment(actor, id);
  if (!equipment) notFound();
  const canManage = canManageOperations(actor.role);

  return (
    <div>
      <PageHeader
        title={equipment.name}
        description={[equipment.brand, equipment.model].filter(Boolean).join(" ") || "Ekipman kaydı"}
        actions={
          canManage ? (
            <>
              <Button asChild variant="outline"><Link href={`/ekipmanlar/${equipment.id}/duzenle`}>Düzenle</Link></Button>
              <ConfirmSubmit action={deleteEquipment} id={equipment.id} label="Sil" message="Bu ekipman kaydı silinsin mi?" />
            </>
          ) : null
        }
      />
      {hata ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger" role="alert">{hata}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="space-y-2 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Müşteri: </span>
            <Link className="text-primary" href={`/musteriler/${equipment.customer.id}`}>{equipment.customer.companyName}</Link>
          </p>
          <p><span className="text-muted-foreground">Seri no: </span>{equipment.serialNumber || "—"}</p>
          <p><span className="text-muted-foreground">Kurulum: </span>{formatDate(equipment.installationDate)}</p>
          <p><span className="text-muted-foreground">Garanti bitiş: </span>{formatDate(equipment.warrantyEndDate)}</p>
          <p><span className="text-muted-foreground">Sözleşme bitiş: </span>{formatDate(equipment.contractEndDate)}</p>
          <p><span className="text-muted-foreground">Konum: </span>{equipment.location || "—"}</p>
          <p>
            <span className="text-muted-foreground">İlgili ekipler: </span>
            {equipment.teamLinks.length === 0
              ? "—"
              : equipment.teamLinks.map((link) => link.team.name).join(", ")}
          </p>
          <p><span className="text-muted-foreground">Not: </span>{equipment.notes || "—"}</p>
        </Card>
        <section>
          <h2 className="mb-2 font-medium">Önceki servis ziyaretleri</h2>
          {equipment.visits.length === 0 ? (
            <EmptyState title="Servis kaydı yok" description="Bu ekipman için henüz servis ziyareti yok." />
          ) : (
            <div className="space-y-2">
              {equipment.visits.map((visit) => (
                <Link key={visit.id} href={`/servisler/${visit.id}`} className="block rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{visit.title}</span>
                    <TypeBadge type={visit.serviceType} />
                    <StatusBadge status={visit.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDate(visit.plannedDate)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
