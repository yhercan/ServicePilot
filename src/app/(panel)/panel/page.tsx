import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/dates";
import { serviceTypeLabel } from "@/lib/labels";
import { getDashboard } from "@/modules/dashboard/queries";
import { markNotificationRead } from "@/modules/notifications/actions";

export const metadata = { title: "Gösterge Paneli" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Yükleniyor…</div>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const actor = await requireActor();
  const data = await getDashboard(actor);
  const metrics = [
    ["Müşteriler", data.customerCount],
    ["Ekipmanlar", data.equipmentCount],
    ["Açık servisler", data.openCount],
    ["Devam edenler", data.inProgressCount],
  ];

  return (
    <div>
      <PageHeader
        title="Gösterge Paneli"
        description={`${actor.organizationName} kayıtlarından hesaplanan özet.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {data.settings.showUpcomingOnDashboard ? (
          <Card className="p-4">
            <h2 className="font-medium">Yaklaşan ziyaretler</h2>
            <div className="mt-3 space-y-3">
              {data.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Planlanmış yaklaşan ziyaret yok.</p>
              ) : (
                data.upcoming.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/servisler/${visit.id}`}
                    className="block rounded-lg border border-border p-3 hover:bg-muted"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{visit.title}</span>
                      <TypeBadge type={visit.serviceType} />
                      <StatusBadge status={visit.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(visit.plannedDate)} · {visit.customer.companyName}
                      {visit.team ? ` · ${visit.team.name}` : ""}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </Card>
        ) : null}

        {data.settings.showFollowUpsOnDashboard ? (
          <Card className="p-4">
            <h2 className="font-medium">Sıradaki / hatırlatmalı ziyaretler</h2>
            <div className="mt-3 space-y-3">
              {data.followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Planlanmış sıradaki ziyaret yok.</p>
              ) : (
                data.followUps.map((visit) => (
                  <Link
                    key={visit.id}
                    href={`/servisler/${visit.id}`}
                    className="block rounded-lg border border-border p-3 hover:bg-muted"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{visit.title}</span>
                      {visit.nextVisitType ? <TypeBadge type={visit.nextVisitType} /> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(visit.nextVisitDate)}
                      {visit.nextVisitType ? ` · ${serviceTypeLabel[visit.nextVisitType]}` : ""}
                      {" · "}
                      {visit.customer.companyName}
                      {visit.team ? ` · ${visit.team.name}` : ""}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Bildirimler</h2>
            <Link href="/ayarlar" className="text-sm text-primary">
              Ayarlar
            </Link>
          </div>
          <div className="space-y-3">
            {data.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Yeni bildirim yok.</p>
            ) : (
              data.notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border border-border p-3 ${item.readAt ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {item.href ? (
                        <Link href={item.href} className="font-medium text-primary">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="font-medium">{item.title}</p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                    </div>
                    {!item.readAt ? (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="text-xs text-primary">
                          Okundu
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Duyurular</h2>
            <Link href="/duyurular" className="text-sm text-primary">
              Tümü
            </Link>
          </div>
          <div className="space-y-3">
            {data.announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Yayında duyuru yok.</p>
            ) : (
              data.announcements.map((item) => (
                <Link
                  key={item.id}
                  href={`/duyurular/${item.id}`}
                  className="block rounded-lg border border-border p-3 hover:bg-muted"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.publishedAt ? formatDateTime(item.publishedAt) : formatDateTime(item.createdAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-medium">Ekip iş yükü</h2>
          <div className="mt-3 space-y-2">
            {data.teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aktif ekip yok.</p>
            ) : (
              data.teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/ekibim/${team.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team._count.memberships} üye</p>
                  </div>
                  <p className="text-sm font-medium">{team._count.visits} açık</p>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-medium">Ekibe göre açık servisler</h2>
          <div className="mt-3 space-y-2">
            {data.visitsByTeam.length === 0 ? (
              <p className="text-sm text-muted-foreground">Açık servis yok.</p>
            ) : (
              data.visitsByTeam.map((row) => (
                <div
                  key={row.teamId}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <span className="text-sm">{row.teamName}</span>
                  <span className="font-medium">{row.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-medium">Son oluşturulan servisler</h2>
          <div className="mt-3 space-y-3">
            {data.recentVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kayıt yok.</p>
            ) : (
              data.recentVisits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/servisler/${visit.id}`}
                  className="block rounded-lg border border-border p-3 hover:bg-muted"
                >
                  <p className="font-medium">{visit.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(visit.createdAt)} · {visit.customer.companyName}
                    {visit.team ? ` · ${visit.team.name}` : ""}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-medium">Son tamamlananlar</h2>
          <div className="mt-3 space-y-3">
            {data.completed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz tamamlanan servis yok.</p>
            ) : (
              data.completed.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/servisler/${visit.id}`}
                  className="block rounded-lg border border-border p-3 hover:bg-muted"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{visit.title}</span>
                    <PriorityBadge priority={visit.priority} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(visit.actualEndDate ?? visit.updatedAt)} · {visit.customer.companyName}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
