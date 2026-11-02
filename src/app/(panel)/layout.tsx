import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { requireActor } from "@/lib/auth";

export const instant = false;

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Yükleniyor…</div>}>
      <PanelFrame>{children}</PanelFrame>
    </Suspense>
  );
}

async function PanelFrame({ children }: { children: ReactNode }) {
  await connection();
  const actor = await requireActor();
  return <AppShell actor={actor}>{children}</AppShell>;
}
