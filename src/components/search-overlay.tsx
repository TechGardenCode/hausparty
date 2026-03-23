"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Music,
  User,
  Tent,
  ArrowRight,
  Disc3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "set" | "artist" | "festival";
  id: string;
  slug: string;
  label: string;
  sublabel: string | null;
  sourceCount?: number;
}

interface TypeaheadResponse {
  sets: Array<{
    id: string;
    slug: string;
    artists: Array<{ name: string }>;
    event: { name: string } | null;
    sources: Array<{ id: string }>;
  }>;
  artists: Array<{
    id: string;
    slug: string;
    name: string;
    genres: Array<{ name: string }>;
  }>;
  festivals: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_ICONS = {
  set: Music,
  artist: User,
  festival: Tent,
} as const;

const TYPE_LABELS = {
  set: "Set",
  artist: "Artist",
  festival: "Festival",
} as const;

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&limit=5`
        );
        const data: TypeaheadResponse = await res.json();

        const mixed: SearchResult[] = [];

        // Interleave: sets first (up to 3), then artists (up to 1), then festivals (up to 1)
        // but respect the total limit of 5 mixed results
        for (const set of data.sets.slice(0, 3)) {
          mixed.push({
            type: "set",
            id: set.id,
            slug: set.slug,
            label: set.artists.map((a) => a.name).join(", "),
            sublabel: set.event?.name || null,
            sourceCount: set.sources?.length || 0,
          });
        }

        for (const artist of data.artists.slice(0, 2)) {
          mixed.push({
            type: "artist",
            id: artist.id,
            slug: artist.slug,
            label: artist.name,
            sublabel:
              artist.genres
                .slice(0, 2)
                .map((g) => g.name)
                .join(", ") || null,
          });
        }

        for (const festival of data.festivals.slice(0, 2)) {
          mixed.push({
            type: "festival",
            id: festival.id,
            slug: festival.slug,
            label: festival.name,
            sublabel: null,
          });
        }

        setResults(mixed.slice(0, 5));
        setActiveIndex(0);
        setHasSearched(true);
      } catch {
        setResults([]);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const navigateTo = useCallback(
    (result: SearchResult) => {
      const paths = {
        set: `/sets/${result.slug}`,
        artist: `/artists/${result.slug}`,
        festival: `/festivals/${result.slug}`,
      };
      onClose();
      router.push(paths[result.type]);
    },
    [router, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0 && results[activeIndex]) {
          navigateTo(results[activeIndex]);
        } else if (query.trim()) {
          // Fall back to full search page
          onClose();
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
        return;
      }
    },
    [results, activeIndex, navigateTo, query, onClose, router]
  );

  // Global keyboard shortcut: `/` to open, handled by parent
  // Escape to close handled above

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-bg-primary/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mt-[10vh] w-full max-w-[560px] px-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search sets, artists, festivals..."
            className="w-full rounded-t-xl border border-border-subtle bg-bg-surface py-3.5 pl-12 pr-12 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-tertiary transition-colors hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results dropdown */}
        <div className="rounded-b-xl border border-t-0 border-border-subtle bg-bg-surface">
          {loading && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Disc3 className="h-4 w-4 animate-spin text-text-tertiary" />
              <span className="text-sm text-text-tertiary">Searching...</span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-1">
              {results.map((result, index) => {
                const Icon = TYPE_ICONS[result.type];
                const isBestMatch = index === 0;
                const isActive = index === activeIndex;

                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => navigateTo(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isActive && "bg-bg-surface-hover",
                        isBestMatch &&
                          "border-l-2 border-accent-primary bg-accent-primary/5"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isBestMatch
                            ? "text-accent-primary"
                            : "text-text-tertiary"
                        )}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            isBestMatch
                              ? "text-text-primary"
                              : "text-text-primary"
                          )}
                        >
                          {result.label}
                        </span>
                        {result.sublabel && (
                          <>
                            <span className="text-text-tertiary">&mdash;</span>
                            <span className="truncate text-sm text-text-secondary">
                              {result.sublabel}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {result.type === "set" &&
                          result.sourceCount !== undefined &&
                          result.sourceCount > 1 && (
                            <span className="rounded-full bg-bg-primary px-2 py-0.5 text-xs text-text-tertiary">
                              {result.sourceCount}{" "}
                              {result.sourceCount === 1
                                ? "source"
                                : "sources"}
                            </span>
                          )}
                        <span className="text-xs text-text-tertiary">
                          {TYPE_LABELS[result.type]}
                        </span>
                        {isBestMatch && (
                          <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-xs font-medium text-accent-primary">
                            Best
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-8">
              <Search className="h-8 w-8 text-text-tertiary" />
              <p className="text-sm text-text-secondary">
                No results for &ldquo;{query}&rdquo;
              </p>
              <a
                href="/submit"
                onClick={() => onClose()}
                className="flex items-center gap-1.5 text-sm text-accent-primary transition-colors hover:underline"
              >
                Submit a set
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {!loading && !hasSearched && (
            <div className="px-4 py-3">
              <p className="text-xs text-text-tertiary">
                Type at least 2 characters to search. Press{" "}
                <kbd className="rounded border border-border-subtle bg-bg-primary px-1.5 py-0.5 font-mono text-[10px]">
                  Esc
                </kbd>{" "}
                to close.
              </p>
            </div>
          )}

          {/* Full search link */}
          {query.trim().length >= 2 && !loading && (
            <div className="border-t border-border-subtle px-4 py-2">
              <a
                href={`/search?q=${encodeURIComponent(query.trim())}`}
                onClick={() => onClose()}
                className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                <Search className="h-3.5 w-3.5" />
                View all results for &ldquo;{query.trim()}&rdquo;
                <ArrowRight className="ml-auto h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
