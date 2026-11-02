import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import {
  AvatarForm,
  NotificationPrefsForm,
  PasswordForm,
  ProfileForm,
} from "@/components/settings/settings-forms";
import { Card } from "@/components/ui/card";
import { requireActor } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { roleLabel } from "@/lib/labels";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/actions";
import { listRecentNotifications } from "@/modules/notifications/queries";
import { getOrCreateUserSettings, getProfile } from "@/modules/settings/queries";

export const metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Yükleniyor…</div>}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const actor = await requireActor();
  const [profile, settings, notifications] = await Promise.all([
    getProfile(actor),
    getOrCreateUserSettings(actor),
    listRecentNotifications(actor, 20),
  ]);
  if (!profile) return null;

  return (
    <div>
      <PageHeader
        title="Ayarlar"
        description={`${roleLabel[actor.role]} hesabı · ${actor.organizationName}`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-4">
          <h2 className="font-medium">Profil</h2>
          <div className="flex items-center gap-3">
            {profile.avatarPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/avatar"
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-medium">
                {profile.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              <p>{profile.name}</p>
              <p>{profile.email}</p>
            </div>
          </div>
          <AvatarForm hasAvatar={Boolean(profile.avatarPath)} />
          <ProfileForm name={profile.name} email={profile.email} />
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="font-medium">Şifre</h2>
          <PasswordForm />
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="font-medium">Bildirimler ve gösterge</h2>
          <NotificationPrefsForm prefs={settings} />
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">Son bildirimler</h2>
            <form action={markAllNotificationsRead}>
              <button type="submit" className="text-sm text-primary">
                Tümünü okundu say
              </button>
            </form>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bildirim yok.</p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-lg border border-border px-3 py-2 text-sm ${item.readAt ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-0.5 text-muted-foreground">{item.body}</p>
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
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
