import { redirect } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageSuspense } from "@/components/page-suspense";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { canManageOperations } from "@/lib/permissions";
import { createCustomer } from "@/modules/customers/actions";
import { listOperationsManagers } from "@/modules/customers/queries";

export const metadata = { title: "Yeni müşteri" };

export default function NewCustomerPage() {
  return (
    <PageSuspense>
      <NewCustomerContent />
    </PageSuspense>
  );
}

async function NewCustomerContent() {
  const actor = await requireActor();
  if (!canManageOperations(actor.role)) redirect("/musteriler");
  const managers = await listOperationsManagers(actor);

  return (
    <div>
      <PageHeader title="Yeni müşteri" description="Müşteri kaydı yalnızca kendi organizasyonunuza eklenir." />
      <Card className="p-5">
        <CustomerForm
          action={createCustomer}
          managers={managers}
          submitLabel="Müşteriyi kaydet"
        />
      </Card>
    </div>
  );
}
