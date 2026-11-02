import { Suspense, type ReactNode } from "react";

export function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Yükleniyor…</div>}>{children}</Suspense>
  );
}
