import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Disc, Filter } from "lucide-react";
import {
  getFestivalBySlug,
  getFestivalEvents,
  getFestivalSetCount,
} from "@/lib/queries/festivals";
import { getSetsByEvent } from "@/lib/queries/sets";
import { isFollowing } from "@/lib/queries/library";
import { auth } from "@/lib/auth";
import { FollowButton } from "@/components/follow-button";
import { ShareButton } from "@/components/share-button";
import { SetRow } from "@/components/set-row";
import { GenreChip } from "@/components/genre-chip";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edition?: string; stage?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const festival = await getFestivalBySlug(slug);
  if (!festival) return {};
  const title = `${festival.name} — DJ Sets | hausparty`;
  const description =
    festival.description ||
    `Explore live DJ sets from ${festival.name} on hausparty.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://hausparty.app/festivals/${slug}`,
      siteName: "hausparty",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function FestivalPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { edition, stage } = await searchParams;
  const festival = await getFestivalBySlug(slug);
  if (!festival) notFound();

  const [setCount, events] = await Promise.all([
    getFestivalSetCount(festival.id),
    getFestivalEvents(festival.id),
  ]);

  const session = await auth();
  const user = session?.user ?? null;

  const following = user?.id
    ? await isFollowing(user.id, "festival", festival.id)
    : false;

  // Pick selected edition or latest
  const selectedEvent = edition
    ? events.find((e) => e.slug === edition)
    : events[0];

  const sets = selectedEvent ? await getSetsByEvent(selectedEvent.id) : [];

  // Get unique stages from the selected event
  const stages = selectedEvent?.stages || [];

  // Filter by stage if specified
  const filteredSets = stage
    ? sets.filter((s) => s.stage === stage)
    : sets;

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="relative h-48 overflow-hidden rounded-xl bg-bg-surface sm:h-64">
        {festival.image_url && (
          <Image
            src={festival.image_url}
            alt={festival.name}
            fill
            className="object-cover"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 to-transparent" />
        <div className="absolute bottom-0 left-0 flex w-full items-end justify-between p-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">{festival.name}</h1>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span>
                {setCount} {setCount === 1 ? "set" : "sets"}
              </span>
              {selectedEvent?.location && <span>{selectedEvent.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FollowButton
              targetType="festival"
              targetId={festival.id}
              initialFollowing={following}
              isAuthenticated={!!user}
            />
            <ShareButton
              title={`${festival.name} — hausparty`}
              text={`Check out sets from ${festival.name} on hausparty.`}
              url={`https://hausparty.app/festivals/${slug}`}
            />
          </div>
        </div>
      </div>

      {/* Genre chips */}
      {festival.genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {festival.genres.map(
            (g) => (
              <GenreChip key={g.id} name={g.name} slug={g.slug} />
            )
          )}
        </div>
      )}

      {/* Edition selector */}
      {events.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {events.map((event) => (
            <a
              key={event.id}
              href={`/festivals/${slug}?edition=${event.slug}${stage ? `&stage=${stage}` : ""}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                event.slug === (selectedEvent?.slug || events[0]?.slug)
                  ? "bg-accent-primary text-bg-primary"
                  : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
              }`}
            >
              {event.name}
            </a>
          ))}
        </div>
      )}

      {/* Stage filter */}
      {stages.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <a
            href={`/festivals/${slug}${edition ? `?edition=${edition}` : ""}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              !stage
                ? "bg-accent-primary text-bg-primary"
                : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover"
            }`}
          >
            All stages
          </a>
          {stages.map((s) => (
            <a
              key={s}
              href={`/festivals/${slug}?${edition ? `edition=${edition}&` : ""}stage=${encodeURIComponent(s)}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                stage === s
                  ? "bg-accent-primary text-bg-primary"
                  : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover"
              }`}
            >
              {s}
            </a>
          ))}
        </div>
      )}

      {/* Sets */}
      {filteredSets.length === 0 && sets.length > 0 ? (
        <EmptyState
          icon={Filter}
          message="No sets on this stage."
        />
      ) : filteredSets.length === 0 ? (
        <EmptyState
          icon={Disc}
          message="No sets from this edition yet."
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
        <div className="flex flex-col">
          {filteredSets.map((set) => (
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
      )}
    </div>
  );
}
