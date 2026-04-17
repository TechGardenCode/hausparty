import { db } from "@/lib/db";
import { artists, setArtists } from "@/lib/db/schema";
import { eq, count, ilike } from "drizzle-orm";

export async function getArtistBySlug(slug: string) {
  const data = await db.query.artists.findFirst({
    where: eq(artists.slug, slug),
    with: {
      artistGenres: { with: { genre: true } },
    },
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    aliases: data.aliases,
    image_url: data.imageUrl,
    bio: data.bio,
    socials: data.socials,
    genres: (data.artistGenres || [])
      .map((ag) => ag.genre)
      .filter((g): g is NonNullable<typeof g> => g !== null),
  };
}

/**
 * Get paginated artists with set counts for the browse page.
 * Only returns artists that have at least one published set.
 */
export async function getBrowseArtists(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 30;
  const offset = (page - 1) * pageSize;

  const searchFilter = options?.search
    ? ilike(artists.name, `%${options.search}%`)
    : undefined;

  // Get artists with published set count > 0
  const data = await db.query.artists.findMany({
    where: searchFilter,
    with: {
      artistGenres: { with: { genre: true } },
      setArtists: {
        with: { set: true },
      },
    },
    orderBy: [artists.name],
    limit: pageSize,
    offset,
  });

  // Count total for pagination
  const [totalResult] = await db
    .select({ count: count() })
    .from(artists)
    .where(searchFilter);

  return {
    artists: data.map((a) => {
      const publishedSets = (a.setArtists ?? [])
        .filter((sa) => sa.set && sa.set.status === "published");
      return {
        id: a.id,
        name: a.name,
        slug: a.slug,
        imageUrl: a.imageUrl,
        setCount: publishedSets.length,
        genres: (a.artistGenres ?? [])
          .map((ag) => ag.genre)
          .filter((g): g is NonNullable<typeof g> => g !== null)
          .slice(0, 3),
      };
    }),
    total: totalResult?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getArtistSetCount(artistId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(setArtists)
    .where(eq(setArtists.artistId, artistId));

  return result?.count ?? 0;
}
