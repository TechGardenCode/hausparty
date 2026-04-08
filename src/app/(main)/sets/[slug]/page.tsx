import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Clock } from "lucide-react";
import { getSetBySlug, getSetsByArtist, getSetsByEvent } from "@/lib/queries/sets";
import { isSetSaved, getCollectionsWithSetStatus } from "@/lib/queries/library";
import { getUserSettings } from "@/lib/queries/user";
import { auth } from "@/lib/auth";
import { formatDuration } from "@/lib/utils";
import { SourceSwitcher } from "@/components/source-switcher";
import { Tracklist } from "@/components/tracklist";
import { SaveButton } from "@/components/save-button";
import { CollectionPicker } from "@/components/collection-picker";
import { ShareButton } from "@/components/share-button";
import { GenreChip } from "@/components/genre-chip";
import { SetRow } from "@/components/set-row";
import { ReportButton } from "@/components/report-button";
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
  const artistNames = set.artists.map((a: { name: string }) => a.name).join(", ");
  const title = `${artistNames} — ${set.event?.name || set.title} | hausparty`;
  const description = `Watch ${artistNames} live at ${set.event?.name || ""}. ${formatDuration(set.duration_seconds)} set.`;
  const images = set.thumbnailUrl ? [{ url: set.thumbnailUrl, width: 320, height: 180 }] : [];
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "music.song",
      url: `https://hausparty.app/sets/${slug}`,
      siteName: "hausparty",
      ...(images.length > 0 && { images }),
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      ...(images.length > 0 && { images: [images[0].url] }),
    },
  };
}

export default async function SetDetailPage({ params }: Props) {
  const { slug } = await params;
  const set = await getSetBySlug(slug);
  if (!set) notFound();

  const session = await auth();
  const user = session?.user ?? null;

  const [saved, collections, settings] = await Promise.all([
    user?.id ? isSetSaved(user.id, set.id) : false,
    user?.id ? getCollectionsWithSetStatus(user.id, set.id) : [],
    user?.id ? getUserSettings(user.id) : { autoplay: false },
  ]);

  const firstArtist = set.artists[0];
  const [moreFromArtist, moreFromEvent] = await Promise.all([
    firstArtist ? getSetsByArtist(firstArtist.id) : [],
    set.event ? getSetsByEvent(set.event.id) : [],
  ]);

  const relatedArtistSets = moreFromArtist.filter((s) => s.id !== set.id);
  const relatedEventSets = moreFromEvent.filter((s) => s.id !== set.id);

  const artistNames = set.artists.map((a: { name: string }) => a.name).join(", ");

  return (
    <div className="flex flex-col gap-5">
      {/* Player */}
      <SourceSwitcher
        sources={set.sources as Source[]}
        setSlug={slug}
        setTitle={`${artistNames} — ${set.event?.name || set.title}`}
        thumbnailUrl={set.thumbnailUrl}
        autoplay={settings.autoplay}
      />

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">
              {set.artists.map((a: { slug: string; name: string }, i: number, arr: { slug: string; name: string }[]) => (
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
                className="text-sm text-text-secondary hover:text-accent-primary transition-colors"
              >
                {set.event.name}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 gap-y-2">
            <SaveButton setId={set.id} initialSaved={saved} isAuthenticated={!!user} />
            {user && (
              <CollectionPicker setId={set.id} initialCollections={collections} />
            )}
            <ShareButton
              title={`${artistNames} — ${set.event?.name || set.title}`}
              text={`${artistNames} live at ${set.event?.name || ""}. Listen on hausparty.`}
              url={`https://hausparty.app/sets/${slug}`}
            />
            <ReportButton setId={set.id} isAuthenticated={!!user} />
          </div>
        </div>

        {/* Meta + genres */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-tertiary">
          {set.performed_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(set.performed_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {set.stage && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {set.stage}
            </span>
          )}
          {set.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(set.duration_seconds)}
            </span>
          )}
          {set.genres.length > 0 && (
            <>
              <span className="text-text-tertiary/30">·</span>
              {set.genres.map((g: { id: string; name: string; slug: string }) => (
                <GenreChip key={g.id} name={g.name} slug={g.slug} />
              ))}
            </>
          )}
        </div>

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
                artistNames={s.artists.map((a: { name: string }) => a.name)}
                eventName={s.event?.name || null}
                durationSeconds={s.duration_seconds}
                genreNames={s.genres.map((g: { name: string }) => g.name)}
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
                artistNames={s.artists.map((a: { name: string }) => a.name)}
                eventName={s.event?.name || null}
                durationSeconds={s.duration_seconds}
                genreNames={s.genres.map((g: { name: string }) => g.name)}
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
