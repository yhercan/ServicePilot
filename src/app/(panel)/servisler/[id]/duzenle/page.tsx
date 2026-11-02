import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { Card } from "@/components/ui/card";
import { VisitForm } from "@/components/visits/visit-form";
import { requireActor } from "@/lib/auth";
import { istanbulDateKey } from "@/lib/dates";
import { canManageOperations } from "@/lib/permissions";
import { updateVisit } from "@/modules/visits/actions";
import { getVisit, listVisitFormOptions } from "@/modules/visits/queries";

export const metadata = { title: "Servisi düzenle" };

export default function EditVisitPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <EditVisitContent params={params} />
    </PageSuspense>
  );
}

async function EditVisitContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!canManageOperations(actor.role)) redirect("/servisler");
  const { id } = await params;
  const [visit, options] = await Promise.all([getVisit(actor, id), listVisitFormOptions(actor)]);
  if (!visit) notFound();

  return (
    <div>
      <PageHeader title="Servisi düzenle" description={visit.title} />
      <Card className="p-5">
        <VisitForm
          action={updateVisit}
          customers={options.customers}
          technicians={options.technicians}
          teams={options.teams}
          submitLabel="Değişiklikleri kaydet"
          visit={{
            id: visit.id,
            customerId: visit.customerId,
            equipmentId: visit.equipmentId,
            teamId: visit.teamId ?? "",
            title: visit.title,
            description: visit.description ?? "",
            serviceType: visit.serviceType,
            priority: visit.priority,
            plannedDate: istanbulDateKey(visit.plannedDate),
            sapReferenceNumber: visit.sapReferenceNumber ?? "",
            technicianIds: visit.assignments.map((item) => item.userId),
          }}
        />
      </Card>
    </div>
  );
}
