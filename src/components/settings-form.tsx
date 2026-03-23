"use client";

import { useActionState, useEffect, useState } from "react";
import { updateSettings } from "@/lib/actions/user";
import { useToast } from "@/components/toast";

interface SettingsFormProps {
  initialDisplayName: string | null;
  initialAvatarUrl: string | null;
  initialAutoplay: boolean;
}

export function SettingsForm({
  initialDisplayName,
  initialAvatarUrl,
  initialAutoplay,
}: SettingsFormProps) {
  const { toast } = useToast();
  const [autoplay, setAutoplay] = useState(initialAutoplay);
  const [state, action, pending] = useActionState(updateSettings, null);

  useEffect(() => {
    if (state?.success) {
      toast("Settings saved.", "success");
    } else if (state?.error) {
      toast(state.error, "error");
    }
  }, [state, toast]);

  return (
    <form action={action} className="flex max-w-lg flex-col gap-8">
      {/* Profile */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-tertiary">
          Profile
        </h2>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="display_name"
            className="text-sm font-medium text-text-secondary"
          >
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            defaultValue={initialDisplayName ?? ""}
            placeholder="How you appear on hausparty"
            className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="avatar_url"
            className="text-sm font-medium text-text-secondary"
          >
            Avatar URL
          </label>
          <input
            id="avatar_url"
            name="avatar_url"
            type="url"
            defaultValue={initialAvatarUrl ?? ""}
            placeholder="https://example.com/avatar.jpg"
            className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
      </section>

      {/* Playback */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-tertiary">
          Playback
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-text-primary">
              Autoplay
            </span>
            <span className="text-xs text-text-tertiary">
              Automatically play sets when you open a set page
            </span>
          </div>
          <input type="hidden" name="autoplay" value={autoplay ? "on" : "off"} />
          <button
            type="button"
            role="switch"
            aria-checked={autoplay}
            onClick={() => setAutoplay((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              autoplay ? "bg-accent-primary" : "bg-bg-surface"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                autoplay ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-accent-negative">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
