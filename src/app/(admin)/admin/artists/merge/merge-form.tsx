"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Search, Loader2 } from "lucide-react";
import { mergeArtists, adminSearchArtists } from "@/lib/actions/admin";

type ArtistWithSets = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  sets: { id: string; title: string; slug: string }[];
  genres: { id: string; name: string; slug: string }[];
};

interface Props {
  canonical: ArtistWithSets | null;
  duplicate: ArtistWithSets | null;
}

function ArtistCard({
  artist,
  label,
  labelColor,
}: {
  artist: ArtistWithSets;
  label: string;
  labelColor: string;
}) {
  return (
    <div className="flex-1 rounded-lg border border-border-subtle bg-bg-surface p-4">
      <span
        className={`mb-3 inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}
      >
        {label}
      </span>
      <h3 className="mb-1 text-lg font-semibold text-text-primary">
        {artist.name}
      </h3>
      <p className="mb-3 font-mono text-xs text-text-tertiary">{artist.slug}</p>

      {artist.aliases.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-text-tertiary">Aliases: </span>
          <span className="text-xs text-text-secondary">
            {artist.aliases.join(", ")}
          </span>
        </div>
      )}

      <div className="mb-2 text-sm text-text-secondary">
        <span className="font-medium">{artist.sets.length}</span>{" "}
        {artist.sets.length === 1 ? "set" : "sets"}
      </div>

      {artist.sets.length > 0 && (
        <ul className="mb-3 space-y-1">
          {artist.sets.slice(0, 5).map((set) => (
            <li key={set.id} className="text-xs text-text-tertiary">
              {set.title}
            </li>
          ))}
          {artist.sets.length > 5 && (
            <li className="text-xs text-text-tertiary">
              +{artist.sets.length - 5} more
            </li>
          )}
        </ul>
      )}

      {artist.genres.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {artist.genres.map((g) => (
            <span
              key={g.id}
              className="rounded bg-bg-surface-hover px-1.5 py-0.5 text-[10px] text-text-tertiary"
            >
              {g.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtistSearchField({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (artist: { id: string; name: string; slug: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const data = await adminSearchArtists(q);
    setResults(data);
    setIsSearching(false);
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs text-text-tertiary">{label}</label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search artists..."
          className="w-full rounded border border-border-subtle bg-bg-primary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-text-tertiary" />
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded border border-border-subtle bg-bg-surface shadow-lg">
          {results.map((artist) => (
            <button
              key={artist.id}
              onClick={() => {
                onSelect(artist);
                setQuery(artist.name);
                setResults([]);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-surface-hover"
            >
              {artist.name}{" "}
              <span className="font-mono text-xs text-text-tertiary">
                {artist.slug}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MergeForm({ canonical, duplicate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // For manual search mode (when no artists are pre-selected)
  const [manualCanonicalId, setManualCanonicalId] = useState<string | null>(null);
  const [manualDuplicateId, setManualDuplicateId] = useState<string | null>(null);

  const effectiveCanonicalId = canonical?.id ?? manualCanonicalId;
  const effectiveDuplicateId = duplicate?.id ?? manualDuplicateId;

  function handleMerge() {
    if (!effectiveCanonicalId || !effectiveDuplicateId) return;
    if (effectiveCanonicalId === effectiveDuplicateId) {
      setError("Cannot merge an artist with itself.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await mergeArtists(effectiveCanonicalId, effectiveDuplicateId);
        setSuccess(true);
        setTimeout(() => router.push("/admin/artists"), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Merge failed");
      }
    });
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-accent-positive/30 bg-accent-positive/10 p-4 text-accent-positive">
        <Check className="h-5 w-5" />
        Artists merged successfully. Redirecting...
      </div>
    );
  }

  // Manual search mode
  if (!canonical || !duplicate) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-text-secondary">
          Search for two artists to merge. The canonical artist will be kept; the
          duplicate will be removed and its sets reassigned.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <ArtistSearchField
            label="Canonical (keep)"
            onSelect={(a) => setManualCanonicalId(a.id)}
          />
          <ArtistSearchField
            label="Duplicate (remove)"
            onSelect={(a) => setManualDuplicateId(a.id)}
          />
        </div>

        {error && (
          <p className="text-sm text-accent-negative">{error}</p>
        )}

        <button
          onClick={handleMerge}
          disabled={!effectiveCanonicalId || !effectiveDuplicateId || isPending}
          className="self-start rounded bg-accent-negative px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-negative/80 disabled:opacity-50"
        >
          {isPending ? "Merging..." : "Confirm Merge"}
        </button>
      </div>
    );
  }

  // Pre-selected comparison mode
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-secondary">
        The duplicate artist will be removed. All its sets, genres, and aliases will
        be reassigned to the canonical artist.
      </p>

      <div className="flex items-stretch gap-4">
        <ArtistCard
          artist={canonical}
          label="Keep"
          labelColor="bg-accent-positive/15 text-accent-positive"
        />
        <div className="flex items-center">
          <ArrowRight className="h-6 w-6 text-text-tertiary" />
        </div>
        <ArtistCard
          artist={duplicate}
          label="Remove"
          labelColor="bg-accent-negative/15 text-accent-negative"
        />
      </div>

      {error && (
        <p className="text-sm text-accent-negative">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleMerge}
          disabled={isPending}
          className="rounded bg-accent-negative px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-negative/80 disabled:opacity-50"
        >
          {isPending ? "Merging..." : "Confirm Merge"}
        </button>
        <button
          onClick={() =>
            router.push(
              `/admin/artists/merge?canonical=${duplicate.id}&duplicate=${canonical.id}`
            )
          }
          className="rounded border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
        >
          Swap Direction
        </button>
      </div>
    </div>
  );
}
