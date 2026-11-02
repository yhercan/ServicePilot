"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/action-state";
import {
  removeAvatar,
  updateAvatar,
  updateNotificationPrefs,
  updatePassword,
  updateProfile,
} from "@/modules/settings/actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <FormError message={state.error} />
      <Field label="Ad soyad" htmlFor="name" error={state.fieldErrors?.name?.[0]}>
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <Field label="E-posta" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" defaultValue={email} required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Profili kaydet"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <FormError message={state.error} />
      <Field label="Mevcut şifre" htmlFor="currentPassword" error={state.fieldErrors?.currentPassword?.[0]}>
        <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </Field>
      <Field label="Yeni şifre" htmlFor="newPassword" error={state.fieldErrors?.newPassword?.[0]}>
        <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
      </Field>
      <Field label="Yeni şifre (tekrar)" htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword?.[0]}>
        <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Güncelleniyor…" : "Şifreyi güncelle"}
      </Button>
    </form>
  );
}

export function AvatarForm({ hasAvatar }: { hasAvatar: boolean }) {
  const [state, action, pending] = useActionState(updateAvatar, initialActionState);
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <FormError message={state.error} />
        <Field label="Profil fotoğrafı" htmlFor="avatar">
          <Input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" required />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Yükleniyor…" : "Fotoğrafı kaydet"}
        </Button>
      </form>
      {hasAvatar ? (
        <form action={removeAvatar}>
          <Button type="submit" variant="outline">
            Fotoğrafı kaldır
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function NotificationPrefsForm({
  prefs,
}: {
  prefs: {
    notifyNextVisitScheduled: boolean;
    notifyNextVisitReminder: boolean;
    notifyVisitAssigned: boolean;
    showUpcomingOnDashboard: boolean;
    showFollowUpsOnDashboard: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updateNotificationPrefs, initialActionState);
  const rows = [
    ["notifyNextVisitScheduled", "Sıradaki ziyaret planlandığında bildir", prefs.notifyNextVisitScheduled],
    ["notifyNextVisitReminder", "Sıradaki ziyaret için 1 hafta önce hatırlat", prefs.notifyNextVisitReminder],
    ["notifyVisitAssigned", "Bana atama yapıldığında bildir", prefs.notifyVisitAssigned],
    ["showUpcomingOnDashboard", "Gösterge panelinde yaklaşan servisleri göster", prefs.showUpcomingOnDashboard],
    ["showFollowUpsOnDashboard", "Gösterge panelinde sıradaki ziyaretleri göster", prefs.showFollowUpsOnDashboard],
  ] as const;

  return (
    <form action={action} className="space-y-3">
      <FormError message={state.error} />
      <div className="space-y-2">
        {rows.map(([name, label, checked]) => (
          <label key={name} className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5" />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Tercihleri kaydet"}
      </Button>
    </form>
  );
}
