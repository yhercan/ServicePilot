import { connection } from "next/server";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PageSuspense } from "@/components/page-suspense";
import { Button } from "@/components/ui/button";
import { requireActor } from "@/lib/auth";
import {
  calendarStatusBar,
  calendarStatusDot,
  calendarStatusSoft,
} from "@/lib/calendar-status";
import {
  addDays,
  buildMonthCells,
  buildWeekKeys,
  dateKey,
  formatDayTitle,
  formatMonthTitle,
  istanbulDateKey,
  istanbulDayRange,
  parseDateKey,
  shiftMonth,
  toDateInputValue,
} from "@/lib/dates";
import { serviceStatusLabel, serviceTypeLabel } from "@/lib/labels";
import { canCreateCalendarEntries } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  listCalendarEntriesBetween,
  listTeamPeople,
  listVisitsForCalendar,
} from "@/modules/calendar/queries";
import { listTeams } from "@/modules/teams/queries";

export const metadata = { title: "Takvim" };

type DayItem = {
  kind: "visit" | "entry";
  id: string;
  href: string;
  title: string;
  customer: string;
  assignees: string[];
  serviceType: "MAINTENANCE" | "BREAKDOWN" | "INSTALLATION" | null;
  status: "PLANNED" | "ASSIGNED" | "IN_PROGRESS" | "WAITING" | "COMPLETED" | "CANCELLED";
};

export default function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ gorunum?: string; tarih?: string; ekip?: string; kisi?: string; gun?: string }>;
}) {
  return (
    <PageSuspense>
      <CalendarContent searchParams={searchParams} />
    </PageSuspense>
  );
}

