import { redirect } from "next/navigation";
import Link from "next/link";
import { Bookmark, Users, Flag, FolderOpen, Plus, Music, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getSavedSets,
  getFollowedArtists,
  getFollowedFestivals,
  getFollowedGenres,
  getCollections,
  getUserSubmissions,
} from "@/lib/queries/library";
import { formatRelativeDate } from "@/lib/utils";
import { SetRow } from "@/components/set-row";
import { ArtistCard } from "@/components/artist-card";
import { FestivalCard } from "@/components/festival-card";
import { GenreChip } from "@/components/genre-chip";
import { EmptyState } from "@/components/empty-state";
import { signOut } from "@/lib/actions/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library | hausparty",
};

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function LibraryPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { tab } = await searchParams;
  const activeTab = tab || "saved";

  const [savedSets, followedArtists, followedFestivals, followedGenres, collections, submissions] =
    await Promise.all([
      getSavedSets(user.id),
      getFollowedArtists(user.id),
      getFollowedFestivals(user.id),
      getFollowedGenres(user.id),
      getCollections(user.id),
      getUserSubmissions(user.id),
    ]);

  const tabs = [
    { key: "saved", label: "Saved Sets", icon: Bookmark },
    { key: "collections", label: "Collections", icon: FolderOpen },
    { key: "artists", label: "Artists", icon: Users },
    { key: "festivals", label: "Festivals", icon: Flag },
    { key: "genres", label: "Genres", icon: Music },
    { key: "submissions", label: "Submissions", icon: Send },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            Settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/library?tab=${key}`}
            className={`flex items-center gap-1.5 border-b-2 pb-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === key
                ? "border-accent-primary text-accent-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* Saved Sets */}
      {activeTab === "saved" && (
        <div className="flex flex-col">
          {savedSets.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              message="No saved sets yet. Browse sets and hit save."
            />
          ) : (
            savedSets.map((set) => (
              <SetRow
                key={set.id}
                slug={set.slug}
                artistNames={set.artists.map((a) => a.name)}
                eventName={set.event?.name || null}
                durationSeconds={set.duration_seconds}
                platform={set.sources[0]?.platform}
                sourceCount={set.sources.length}
                thumbnailUrl={set.thumbnailUrl}
              />
            ))
          )}
        </div>
      )}

      {/* Collections */}
      {activeTab === "collections" && (
        <div className="flex flex-col gap-4">
          {collections.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              message="No collections yet. Create one to organize your sets."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/library/collections/${collection.id}`}
                  className="flex flex-col gap-1 rounded-lg bg-bg-surface p-4 transition-colors hover:bg-bg-surface-hover"
                >
                  <FolderOpen className="h-5 w-5 text-text-tertiary" />
                  <span className="text-sm font-medium text-text-primary">
                    {collection.name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {collection.set_count}{" "}
                    {collection.set_count === 1 ? "set" : "sets"}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <CreateCollectionButton />
        </div>
      )}

      {/* Artists */}
      {activeTab === "artists" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {followedArtists.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={Users}
                message="Not following any artists yet."
              />
            </div>
          ) : (
            followedArtists.map((artist) => (
              <ArtistCard
                key={artist.id}
                slug={artist.slug}
                name={artist.name}
                imageUrl={artist.image_url}
                genreNames={artist.genres.map((g) => g.name)}
                setCount={0}
              />
            ))
          )}
        </div>
      )}

      {/* Festivals */}
      {activeTab === "festivals" && (
        <div className="flex flex-wrap gap-4">
          {followedFestivals.length === 0 ? (
            <EmptyState
              icon={Flag}
              message="Not following any festivals yet."
            />
          ) : (
            followedFestivals.map((festival) => (
              <FestivalCard
                key={festival.id}
                slug={festival.slug}
                name={festival.name}
                imageUrl={festival.image_url}
                setCount={0}
              />
            ))
          )}
        </div>
      )}

      {/* Genres */}
      {activeTab === "genres" && (
        <div className="flex flex-wrap gap-3">
          {followedGenres.length === 0 ? (
            <div className="w-full">
              <EmptyState
                icon={Music}
                message="Follow genres to see them here."
                action={
                  <Link
                    href="/genres"
                    className="text-sm font-medium text-accent-primary hover:underline"
                  >
                    Browse genres
                  </Link>
                }
              />
            </div>
          ) : (
            followedGenres.map((genre) => (
              <GenreChip
                key={genre.id}
                name={genre.name}
                slug={genre.slug}
              />
            ))
          )}
        </div>
      )}

      {/* Submissions */}
      {activeTab === "submissions" && (
        <div className="flex flex-col gap-3">
          {submissions.length === 0 ? (
            <EmptyState
              icon={Send}
              message="No submissions yet."
              action={
                <Link
                  href="/submit"
                  className="text-sm font-medium text-accent-primary hover:underline"
                >
                  Submit a set
                </Link>
              }
            />
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col gap-1.5 rounded-lg bg-bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={sub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-text-primary hover:text-accent-primary"
                  >
                    {sub.title || sub.url}
                  </a>
                  <SubmissionBadge
                    status={sub.status}
                    matchedSet={sub.matchedSet}
                    rejectionReason={sub.rejection_reason}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-text-tertiary">
                  {sub.artist_name && <span>{sub.artist_name}</span>}
                  <span>{formatRelativeDate(sub.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionBadge({
  status,
  matchedSet,
  rejectionReason,
}: {
  status: string;
  matchedSet: { slug: string; title: string } | null;
  rejectionReason: string | null;
}) {
  if (status === "approved" && matchedSet) {
    return (
      <Link
        href={`/sets/${matchedSet.slug}`}
        className="shrink-0 rounded-full bg-accent-positive/15 px-2.5 py-0.5 text-xs font-medium text-accent-positive hover:bg-accent-positive/25"
      >
        Approved
      </Link>
    );
  }
  if (status === "rejected") {
    return (
      <span
        className="shrink-0 rounded-full bg-accent-negative/15 px-2.5 py-0.5 text-xs font-medium text-accent-negative"
        title={rejectionReason || undefined}
      >
        Rejected
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-accent-warm/15 px-2.5 py-0.5 text-xs font-medium text-accent-warm">
      Pending
    </span>
  );
}

function CreateCollectionButton() {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const { createCollection } = await import("@/lib/actions/library");
        const name = formData.get("name") as string;
        if (name?.trim()) await createCollection(name.trim());
      }}
      className="flex gap-2"
    >
      <input
        name="name"
        type="text"
        placeholder="New collection name"
        className="flex-1 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />
      <button
        type="submit"
        className="flex items-center gap-1 rounded-lg bg-bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
      >
        <Plus className="h-4 w-4" />
        Create
      </button>
    </form>
  );
}
