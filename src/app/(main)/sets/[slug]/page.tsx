import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Clock } from "lucide-react";
import { getSetBySlug, getSetsByArtist, getSetsByEvent } from "@/lib/queries/sets";
import { isSetSaved, getCollectionsWithSetStatus } from "@/lib/queries/library";
import { getUserSettings } from "@/lib/queries/user";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";
import { SourceSwitcher } from "@/components/source-switcher";
import { Tracklist } from "@/components/tracklist";
import { SaveButton } from "@/components/save-button";
import { CollectionPicker } from "@/components/collection-picker";
import { ShareButton } from "@/components/share-button";
import { GenreChip } from "@/components/genre-chip";
import { SetRow } from "@/components/set-row";
import { SectionHeader } from "@/components/section-header";
import type { Source } from "@/lib/types/database";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const set = await getSetBySlug(slug);
  if (!set) return {};
  const artistNames = set.artists.map((a) => a.name).join(", ");
  const title = `${artistNames} — ${set.event?.name || set.title} | hausparty`;
  const description = `Watch ${artistNames} live at ${set.event?.name || ""}. ${formatDuration(set.duration_seconds)} set.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "music.song",
      url: `https://hausparty.app/sets/${slug}`,
      siteName: "hausparty",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function SetDetailPage({ params }: Props) {
  const { slug } = await params;
  const set = await getSetBySlug(slug);
  if (!set) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [saved, collections, settings] = await Promise.all([
    user ? isSetSaved(user.id, set.id) : false,
    user ? getCollectionsWithSetStatus(user.id, set.id) : [],
    user ? getUserSettings(user.id) : { autoplay: false },
  ]);

  const firstArtist = set.artists[0];
  const [moreFromArtist, moreFromEvent] = await Promise.all([
    firstArtist ? getSetsByArtist(firstArtist.id) : [],
    set.event ? getSetsByEvent(set.event.id) : [],
  ]);

  const relatedArtistSets = moreFromArtist.filter((s) => s.id !== set.id);
  const relatedEventSets = moreFromEvent.filter((s) => s.id !== set.id);

  const artistNames = set.artists.map((a) => a.name).join(", ");

  return (
    <div className="flex flex-col gap-8">
      {/* Player */}
      <SourceSwitcher
        sources={set.sources as Source[]}
        setSlug={slug}
        setTitle={`${artistNames} — ${set.event?.name || set.title}`}
        thumbnailUrl={set.thumbnailUrl}
        autoplay={settings.autoplay}
      />

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">
              {set.artists.map((a, i, arr) => (
                <span key={a.slug}>
                  <Link
                    href={`/artists/${a.slug}`}
                    className="hover:text-accent-primary transition-colors"
                  >
                    {a.name}
                  </Link>
                  {i < arr.length - 1 && ", "}
                </span>
              ))}
            </h1>
            {set.event && (
              <Link
                href={
                  set.festival
                    ? `/festivals/${set.festival.slug}`
                    : "#"
                }
                className="text-text-secondary hover:text-accent-primary transition-colors"
              >
                {set.event.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SaveButton setId={set.id} initialSaved={saved} isAuthenticated={!!user} />
            {user && (
              <CollectionPicker setId={set.id} initialCollections={collections} />
            )}
            <ShareButton
              title={`${artistNames} — ${set.event?.name || set.title}`}
              text={`${artistNames} live at ${set.event?.name || ""}. Listen on hausparty.`}
              url={`https://hausparty.app/sets/${slug}`}
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
          {set.performed_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(set.performed_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {set.stage && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {set.stage}
            </span>
          )}
          {set.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(set.duration_seconds)}
            </span>
          )}
        </div>

        {/* Genre chips */}
        {set.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {set.genres.map((g) => (
              <GenreChip key={g.id} name={g.name} slug={g.slug} />
            ))}
          </div>
        )}
      </div>

      {/* Tracklist */}
      {set.tracklist && set.tracklist.length > 0 && (
        <Tracklist tracks={set.tracklist} />
      )}

      {/* More from artist */}
      {relatedArtistSets.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title={`More from ${artistNames}`}
            href={firstArtist ? `/artists/${firstArtist.slug}` : undefined}
          />
          <div className="flex flex-col">
            {relatedArtistSets.slice(0, 5).map((s) => (
              <SetRow
                key={s.id}
                slug={s.slug}
                artistNames={s.artists.map((a) => a.name)}
                eventName={s.event?.name || null}
                durationSeconds={s.duration_seconds}
                genreNames={s.genres.map((g) => g.name)}
                platform={s.sources[0]?.platform}
                sourceCount={s.sources.length}
                thumbnailUrl={s.thumbnailUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* More from event */}
      {relatedEventSets.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title={`More from ${set.event?.name}`} />
          <div className="flex flex-col">
            {relatedEventSets.slice(0, 5).map((s) => (
              <SetRow
                key={s.id}
                slug={s.slug}
                artistNames={s.artists.map((a) => a.name)}
                eventName={s.event?.name || null}
                durationSeconds={s.duration_seconds}
                genreNames={s.genres.map((g) => g.name)}
                platform={s.sources[0]?.platform}
                sourceCount={s.sources.length}
                thumbnailUrl={s.thumbnailUrl}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
