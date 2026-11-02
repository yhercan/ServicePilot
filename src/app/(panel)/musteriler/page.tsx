import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireActor } from "@/lib/auth";
import { canManageOperations } from "@/lib/permissions";
import {
  listCustomerCities,
  listCustomers,
  listOperationsManagers,
} from "@/modules/customers/queries";

export const metadata = { title: "Müşteriler" };

export default function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sehir?: string; sorumlu?: string }>;
}) {
  return (
    <PageSuspense>
      <CustomersContent searchParams={searchParams} />
    </PageSuspense>
  );
}

async function CustomersContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sehir?: string; sorumlu?: string }>;
}) {
  const actor = await requireActor();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const city = params.sehir?.trim() ?? "";
  const managerId = params.sorumlu?.trim() ?? "";
  const [customers, managers, cities] = await Promise.all([
    listCustomers(actor, { q: query, city, operationsManagerId: managerId }),
    listOperationsManagers(actor),
    listCustomerCities(actor),
  ]);
  const canManage = canManageOperations(actor.role);

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        description="Organizasyonunuza ait müşteri kayıtları."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/musteriler/yeni">Yeni müşteri</Link>
            </Button>
          ) : null
        }
      />
      <form className="mb-4 grid gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-[1.2fr_1fr_1fr_auto_auto]">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Şirket, kişi veya e-posta"
          aria-label="Müşteri ara"
        />
        <select
          name="sorumlu"
          defaultValue={managerId}
          aria-label="Operasyon sorumlusu"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="">Tüm sorumlular</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>
        <select
          name="sehir"
          defaultValue={city}
          aria-label="Şehir"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="">Tüm şehirler</option>
          {cities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrele
        </Button>
        <Button asChild variant="ghost">
          <Link href="/musteriler">Temizle</Link>
        </Button>
      </form>
      {customers.length === 0 ? (
        <EmptyState title="Müşteri bulunamadı" description="Aramayı değiştirin veya yeni bir müşteri ekleyin." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Şirket</th>
                <th className="px-4 py-3 font-medium">İlgili kişi</th>
                <th className="px-4 py-3 font-medium">Operasyon sorumlusu</th>
                <th className="px-4 py-3 font-medium">Şehir</th>
                <th className="px-4 py-3 font-medium">Ekipman</th>
                <th className="px-4 py-3 font-medium">Servis</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/musteriler/${customer.id}`} className="font-medium text-primary">
                      {customer.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{customer.contactPerson}</td>
                  <td className="px-4 py-3">{customer.operationsManager?.name ?? "—"}</td>
                  <td className="px-4 py-3">{customer.city || "—"}</td>
                  <td className="px-4 py-3">{customer._count.equipment}</td>
                  <td className="px-4 py-3">{customer._count.visits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
