"use client";

import { useActionState, useState } from "react";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/lib/action-state";

type AnnouncementValues = {
  id?: string;
  title: string;
  content: string;
  audience: "ALL" | "TEAMS";
  publishedAt: string;
  expiresAt: string;
  teamIds: string[];
  publishNow: boolean;
};

export function AnnouncementForm({
  action,
  announcement,
  teams,
  submitLabel,
  teamLeaderMode = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  announcement?: AnnouncementValues;
  teams: { id: string; name: string }[];
  submitLabel: string;
  teamLeaderMode?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [audience, setAudience] = useState<"ALL" | "TEAMS">(
    teamLeaderMode ? "TEAMS" : (announcement?.audience ?? "ALL"),
  );
  const errors = state.fieldErrors;
  const showTeams = teamLeaderMode || audience === "TEAMS";

  return (
    <form action={formAction} className="space-y-4">
      {announcement?.id ? <input type="hidden" name="id" value={announcement.id} /> : null}
      {teamLeaderMode ? <input type="hidden" name="audience" value="TEAMS" /> : null}
      <FormError message={state.error} />
      <Field label="Başlık" htmlFor="title" error={errors?.title?.[0]}>
        <Input id="title" name="title" defaultValue={announcement?.title} required />
      </Field>
      <Field label="İçerik" htmlFor="content" error={errors?.content?.[0]}>
        <Textarea id="content" name="content" defaultValue={announcement?.content} required rows={8} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {!teamLeaderMode ? (
          <Field label="Hedef kitle" htmlFor="audience" error={errors?.audience?.[0]}>
            <select
              id="audience"
              name="audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value as "ALL" | "TEAMS")}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="ALL">Tüm çalışanlar</option>
              <option value="TEAMS">Seçili ekipler</option>
            </select>
          </Field>
        ) : (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Bu duyuru yalnızca lideri olduğunuz ekibe gider. Yönetici de görebilir.
          </div>
        )}
        <Field label="Yayın tarihi" htmlFor="publishedAt" error={errors?.publishedAt?.[0]}>
          <Input
            id="publishedAt"
            name="publishedAt"
            type="datetime-local"
            defaultValue={announcement?.publishedAt}
          />
        </Field>
        <Field label="Bitiş tarihi" htmlFor="expiresAt" error={errors?.expiresAt?.[0]}>
          <Input
            id="expiresAt"
            name="expiresAt"
            type="datetime-local"
            defaultValue={announcement?.expiresAt}
          />
        </Field>
      </div>
      {showTeams ? (
        <Field label="Ekipler" htmlFor="teamIds" error={errors?.teamIds?.[0]}>
          <div className="grid gap-2 sm:grid-cols-2">
            {teams.map((team) => (
              <label key={team.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="teamIds"
                  value={team.id}
                  defaultChecked={
                    announcement?.teamIds.includes(team.id) ||
                    (teamLeaderMode && teams.length === 1)
                  }
                />
                {team.name}
              </label>
            ))}
          </div>
        </Field>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publishNow" defaultChecked={announcement?.publishNow ?? true} />
        Hemen yayınla
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : submitLabel}
      </Button>
    </form>
  );
}
