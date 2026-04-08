"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, ChevronUp, ChevronDown, Search, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { DurationInput } from "@/components/duration-input";
import { slugify } from "@/lib/utils";
import {
  updateSet,
  updateSetArtists,
  updateSetGenres,
  createEvent,
  createGenre,
  createArtist,
  adminSearchArtists,
  adminSearchEvents,
  adminSearchFestivals,
  adminGetGenreSuggestions,
} from "@/lib/actions/admin";

// Types inferred from getSetForEdit return
type SetForEdit = {
  id: string;
  title: string;
  slug: string;
  performed_at: Date | null;
  duration_seconds: number | null;
  stage: string | null;
  event_id: string | null;
  artists: { id: string; name: string; slug: string }[];
  genres: { id: string; name: string; slug: string }[];
  event: {
    id: string;
    name: string;
    slug: string;
    festival_id: string | null;
    festivals: { id: string; name: string; slug: string } | null;
    stages: string[] | null;
  } | null;
  sources: { id: string; url: string; platform: string }[];
};

type GenreOption = { id: string; name: string; slug: string };

interface Props {
  set: SetForEdit;
  allGenres: GenreOption[];
}

export function SetEditorForm({ set, allGenres }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Basic info state
  const [title, setTitle] = useState(set.title);
  const [slug, setSlug] = useState(set.slug);
  const [performedAt, setPerformedAt] = useState(
    set.performed_at ? new Date(set.performed_at).toISOString().split("T")[0] : ""
  );
  const [duration, setDuration] = useState<number | null>(set.duration_seconds);
  const [stage, setStage] = useState(set.stage ?? "");
  const [autoSlug, setAutoSlug] = useState(false);

  // Artists state
  const [artists, setArtists] = useState(set.artists);
  const [artistQuery, setArtistQuery] = useState("");
  const [artistResults, setArtistResults] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [showArtistSearch, setShowArtistSearch] = useState(false);

  // Event state
  const [event, setEvent] = useState(set.event);
  const [eventQuery, setEventQuery] = useState("");
  const [eventResults, setEventResults] = useState<Awaited<ReturnType<typeof adminSearchEvents>>>([]);
  const [showEventSearch, setShowEventSearch] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventFestivalQuery, setNewEventFestivalQuery] = useState("");
  const [newEventFestivalResults, setNewEventFestivalResults] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [newEventFestival, setNewEventFestival] = useState<{ id: string; name: string } | null>(null);

  // Genres state
  const [genres, setGenres] = useState(set.genres);
  const [genreQuery, setGenreQuery] = useState("");
  const [suggestedGenres, setSuggestedGenres] = useState<GenreOption[]>([]);
  const [showNewGenre, setShowNewGenre] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");

  // Helpers
  const filteredGenres = allGenres.filter(
    (g) =>
      !genres.some((sg) => sg.id === g.id) &&
      g.name.toLowerCase().includes(genreQuery.toLowerCase())
  );

  // --- Basic Info ---
  function handleTitleChange(val: string) {
    setTitle(val);
    if (autoSlug) setSlug(slugify(val));
  }

  // --- Artist Management ---
  async function handleArtistSearch(query: string) {
    setArtistQuery(query);
    if (query.length < 2) {
      setArtistResults([]);
      return;
    }
    const results = await adminSearchArtists(query);
    setArtistResults(results.filter((r) => !artists.some((a) => a.id === r.id)));
  }

  function addArtist(artist: { id: string; name: string; slug: string }) {
    setArtists((prev) => [...prev, artist]);
    setArtistQuery("");
    setArtistResults([]);
    setShowArtistSearch(false);
  }

  function removeArtist(id: string) {
    setArtists((prev) => prev.filter((a) => a.id !== id));
  }

  function moveArtist(index: number, direction: "up" | "down") {
    const newArtists = [...artists];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newArtists.length) return;
    [newArtists[index], newArtists[targetIndex]] = [newArtists[targetIndex], newArtists[index]];
    setArtists(newArtists);
  }

  async function handleCreateArtist() {
    if (!artistQuery.trim()) return;
    try {
      const newArtist = await createArtist(artistQuery.trim());
      addArtist(newArtist);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create artist", "error");
    }
  }

  // --- Event Management ---
  async function handleEventSearch(query: string) {
    setEventQuery(query);
    if (query.length < 2) {
      setEventResults([]);
      return;
    }
    const results = await adminSearchEvents(query);
    setEventResults(results);
  }

  function assignEvent(evt: Awaited<ReturnType<typeof adminSearchEvents>>[number]) {
    setEvent({
      id: evt.id,
      name: evt.name,
      slug: evt.slug,
      festival_id: evt.festivals?.id ?? null,
      festivals: evt.festivals,
      stages: null,
    });
    setEventQuery("");
    setEventResults([]);
    setShowEventSearch(false);
  }

  async function handleCreateEvent() {
    if (!newEventName.trim()) return;
    try {
      const evt = await createEvent({
        name: newEventName.trim(),
        festival_id: newEventFestival?.id ?? null,
        date_start: newEventDate || null,
      });
      setEvent({
        id: evt.id,
        name: evt.name,
        slug: evt.slug,
        festival_id: newEventFestival?.id ?? null,
        festivals: newEventFestival ? { id: newEventFestival.id, name: newEventFestival.name, slug: slugify(newEventFestival.name) } : null,
        stages: null,
      });
      setShowNewEvent(false);
      setNewEventName("");
      setNewEventDate("");
      setNewEventFestival(null);
      toast("Event created", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create event", "error");
    }
  }

  async function handleFestivalSearch(query: string) {
    setNewEventFestivalQuery(query);
    if (query.length < 2) {
      setNewEventFestivalResults([]);
      return;
    }
    const results = await adminSearchFestivals(query);
    setNewEventFestivalResults(results);
  }

  // --- Genre Management ---
  function addGenre(genre: GenreOption) {
    setGenres((prev) => [...prev, genre]);
    setGenreQuery("");
  }

  function removeGenre(id: string) {
    setGenres((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleSuggestGenres() {
    if (artists.length === 0) {
      toast("Add artists first to get genre suggestions", "info");
      return;
    }
    const suggestions = await adminGetGenreSuggestions(artists.map((a) => a.id));
    const filtered = suggestions.filter((s) => !genres.some((g) => g.id === s.id));
    setSuggestedGenres(filtered);
    if (filtered.length === 0) toast("No new genre suggestions found", "info");
  }

  async function handleCreateGenre() {
    if (!newGenreName.trim()) return;
    try {
      const genre = await createGenre(newGenreName.trim());
      addGenre(genre);
      setNewGenreName("");
      setShowNewGenre(false);
      toast("Genre created", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create genre", "error");
    }
  }

  // --- Save ---
  function handleSave() {
    startTransition(async () => {
      try {
        await Promise.all([
          updateSet(set.id, {
            title,
            slug,
            performed_at: performedAt || null,
            duration_seconds: duration,
            stage: stage || null,
            event_id: event?.id ?? null,
          }),
          updateSetArtists(
            set.id,
            artists.map((a, i) => ({ id: a.id, position: i }))
          ),
          updateSetGenres(
            set.id,
            genres.map((g) => g.id)
          ),
        ]);

        toast("Set updated successfully", "success");
        router.refresh();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to save", "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: Basic Info */}
      <section className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-surface p-5">
        <h2 className="text-lg font-semibold">Basic Info</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Slug
              <button
                type="button"
                onClick={() => {
                  setAutoSlug(!autoSlug);
                  if (!autoSlug) setSlug(slugify(title));
                }}
                className="ml-2 text-xs text-accent-primary hover:underline"
              >
                {autoSlug ? "manual" : "auto"}
              </button>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={autoSlug}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary disabled:opacity-50 focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Performed at</label>
            <input
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Duration</label>
            <DurationInput value={duration} onChange={setDuration} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Stage</label>
            <input
              type="text"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="e.g. Main Stage"
              className="rounded border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Sources (read-only) */}
        {set.sources.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Sources</label>
            <div className="flex flex-col gap-1">
              {set.sources.map((s) => (
                <span key={s.id} className="text-xs text-text-tertiary truncate">
                  {s.platform}: {s.url}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Artists */}
      <section className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-surface p-5">
        <h2 className="text-lg font-semibold">Artists</h2>

        {artists.length > 0 && (
          <div className="flex flex-col gap-2">
            {artists.map((artist, index) => (
              <div
                key={artist.id}
                className="flex items-center gap-2 rounded border border-border-subtle bg-bg-primary px-3 py-2"
              >
                <span className="flex-1 text-sm text-text-primary">{artist.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveArtist(index, "up")}
                    disabled={index === 0}
                    className="rounded p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveArtist(index, "down")}
                    disabled={index === artists.length - 1}
                    className="rounded p-1 text-text-tertiary hover:text-text-primary disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeArtist(artist.id)}
                    className="rounded p-1 text-text-tertiary hover:text-accent-negative"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showArtistSearch ? (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                value={artistQuery}
                onChange={(e) => handleArtistSearch(e.target.value)}
                placeholder="Search artists..."
                autoFocus
                className="w-full rounded border border-border-subtle bg-bg-primary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
              />
            </div>
            {artistResults.length > 0 && (
              <div className="flex flex-col rounded border border-border-subtle bg-bg-primary">
                {artistResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => addArtist(r)}
                    className="px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary max-sm:py-3"
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
            {artistQuery.length >= 2 && artistResults.length === 0 && (
              <button
                type="button"
                onClick={handleCreateArtist}
                className="text-left text-sm text-accent-primary hover:underline"
              >
                Create &ldquo;{artistQuery}&rdquo;
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowArtistSearch(false);
                setArtistQuery("");
                setArtistResults([]);
              }}
              className="text-sm text-text-tertiary hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowArtistSearch(true)}
            className="flex items-center gap-1.5 text-sm text-accent-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add artist
          </button>
        )}
      </section>

      {/* Section 3: Event */}
      <section className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-surface p-5">
        <h2 className="text-lg font-semibold">Event</h2>

        {event ? (
          <div className="flex items-center gap-3 rounded border border-border-subtle bg-bg-primary px-3 py-2">
            <div className="flex-1">
              <span className="text-sm text-text-primary">{event.name}</span>
              {event.festivals && (
                <span className="ml-2 text-xs text-text-tertiary">
                  ({event.festivals.name})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEvent(null)}
              className="rounded p-1 text-text-tertiary hover:text-accent-negative"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : showEventSearch ? (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                value={eventQuery}
                onChange={(e) => handleEventSearch(e.target.value)}
                placeholder="Search events..."
                autoFocus
                className="w-full rounded border border-border-subtle bg-bg-primary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
              />
            </div>
            {eventResults.length > 0 && (
              <div className="flex flex-col rounded border border-border-subtle bg-bg-primary">
                {eventResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => assignEvent(r)}
                    className="px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary max-sm:py-3"
                  >
                    {r.name}
                    {r.festivals && (
                      <span className="ml-2 text-xs text-text-tertiary">
                        ({r.festivals.name})
                      </span>
                    )}
                    {r.date_start && (
                      <span className="ml-2 text-xs text-text-tertiary">
                        {r.date_start}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEventSearch(false);
                  setShowNewEvent(true);
                }}
                className="text-sm text-accent-primary hover:underline"
              >
                Create new event
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEventSearch(false);
                  setEventQuery("");
                  setEventResults([]);
                }}
                className="text-sm text-text-tertiary hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : showNewEvent ? (
          <div className="flex flex-col gap-3 rounded border border-border-subtle bg-bg-primary p-3">
            <span className="text-sm font-medium text-text-secondary">New Event</span>
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="Event name"
              className="rounded border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
            />
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="rounded border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-tertiary">Festival (optional)</label>
              {newEventFestival ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-primary">{newEventFestival.name}</span>
                  <button type="button" onClick={() => setNewEventFestival(null)} className="text-text-tertiary hover:text-accent-negative">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={newEventFestivalQuery}
                    onChange={(e) => handleFestivalSearch(e.target.value)}
                    placeholder="Search festivals..."
                    className="rounded border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
                  />
                  {newEventFestivalResults.length > 0 && (
                    <div className="flex flex-col rounded border border-border-subtle bg-bg-surface">
                      {newEventFestivalResults.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setNewEventFestival({ id: f.id, name: f.name });
                            setNewEventFestivalQuery("");
                            setNewEventFestivalResults([]);
                          }}
                          className="px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-surface-hover"
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateEvent}
                disabled={!newEventName.trim()}
                className="rounded bg-accent-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewEvent(false);
                  setNewEventName("");
                  setNewEventDate("");
                  setNewEventFestival(null);
                }}
                className="text-sm text-text-tertiary hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowEventSearch(true)}
              className="flex items-center gap-1.5 text-sm text-accent-primary hover:underline"
            >
              <Search className="h-3.5 w-3.5" />
              Search events
            </button>
            <button
              type="button"
              onClick={() => setShowNewEvent(true)}
              className="flex items-center gap-1.5 text-sm text-accent-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Create event
            </button>
          </div>
        )}
      </section>

      {/* Section 4: Genres */}
      <section className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-bg-surface p-5">
        <h2 className="text-lg font-semibold">Genres</h2>

        {/* Current genres */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <span
                key={genre.id}
                className="flex items-center gap-1.5 rounded-full bg-accent-primary/15 px-3 py-1 text-sm text-accent-primary"
              >
                {genre.name}
                <button
                  type="button"
                  onClick={() => removeGenre(genre.id)}
                  className="hover:text-accent-negative"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Genre suggestions */}
        {suggestedGenres.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-text-tertiary">Suggested from artists</span>
            <div className="flex flex-wrap gap-2">
              {suggestedGenres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => {
                    addGenre(genre);
                    setSuggestedGenres((prev) => prev.filter((g) => g.id !== genre.id));
                  }}
                  className="flex items-center gap-1 rounded-full border border-dashed border-accent-primary/40 px-3 py-1 text-sm text-accent-primary hover:bg-accent-primary/10"
                >
                  <Plus className="h-3 w-3" />
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Genre search */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              value={genreQuery}
              onChange={(e) => setGenreQuery(e.target.value)}
              placeholder="Search genres..."
              className="w-full rounded border border-border-subtle bg-bg-primary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
            />
          </div>
          {genreQuery && filteredGenres.length > 0 && (
            <div className="flex flex-col rounded border border-border-subtle bg-bg-primary max-h-48 overflow-y-auto">
              {filteredGenres.slice(0, 15).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => addGenre(g)}
                  className="px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary max-sm:py-3"
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSuggestGenres}
            className="flex items-center gap-1.5 text-sm text-accent-primary hover:underline"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Suggest genres
          </button>
          {showNewGenre ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                placeholder="New genre name"
                autoFocus
                className="rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateGenre();
                  if (e.key === "Escape") {
                    setShowNewGenre(false);
                    setNewGenreName("");
                  }
                }}
              />
              <button
                type="button"
                onClick={handleCreateGenre}
                disabled={!newGenreName.trim()}
                className="rounded bg-accent-primary px-2.5 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewGenre(false);
                  setNewGenreName("");
                }}
                className="text-sm text-text-tertiary hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewGenre(true)}
              className="flex items-center gap-1.5 text-sm text-accent-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Create genre
            </button>
          )}
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 rounded bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Saving..." : "Save changes"}
        </button>
        <a
          href="/admin/sets"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
