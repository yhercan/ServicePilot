import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-muted-foreground">Aradığınız kayıt veya sayfa mevcut değil.</p>
      <Link href="/panel" className="mt-4 text-sm font-medium text-primary">
        Gösterge paneline dön
      </Link>
    </main>
  );
}
