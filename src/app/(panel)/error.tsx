"use client";

export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="text-lg font-semibold">İşlem tamamlanamadı</h1>
      <p className="mt-2 text-sm text-muted-foreground">Beklenmeyen bir hata oluştu. Sayfayı yeniden deneyin.</p>
      <button onClick={reset} className="mt-4 text-sm font-medium text-primary">
        Tekrar dene
      </button>
    </div>
  );
}
