import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { Card } from "@/components/ui/card";
import { VisitForm } from "@/components/visits/visit-form";
import { requireActor } from "@/lib/auth";
import { canManageOperations } from "@/lib/permissions";
import { createVisit } from "@/modules/visits/actions";
import { listVisitFormOptions } from "@/modules/visits/queries";

export const metadata = { title: "Yeni servis" };

export default function NewVisitPage() {
  return (
    <PageSuspense>
      <NewVisitContent />
    </PageSuspense>
  );
}

async function NewVisitContent() {
  const actor = await requireActor();
  if (!canManageOperations(actor.role)) redirect("/servisler");
  const options = await listVisitFormOptions(actor);

  return (
    <div>
      <PageHeader
        title="Yeni servis ziyareti"
        description="Servis oluşturulunca ilgili ekibin takvimine de otomatik kayıt düşer."
      />
      <Card className="p-5">
        {options.customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Servis açmadan önce müşteri ve ekipman kaydı oluşturun.</p>
        ) : (
          <VisitForm
            action={createVisit}
            customers={options.customers}
            technicians={options.technicians}
            teams={options.teams}
            submitLabel="Servisi oluştur"
          />
        )}
      </Card>
    </div>
  );
}