async function CalendarContent({
  searchParams,
}: {
  searchParams: Promise<{ gorunum?: string; tarih?: string; ekip?: string; kisi?: string; gun?: string }>;
}) {
  await connection();
  const actor = await requireActor();
  const params = await searchParams;
  const view = params.gorunum === "hafta" ? "hafta" : "ay";
  const selected = parseDateKey(params.tarih);
  const todayKey = istanbulDateKey(new Date());
  const canCreate = canCreateCalendarEntries(actor.role);
  const teams = await listTeams(actor, { activeOnly: true });

  const requestedTeamId = params.ekip && params.ekip !== "hepsi" ? params.ekip : null;
  const activeTeam =
    teams.find((team) => team.id === requestedTeamId) ??
    (teams.length === 1 ? teams[0] : null);

  if (teams.length === 0) {
    return (
      <div>
        <PageHeader title="Servis takvimi" description="Önce bir ekip oluşturun." />
        <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">Takvim ekip bazlı çalışır.</p>
          <Button asChild className="mt-4">
            <Link href="/ekibim/yeni">Yeni ekip oluştur</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!activeTeam) {
    return (
      <div>
        <PageHeader
          title="Servis takvimi"
          description="Hangi ekibin planını göreceğinizi seçin."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/takvim?ekip=${team.id}&gorunum=${view}&tarih=${selected.key}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 to-teal-400/60 opacity-80" />
              <p className="text-lg font-semibold tracking-tight">{team.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {team.leader?.name ? `Lider · ${team.leader.name}` : "Lider atanmamış"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{team._count.memberships} üye</p>
              <p className="mt-5 text-sm font-medium text-primary transition group-hover:translate-x-0.5">
                Takvimi aç →
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const teamId = activeTeam.id;
  const people = await listTeamPeople(actor, teamId);
  const personId =
    params.kisi && people.some((person) => person.id === params.kisi) ? params.kisi : null;
  const selectedPerson = personId ? people.find((person) => person.id === personId) : null;
  const focusDay = params.gun && /^\d{4}-\d{2}-\d{2}$/.test(params.gun) ? params.gun : null;

  const cells =
    view === "ay"
      ? buildMonthCells(selected.year, selected.month)
      : buildWeekKeys(selected.year, selected.month, selected.day).map((day) => ({
          key: day.key,
          day: day.day,
          inMonth: true,
        }));

  const rangeStart = istanbulDayRange(cells[0].key).start;
  const rangeEnd = istanbulDayRange(cells[cells.length - 1].key).end;

  const [entries, visits] = await Promise.all([
    listCalendarEntriesBetween(actor, rangeStart, rangeEnd, teamId, personId),
    listVisitsForCalendar(actor, rangeStart, rangeEnd, teamId, personId),
  ]);

  const linkedVisitIds = new Set(
    entries.map((entry) => entry.serviceVisitId).filter((id): id is string => Boolean(id)),
  );

  const grouped = new Map<string, DayItem[]>();

  function pushItem(key: string, item: DayItem) {
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  for (const entry of entries) {
    pushItem(toDateInputValue(entry.entryDate), {
      kind: "entry",
      id: entry.id,
      href: entry.serviceVisitId ? `/servisler/${entry.serviceVisitId}` : `/takvim/kayit/${entry.id}`,
      title: entry.title,
      customer: entry.customer?.companyName ?? "—",
      assignees: entry.assignments.map((item) => item.user.name),
      serviceType: entry.serviceType,
      status: entry.status,
    });
  }
  for (const visit of visits) {
    if (linkedVisitIds.has(visit.id)) continue;
    pushItem(istanbulDateKey(visit.plannedDate), {
      kind: "visit",
      id: visit.id,
      href: `/servisler/${visit.id}`,
      title: visit.title,
      customer: visit.customer.companyName,
      assignees: visit.assignments.map((item) => item.user.name),
      serviceType: visit.serviceType,
      status: visit.status,
    });
  }

  const previousKey =
    view === "ay"
      ? (() => {
          const previous = shiftMonth(selected.year, selected.month, -1);
          return dateKey(previous.year, previous.month, 1);
        })()
      : addDays(selected.year, selected.month, selected.day, -7).key;
  const nextKey =
    view === "ay"
      ? (() => {
          const next = shiftMonth(selected.year, selected.month, 1);
          return dateKey(next.year, next.month, 1);
        })()
      : addDays(selected.year, selected.month, selected.day, 7).key;

  function titleFromKey(key: string) {
    const [year, month, day] = key.split("-").map(Number);
    return formatDayTitle(year, month, day);
  }

  const title =
    view === "ay"
      ? formatMonthTitle(selected.year, selected.month)
      : `${titleFromKey(cells[0].key)} – ${titleFromKey(cells[cells.length - 1].key)}`;

  function href(overrides: {
    gorunum?: string;
    tarih?: string;
    ekip?: string;
    kisi?: string | null;
    gun?: string | null;
  }) {
    const query = new URLSearchParams({
      gorunum: overrides.gorunum ?? view,
      tarih: overrides.tarih ?? selected.key,
      ekip: overrides.ekip ?? teamId,
    });
    const kisi = overrides.kisi === undefined ? personId : overrides.kisi;
    const gun = overrides.gun === undefined ? focusDay : overrides.gun;
    if (kisi) query.set("kisi", kisi);
    if (gun) query.set("gun", gun);
    return `/takvim?${query.toString()}`;
  }

  const focusedItems = focusDay ? (grouped.get(focusDay) ?? []) : [];
  const visibleLimit = view === "ay" ? 3 : 6;
  const weekdayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  return (
    <div>
      <PageHeader
        title="Servis takvimi"
        description={`${activeTeam.name}${selectedPerson ? ` · ${selectedPerson.name}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {teams.length > 1 ? (
              <Button asChild variant="outline">
                <Link href={`/takvim?gorunum=${view}&tarih=${selected.key}`}>Ekip değiştir</Link>
              </Button>
            ) : null}
            {canCreate ? (
              <Button asChild>
                <Link href={`/takvim/yeni?ekip=${teamId}`}>Takvim kaydı</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/80 bg-gradient-to-br from-card via-card to-muted/40 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-muted/80 p-1">
                <Link
                  href={href({ gorunum: "ay" })}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition",
                    view === "ay"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Ay
                </Link>
                <Link
                  href={href({ gorunum: "hafta" })}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition",
                    view === "hafta"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Hafta
                </Link>
              </div>

              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                <Link
                  href={href({ tarih: previousKey })}
                  className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Önceki"
                >
                  ‹
                </Link>
                <Link
                  href={href({ tarih: todayKey, gun: todayKey })}
                  className="rounded-md px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                >
                  Bugün
                </Link>
                <Link
                  href={href({ tarih: nextKey })}
                  className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Sonraki"
                >
                  ›
                </Link>
              </div>
            </div>

            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
          </div>

          {teams.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ekip
              </span>
              {teams.map((team) => {
                const active = team.id === teamId;
                return (
                  <Link
                    key={team.id}
                    href={href({ ekip: team.id, kisi: null, gun: null })}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {team.name}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Personel
            </span>
            <Link
              href={href({ kisi: null })}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition",
                !personId
                  ? "bg-foreground text-background"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              Tüm ekip
            </Link>
            {people.map((person) => {
              const active = personId === person.id;
              return (
                <Link
                  key={person.id}
                  href={href({ kisi: person.id })}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm transition",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {person.name}
                </Link>
              );
            })}
            {people.length === 0 ? (
              <span className="text-sm text-muted-foreground">Bu ekibe henüz üye yok.</span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 p-3 sm:p-4">
            {view === "ay" ? (
              <div className="mb-2 hidden grid-cols-7 gap-px lg:grid">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}
              </div>
            ) : null}

            <div
              className={cn(
                "overflow-hidden rounded-xl border border-border bg-border/60",
                view === "ay"
                  ? "grid grid-cols-2 gap-px sm:grid-cols-4 lg:grid-cols-7"
                  : "grid grid-cols-1 gap-px md:grid-cols-7",
              )}
            >
              {cells.map((cell) => {
                const items = grouped.get(cell.key) ?? [];
                const visible = items.slice(0, visibleLimit);
                const hiddenCount = Math.max(items.length - visible.length, 0);
                const isFocused = focusDay === cell.key;
                const isToday = cell.key === todayKey;

                return (
                  <div
                    key={cell.key}
                    className={cn(
                      "flex min-h-[7.5rem] flex-col bg-card p-2 transition sm:min-h-36",
                      !cell.inMonth && "bg-muted/35 text-muted-foreground",
                      isFocused && "bg-teal-50/70",
                      view === "hafta" && "min-h-48",
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-1">
                      <Link
                        href={href({
                          gun: cell.key,
                          tarih: view === "ay" ? selected.key : cell.key,
                        })}
                        className={cn(
                          "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold transition hover:bg-muted",
                          isToday && "bg-primary text-primary-foreground hover:bg-primary/90",
                          isFocused && !isToday && "bg-teal-100 text-teal-900",
                        )}
                      >
                        {view === "hafta" ? (
                          <span className="px-1">{titleFromKey(cell.key)}</span>
                        ) : (
                          cell.day
                        )}
                      </Link>
                      {items.length > 0 ? (
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                          {items.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col gap-1">
                      {visible.map((item) => (
                        <Link
                          key={`${item.kind}-${item.id}`}
                          href={item.href}
                          className={cn(
                            "group/item block rounded-md px-1.5 py-1 transition hover:ring-1 hover:ring-border",
                            calendarStatusSoft[item.status],
                          )}
                          title={`${item.title} · ${item.customer}`}
                        >
                          <div className="flex items-start gap-1.5">
                            <span
                              className={cn(
                                "mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full",
                                calendarStatusDot[item.status],
                              )}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-medium leading-4">
                                {item.title}
                              </p>
                              <p className="truncate text-[10px] opacity-70">
                                {item.assignees[0] ?? "Atanmamış"}
                                {item.assignees.length > 1
                                  ? ` +${item.assignees.length - 1}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {hiddenCount > 0 ? (
                        <Link
                          href={href({ gun: cell.key })}
                          className="px-1.5 py-0.5 text-[11px] font-medium text-primary hover:underline"
                        >
                          +{hiddenCount} daha
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
              {(
                [
                  ["PLANNED", "Planlandı"],
                  ["ASSIGNED", "Atandı"],
                  ["IN_PROGRESS", "Devam"],
                  ["WAITING", "Bekliyor"],
                  ["COMPLETED", "Tamam"],
                  ["CANCELLED", "İptal"],
                ] as const
              ).map(([status, label]) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", calendarStatusDot[status])} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <aside className="border-t border-border bg-muted/20 xl:border-l xl:border-t-0">
            <div className="sticky top-4 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gün planı
              </p>
              <h3 className="mt-1 text-base font-semibold tracking-tight">
                {focusDay ? titleFromKey(focusDay) : "Gün seçin"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {focusDay
                  ? selectedPerson
                    ? `${selectedPerson.name} · ${focusedItems.length} kayıt`
                    : `${activeTeam.name} · ${focusedItems.length} kayıt`
                  : "Takvimde bir güne tıklayın."}
              </p>

              {!focusDay ? (
                <div className="mt-6 rounded-xl border border-dashed border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  Seçili gün yok
                </div>
              ) : focusedItems.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  Bu günde kayıt yok
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {focusedItems.map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      href={item.href}
                      className="block rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/30 hover:shadow"
                    >
                      <div className="flex gap-3">
                        <span
                          className={cn(
                            "mt-0.5 h-10 w-1 shrink-0 rounded-full",
                            calendarStatusBar[item.status],
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{item.title}</p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {item.customer}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              {serviceStatusLabel[item.status]}
                            </span>
                            {item.serviceType ? (
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                {serviceTypeLabel[item.serviceType]}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {item.assignees.length > 0
                              ? item.assignees.join(", ")
                              : "Personel atanmamış"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
