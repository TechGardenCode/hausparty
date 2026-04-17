"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import { updateFestival } from "@/lib/actions/admin";
import { slugify } from "@/lib/utils";

interface Props {
  festival: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    events: { id: string; name: string; slug: string; dateStart: string | null }[];
    genres: { id: string; name: string; slug: string }[];
  };
}

export function FestivalEditorForm({ festival }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(festival.name);
  const [slug, setSlug] = useState(festival.slug);
  const [imageUrl, setImageUrl] = useState(festival.imageUrl ?? "");
  const [description, setDescription] = useState(festival.description ?? "");
  const [autoSlug, setAutoSlug] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (autoSlug) setSlug(slugify(val));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateFestival(festival.id, {
          name,
          slug,
          imageUrl: imageUrl.trim() || null,
          description: description.trim() || null,
        });
        toast("Festival updated", "success");
        router.refresh();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to update", "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="rounded p-1 text-text-tertiary hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Festival</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main form */}
        <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-surface p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-text-secondary">Slug</label>
              <label className="flex items-center gap-1 text-xs text-text-tertiary">
                <input
                  type="checkbox"
                  checked={autoSlug}
                  onChange={(e) => setAutoSlug(e.target.checked)}
                  className="rounded"
                />
                auto
              </label>
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={autoSlug}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
            />
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary user-entered URL; not worth adding every host to remotePatterns
              <img
                src={imageUrl}
                alt="Preview"
                className="mt-1 h-32 w-full rounded object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <h3 className="mb-2 text-xs font-medium text-text-secondary">Events ({festival.events.length})</h3>
            <div className="flex flex-col gap-1">
              {festival.events.slice(0, 10).map((e) => (
                <span key={e.id} className="text-xs text-text-tertiary">
                  {e.name} {e.dateStart && `(${e.dateStart})`}
                </span>
              ))}
              {festival.events.length > 10 && (
                <span className="text-xs text-text-tertiary">+{festival.events.length - 10} more</span>
              )}
              {festival.events.length === 0 && (
                <span className="text-xs text-text-tertiary">No events</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <h3 className="mb-2 text-xs font-medium text-text-secondary">Genres</h3>
            <div className="flex flex-wrap gap-1.5">
              {festival.genres.map((g) => (
                <span key={g.id} className="rounded bg-bg-surface-hover px-2 py-0.5 text-xs text-text-secondary">
                  {g.name}
                </span>
              ))}
              {festival.genres.length === 0 && (
                <span className="text-xs text-text-tertiary">No genres</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
