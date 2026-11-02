import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Giriş" };

const demoAccounts = [
  ["Yönetici", "admin@servispilot.local"],
  ["Operasyon sorumlusu", "yonetici@servispilot.local"],
  ["Ekip lideri (Turgay)", "turgay@gmail.com"],
  ["Servis mühendisi", "teknisyen@servispilot.local"],
  ["Diğer organizasyon", "diger@servispilot.local"],
];

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden flex-col justify-between rounded-2xl bg-sidebar p-8 text-white md:flex">
          <div>
            <p className="text-sm text-teal-200">ServisPilot</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">Teknik servis operasyonunu tek yerden yönetin.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Müşteriler, ekipmanlar, saha ziyaretleri, teknisyen atamaları ve servis formları aynı kayıt üzerinde toplanır.
            </p>
          </div>
          <p className="text-xs text-slate-400">Yerel geliştirme hesaplarının şifresi README dosyasındadır.</p>
        </section>
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Giriş yap</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">Organizasyon hesabınızla devam edin.</p>
          <LoginForm />
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Yerel deneme hesapları</p>
            <ul className="mt-2 space-y-1 text-sm">
              {demoAccounts.map(([role, email]) => (
                <li key={email} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{role}</span>
                  <span className="font-mono text-xs">{email}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </main>
  );
}
