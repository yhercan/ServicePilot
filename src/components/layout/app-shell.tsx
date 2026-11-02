"use client";

import {
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logout } from "@/modules/auth/actions";
import type { Actor } from "@/lib/actor";
import { roleLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const links = [
  { href: "/panel", label: "Gösterge Paneli", icon: LayoutDashboard, exact: true },
  { href: "/musteriler", label: "Müşteriler", icon: Building2, exact: false },
  { href: "/ekipmanlar", label: "Ekipmanlar", icon: Wrench, exact: false },
  { href: "/servisler", label: "Servis Ziyaretleri", icon: ClipboardList, exact: false },
  { href: "/takvim", label: "Takvim", icon: CalendarDays, exact: false },
  { href: "/ekibim", label: "Ekibim", icon: Users, exact: false },
  { href: "/duyurular", label: "Duyurular", icon: Megaphone, exact: false },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings, exact: false },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Ana menü">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ actor, children }: { actor: Actor; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-white md:flex">
        <div className="px-5 py-5">
          <p className="text-lg font-semibold">ServisPilot</p>
          <p className="text-xs text-slate-400">Teknik servis yönetimi</p>
        </div>
        <div className="flex-1 px-3">
          <NavLinks pathname={pathname} />
        </div>
        <Account actor={actor} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-sidebar text-white">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="font-semibold">ServisPilot</p>
              <button onClick={() => setOpen(false)} aria-label="Kapat" className="rounded p-1 text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 px-3">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <Account actor={actor} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menüyü aç"
            className="rounded-lg border border-border p-2"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="font-semibold">ServisPilot</p>
            <p className="text-xs text-muted-foreground">{actor.organizationName}</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function Account({ actor }: { actor: Actor }) {
  return (
    <div className="border-t border-white/10 p-4">
      <Link href="/ayarlar" className="mb-3 flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-white/5">
        {actor.avatarPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/api/avatar" alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium">
            {actor.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{actor.name}</p>
          <p className="truncate text-xs text-slate-400">{roleLabel[actor.role]}</p>
        </div>
      </Link>
      <p className="truncate px-1 text-xs text-slate-400">{actor.organizationName}</p>
      <form action={logout} className="mt-3 px-1">
        <button type="submit" className="text-sm text-slate-200 underline-offset-2 hover:underline">
          Çıkış yap
        </button>
      </form>
    </div>
  );
}
