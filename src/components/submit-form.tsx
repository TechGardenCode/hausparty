"use client";

import { useActionState, useEffect } from "react";
import { submitSet } from "@/lib/actions/submissions";
import { useToast } from "@/components/toast";

export function SubmitForm() {
  const { toast } = useToast();
  const [state, action, pending] = useActionState(
    async (
      _prev: { success?: boolean; error?: string } | null,
      formData: FormData
    ) => {
      const result = await submitSet(formData);
      return result;
    },
    null
  );

  useEffect(() => {
    if (state?.success) {
      toast("Submission received! We'll review it shortly.", "success");
    } else if (state?.error) {
      toast(state.error, "error");
    }
  }, [state, toast]);

  if (state?.success) {
    return (
      <div className="rounded-lg border border-accent-positive/30 bg-accent-positive/10 p-4 text-sm text-accent-positive">
        Thanks! Your submission has been received and will be reviewed.
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="url" className="text-sm font-medium text-text-secondary">
          URL <span className="text-accent-negative">*</span>
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://youtube.com/watch?v=... or https://soundcloud.com/..."
          className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="artist_name"
          className="text-sm font-medium text-text-secondary"
        >
          Artist(s)
        </label>
        <input
          id="artist_name"
          name="artist_name"
          type="text"
          placeholder="e.g. Amelie Lens or Amelie Lens B2B Kobosil"
          className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
        <p className="text-xs text-text-tertiary">
          For B2B/B3B sets, separate names with B2B or commas
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-text-secondary">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="e.g. Boiler Room London 2025"
          className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="event_name"
          className="text-sm font-medium text-text-secondary"
        >
          Event / Festival
        </label>
        <input
          id="event_name"
          name="event_name"
          type="text"
          placeholder="e.g. Dekmantel 2025"
          className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="genre" className="text-sm font-medium text-text-secondary">
            Genre
          </label>
          <input
            id="genre"
            name="genre"
            type="text"
            placeholder="e.g. Techno, House"
            className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stage" className="text-sm font-medium text-text-secondary">
            Stage
          </label>
          <input
            id="stage"
            name="stage"
            type="text"
            placeholder="e.g. Main Stage"
            className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="performed_date"
          className="text-sm font-medium text-text-secondary"
        >
          Date performed
        </label>
        <input
          id="performed_date"
          name="performed_date"
          type="date"
          className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-sm font-medium text-text-secondary"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Any additional context — tracklist link, recording details..."
          className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary resize-none"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-accent-negative">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
