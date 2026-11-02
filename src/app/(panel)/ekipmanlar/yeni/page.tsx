import { redirect } from "next/navigation";
import { EquipmentForm } from "@/components/equipment/equipment-form";
import { PageSuspense } from "@/components/page-suspense";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { canManageOperations } from "@/lib/permissions";
import { createEquipment } from "@/modules/equipment/actions";
import { listCustomerChoices, listTeamChoices } from "@/modules/equipment/queries";

export const metadata = { title: "Yeni ekipman" };

export default function NewEquipmentPage() {
  return (
    <PageSuspense>
      <NewEquipmentContent />
    </PageSuspense>
  );
}

async function NewEquipmentContent() {
  const actor = await requireActor();
  if (!canManageOperations(actor.role)) redirect("/ekipmanlar");
  const [customers, teams] = await Promise.all([
    listCustomerChoices(actor.organizationId),
    listTeamChoices(actor.organizationId),
  ]);

  return (
    <div>
      <PageHeader
        title="Yeni ekipman"
        description="Ekipmanı müşteriye bağlayın ve ilgili ekipleri seçin."
      />
      <Card className="p-5">
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Önce bir müşteri kaydı oluşturun.</p>
        ) : (
          <EquipmentForm
            action={createEquipment}
            customers={customers}
            teams={teams}
            submitLabel="Ekipmanı kaydet"
          />
        )}
      </Card>
    </div>
  );
}
