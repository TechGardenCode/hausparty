import { notFound } from "next/navigation";
import Link from "next/link";
import { Disc } from "lucide-react";
import { getGenreBySlug } from "@/lib/queries/genres";
import { getSetsByGenre } from "@/lib/queries/sets";
import { isFollowing } from "@/lib/queries/library";
import { auth } from "@/lib/auth";
import { SetRow } from "@/components/set-row";
import { FollowButton } from "@/components/follow-button";
import { ShareButton } from "@/components/share-button";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { absoluteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return {};
  const title = `${genre.name} DJ Sets | hausparty`;
  const description = `Explore live ${genre.name} DJ sets on hausparty.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: absoluteUrl(`/genres/${slug}`),
      siteName: "hausparty",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function GenreDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const genre = await getGenreBySlug(slug);
  if (!genre) notFound();

  const page = Math.max(1, parseInt(pageStr || "1", 10));
  const { sets, total, perPage } = await getSetsByGenre(genre.id, page);
  const totalPages = Math.ceil(total / perPage);

  const session = await auth();
  const user = session?.user ?? null;

  const following = user?.id
    ? await isFollowing(user.id, "genre", genre.id)
    : false;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{genre.name}</h1>
        <div className="flex items-center gap-3">
          <FollowButton
            targetType="genre"
            targetId={genre.id}
            initialFollowing={following}
            isAuthenticated={!!user}
          />
          <ShareButton
            title={`${genre.name} DJ Sets — hausparty`}
            text={`Explore live ${genre.name} DJ sets on hausparty.`}
            url={absoluteUrl(`/genres/${slug}`)}
          />
        </div>
      </div>
      {sets.length === 0 ? (
        <EmptyState
          icon={Disc}
          message="No sets in this genre yet."
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
          {sets.map((set) => (
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
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseHref={`/genres/${slug}`}
        />
      )}
    </div>
  );
}
