import { db } from "@/lib/db";
import { artists, setArtists } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

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

export async function getArtistSetCount(artistId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(setArtists)
    .where(eq(setArtists.artistId, artistId));

  return result?.count ?? 0;
}
