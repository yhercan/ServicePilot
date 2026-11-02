import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSuspense } from "@/components/page-suspense";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatusBadge, TypeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireActor } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { canManageOperations } from "@/lib/permissions";
import {
  createCustomerContact,
  deleteCustomer,
  deleteCustomerContact,
} from "@/modules/customers/actions";
import { getCustomer } from "@/modules/customers/queries";

export const metadata = { title: "Müşteri" };

export default function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  return (
    <PageSuspense>
      <CustomerDetailContent params={params} searchParams={searchParams} />
    </PageSuspense>
  );
}

async function CustomerDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const { hata } = await searchParams;
  const customer = await getCustomer(actor, id);
  if (!customer) notFound();
  const canManage = canManageOperations(actor.role);

  return (
    <div>
      <PageHeader
        title={customer.companyName}
        description={customer.contactPerson}
        actions={
          canManage ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/musteriler/${customer.id}/duzenle`}>Düzenle</Link>
              </Button>
              <ConfirmSubmit
                action={deleteCustomer}
                id={customer.id}
                label="Sil"
                message="Bu müşteri kaydı silinsin mi?"
              />
            </>
          ) : null
        }
      />
      {hata ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
          {hata}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="space-y-2 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Operasyon sorumlusu: </span>
            {customer.operationsManager?.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">E-posta: </span>
            {customer.email || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Telefon: </span>
            {customer.phone || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Şehir: </span>
            {customer.city || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Adres: </span>
            {customer.address || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Not: </span>
            {customer.notes || "—"}
          </p>
        </Card>
        <div className="space-y-4">
          <section>
            <h2 className="mb-2 font-medium">İletişim kişileri</h2>
            {customer.contacts.length === 0 ? (
              <EmptyState title="Kişi yok" description="Bu müşteriye bağlı iletişim kişisi bulunmuyor." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ad</th>
                      <th className="px-4 py-3 font-medium">Ünvan</th>
                      <th className="px-4 py-3 font-medium">Telefon</th>
                      <th className="px-4 py-3 font-medium">E-posta</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {customer.contacts.map((contact) => (
                      <tr key={contact.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          {contact.fullName}
                          {contact.isPrimary ? (
                            <span className="ml-2 text-xs text-muted-foreground">Birincil</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{contact.jobTitle || "—"}</td>
                        <td className="px-4 py-3">{contact.phone || "—"}</td>
                        <td className="px-4 py-3">{contact.email || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {canManage ? (
                            <form action={deleteCustomerContact}>
                              <input type="hidden" name="id" value={contact.id} />
                              <input type="hidden" name="customerId" value={customer.id} />
                              <button type="submit" className="text-xs text-danger underline-offset-2 hover:underline">
                                Sil
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {canManage ? (
              <form
                action={createCustomerContact}
                className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
              >
                <input type="hidden" name="customerId" value={customer.id} />
                <Input name="fullName" placeholder="Ad soyad" required />
                <Input name="jobTitle" placeholder="Ünvan / departman" />
                <Input name="phone" placeholder="Telefon" />
                <Input name="email" placeholder="E-posta" type="email" />
                <Textarea name="notes" placeholder="Not" className="sm:col-span-2" />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="isPrimary" />
                  Birincil iletişim kişisi
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit">Kişi ekle</Button>
                </div>
              </form>
            ) : null}
          </section>

          <section>
            <h2 className="mb-2 font-medium">Ekipmanlar</h2>
            {customer.equipment.length === 0 ? (
              <EmptyState title="Ekipman yok" description="Bu müşteriye bağlı ekipman kaydı bulunmuyor." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ad</th>
                      <th className="px-4 py-3 font-medium">Seri no</th>
                      <th className="px-4 py-3 font-medium">Konum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.equipment.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <Link className="text-primary" href={`/ekipmanlar/${item.id}`}>
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{item.serialNumber || "—"}</td>
                        <td className="px-4 py-3">{item.location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-medium">Servis geçmişi</h2>
            {customer.visits.length === 0 ? (
              <EmptyState title="Servis kaydı yok" description="Bu müşteri için henüz servis ziyareti açılmamış." />
            ) : (
              <div className="space-y-2">
                {customer.visits.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/servisler/${visit.id}`}
                    className="block rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{visit.title}</span>
                      <TypeBadge type={visit.serviceType} />
                      <StatusBadge status={visit.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(visit.plannedDate)} · {visit.equipment.name}
                      {visit.team ? ` · ${visit.team.name}` : ""}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
