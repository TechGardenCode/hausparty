"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/toast";
import { updateArtist } from "@/lib/actions/admin";
import { slugify } from "@/lib/utils";

interface Props {
  artist: {
    id: string;
    name: string;
    slug: string;
    aliases: string[];
    imageUrl: string | null;
    bio: string | null;
    sets: { id: string; title: string; slug: string }[];
    genres: { id: string; name: string; slug: string }[];
  };
}

export function ArtistEditorForm({ artist }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(artist.name);
  const [slug, setSlug] = useState(artist.slug);
  const [imageUrl, setImageUrl] = useState(artist.imageUrl ?? "");
  const [bio, setBio] = useState(artist.bio ?? "");
  const [aliases, setAliases] = useState(artist.aliases);
  const [newAlias, setNewAlias] = useState("");
  const [autoSlug, setAutoSlug] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (autoSlug) setSlug(slugify(val));
  }

  function addAlias() {
    const trimmed = newAlias.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases([...aliases, trimmed]);
      setNewAlias("");
    }
  }

  function removeAlias(alias: string) {
    setAliases(aliases.filter((a) => a !== alias));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateArtist(artist.id, {
          name,
          slug,
          imageUrl: imageUrl.trim() || null,
          bio: bio.trim() || null,
          aliases,
        });
        toast("Artist updated", "success");
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
          href="/admin/artists"
          className="rounded p-1 text-text-tertiary hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Artist</h1>
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
                className="mt-1 h-20 w-20 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Aliases</label>
            <div className="flex flex-wrap gap-2">
              {aliases.map((alias) => (
                <span
                  key={alias}
                  className="flex items-center gap-1 rounded bg-bg-surface-hover px-2 py-1 text-xs text-text-secondary"
                >
                  {alias}
                  <button type="button" onClick={() => removeAlias(alias)}>
                    <X className="h-3 w-3 text-text-tertiary hover:text-text-primary" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="Add alias..."
                className="flex-1 rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
              />
              <button
                type="button"
                onClick={addAlias}
                disabled={!newAlias.trim()}
                className="rounded bg-bg-surface-hover px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                Add
              </button>
            </div>
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
            <h3 className="mb-2 text-xs font-medium text-text-secondary">Sets ({artist.sets.length})</h3>
            <div className="flex flex-col gap-1">
              {artist.sets.slice(0, 10).map((s) => (
                <Link
                  key={s.id}
                  href={`/sets/${s.slug}`}
                  className="truncate text-xs text-text-tertiary hover:text-accent-primary"
                >
                  {s.title}
                </Link>
              ))}
              {artist.sets.length > 10 && (
                <span className="text-xs text-text-tertiary">+{artist.sets.length - 10} more</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
            <h3 className="mb-2 text-xs font-medium text-text-secondary">Genres</h3>
            <div className="flex flex-wrap gap-1.5">
              {artist.genres.map((g) => (
                <span key={g.id} className="rounded bg-bg-surface-hover px-2 py-0.5 text-xs text-text-secondary">
                  {g.name}
                </span>
              ))}
              {artist.genres.length === 0 && (
                <span className="text-xs text-text-tertiary">No genres</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
