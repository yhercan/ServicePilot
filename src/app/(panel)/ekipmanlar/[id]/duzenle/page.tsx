import { notFound, redirect } from "next/navigation";
import { EquipmentForm } from "@/components/equipment/equipment-form";
import { PageSuspense } from "@/components/page-suspense";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { toDateInputValue } from "@/lib/dates";
import { canManageOperations } from "@/lib/permissions";
import { updateEquipment } from "@/modules/equipment/actions";
import { getEquipment, listCustomerChoices, listTeamChoices } from "@/modules/equipment/queries";

export const metadata = { title: "Ekipmanı düzenle" };

export default function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <EditEquipmentContent params={params} />
    </PageSuspense>
  );
}

async function EditEquipmentContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!canManageOperations(actor.role)) redirect("/ekipmanlar");
  const { id } = await params;
  const [equipment, customers, teams] = await Promise.all([
    getEquipment(actor, id),
    listCustomerChoices(actor.organizationId),
    listTeamChoices(actor.organizationId),
  ]);
  if (!equipment) notFound();

  return (
    <div>
      <PageHeader title="Ekipmanı düzenle" description={equipment.name} />
      <Card className="p-5">
        <EquipmentForm
          action={updateEquipment}
          customers={customers}
          teams={teams}
          submitLabel="Değişiklikleri kaydet"
          equipment={{
            id: equipment.id,
            customerId: equipment.customerId,
            name: equipment.name,
            brand: equipment.brand ?? "",
            model: equipment.model ?? "",
            serialNumber: equipment.serialNumber ?? "",
            installationDate: toDateInputValue(equipment.installationDate),
            warrantyEndDate: toDateInputValue(equipment.warrantyEndDate),
            contractEndDate: toDateInputValue(equipment.contractEndDate),
            location: equipment.location ?? "",
            notes: equipment.notes ?? "",
            teamIds: equipment.teamLinks.map((link) => link.teamId),
          }}
        />
      </Card>
    </div>
  );
}
