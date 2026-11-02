import { notFound, redirect } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageSuspense } from "@/components/page-suspense";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { canManageOperations } from "@/lib/permissions";
import { updateCustomer } from "@/modules/customers/actions";
import { getCustomer, listOperationsManagers } from "@/modules/customers/queries";

export const metadata = { title: "Müşteriyi düzenle" };

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageSuspense>
      <EditCustomerContent params={params} />
    </PageSuspense>
  );
}

async function EditCustomerContent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!canManageOperations(actor.role)) redirect("/musteriler");
  const { id } = await params;
  const [customer, managers] = await Promise.all([
    getCustomer(actor, id),
    listOperationsManagers(actor),
  ]);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader title="Müşteriyi düzenle" description={customer.companyName} />
      <Card className="p-5">
        <CustomerForm
          action={updateCustomer}
          managers={managers}
          submitLabel="Değişiklikleri kaydet"
          customer={{
            id: customer.id,
            companyName: customer.companyName,
            contactPerson: customer.contactPerson,
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            address: customer.address ?? "",
            city: customer.city ?? "",
            notes: customer.notes ?? "",
            operationsManagerId: customer.operationsManagerId ?? "",
          }}
        />
      </Card>
    </div>
  );
}
