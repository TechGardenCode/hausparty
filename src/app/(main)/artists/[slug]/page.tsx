import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Disc } from "lucide-react";
import { getArtistBySlug, getArtistSetCount } from "@/lib/queries/artists";
import { getSetsByArtist } from "@/lib/queries/sets";
import { isFollowing } from "@/lib/queries/library";
import { auth } from "@/lib/auth";
import { GenreChip } from "@/components/genre-chip";
import { FollowButton } from "@/components/follow-button";
import { ShareButton } from "@/components/share-button";
import { SetRow } from "@/components/set-row";
import { EmptyState } from "@/components/empty-state";
import { absoluteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return {};
  const title = `${artist.name} — DJ Sets | hausparty`;
  const description =
    artist.bio || `Explore live DJ sets by ${artist.name} on hausparty.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: absoluteUrl(`/artists/${slug}`),
      siteName: "hausparty",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  const [setCount, sets] = await Promise.all([
    getArtistSetCount(artist.id),
    getSetsByArtist(artist.id),
  ]);

  const session = await auth();
  const user = session?.user ?? null;

  const following = user?.id
    ? await isFollowing(user.id, "artist", artist.id)
    : false;

  const initials = artist.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Group sets by year
  const setsByYear: Record<string, typeof sets> = {};
  for (const set of sets) {
    const year = set.performed_at
      ? new Date(set.performed_at).getFullYear().toString()
      : "Unknown";
    if (!setsByYear[year]) setsByYear[year] = [];
    setsByYear[year].push(set);
  }
  const years = Object.keys(setsByYear).sort((a, b) => b.localeCompare(a));

  const socials = artist.socials as Record<string, string>;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-surface">
          {artist.image_url ? (
            <Image
              src={artist.image_url}
              alt={artist.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-2xl font-bold text-text-tertiary">
              {initials}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <h1 className="text-2xl font-bold">{artist.name}</h1>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {artist.genres.map((g) => (
                <GenreChip key={g.id} name={g.name} slug={g.slug} />
              ))}
            </div>
            <span className="text-sm text-text-secondary">
              {setCount} {setCount === 1 ? "set" : "sets"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <FollowButton
              targetType="artist"
              targetId={artist.id}
              initialFollowing={following}
              isAuthenticated={!!user}
            />
            <ShareButton
              title={`${artist.name} — hausparty`}
              text={`Check out ${artist.name} on hausparty.`}
              url={absoluteUrl(`/artists/${slug}`)}
            />
            {Object.entries(socials).map(([platform, handle]) => (
              <a
                key={platform}
                href={
                  platform === "instagram"
                    ? `https://instagram.com/${handle}`
                    : platform === "soundcloud"
                      ? `https://soundcloud.com/${handle}`
                      : `https://${platform}.com/${handle}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
              >
                <ExternalLink className="h-3 w-3" />
                {platform}
              </a>
            ))}
          </div>
          {artist.bio && (
            <p className="text-sm text-text-secondary">{artist.bio}</p>
          )}
        </div>
      </div>

      {/* Sets by year */}
      {years.length === 0 ? (
        <EmptyState
          icon={Disc}
          message="No sets available for this artist yet."
          action={
            <Link
              href="/submit"
              className="text-sm font-medium text-accent-primary hover:underline"
            >
              Know a set? Submit it
            </Link>
          }
        />
      ) : (
        years.map((year) => (
          <section key={year} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-text-primary">{year}</h2>
            <div className="flex flex-col">
              {setsByYear[year].map((set) => (
                  <SetRow
                    key={set.id}
                    slug={set.slug}
                    artistNames={set.artists.map((a: { name: string }) => a.name)}
                    eventName={set.event?.name || null}
                    durationSeconds={set.duration_seconds}
                    genreNames={set.genres.map((g: { name: string }) => g.name)}
                    platform={set.sources[0]?.platform}
                    sourceCount={set.sources.length}
                    thumbnailUrl={set.thumbnailUrl}
                  />
                )
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
