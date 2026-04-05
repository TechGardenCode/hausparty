import { slugify } from "@/lib/utils";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq, sql, ne } from "drizzle-orm";

export interface MatchResult {
  artistId: string;
  confidence: "exact" | "alias" | "fuzzy";
  similarity?: number;
}

/**
 * Three-tier artist matching pipeline:
 * 1. Slug match — slugify(name) against artists.slug
 * 2. Alias match — case-insensitive check against artists.aliases array
 * 3. Trigram similarity — similarity(name, ?) > 0.6 using existing GIN index
 */
export async function matchArtist(name: string): Promise<MatchResult | null> {
  // Tier 1: Slug match
  const slug = slugify(name);
  const [slugMatch] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.slug, slug))
    .limit(1);

  if (slugMatch) {
    return { artistId: slugMatch.id, confidence: "exact" };
  }

  // Tier 2: Alias match — case-insensitive array containment
  const nameLower = name.toLowerCase();
  const aliasRows = await db
    .select({ id: artists.id, aliases: artists.aliases })
    .from(artists)
    .where(ne(artists.aliases, sql`'{}'`));

  for (const artist of aliasRows) {
    if (!artist.aliases) continue;
    const match = artist.aliases.some(
      (alias) => alias.toLowerCase() === nameLower
    );
    if (match) {
      return { artistId: artist.id, confidence: "alias" };
    }
  }

  // Tier 3: Trigram similarity via RPC
  const fuzzyMatches = await db.execute<{
    artist_id: string;
    artist_name: string;
    sim: number;
  }>(sql`SELECT * FROM find_similar_artists_by_name(${name}, 0.6)`);

  if (fuzzyMatches.length > 0) {
    const best = fuzzyMatches[0];
    return {
      artistId: best.artist_id,
      confidence: "fuzzy",
      similarity: best.sim,
    };
  }

  return null;
}

/**
 * Find or create an artist using the three-tier matching pipeline.
 *
 * - Auto-accepts fuzzy matches >= 0.85 (near-certain: casing, minor punctuation)
 * - Creates new artist for anything below 0.85
 */
export async function findOrCreateArtist(
  name: string
): Promise<{ artistId: string; action: "matched" | "created" }> {
  const match = await matchArtist(name);

  if (match) {
    if (match.confidence === "exact" || match.confidence === "alias") {
      return { artistId: match.artistId, action: "matched" };
    }
    if (match.confidence === "fuzzy" && match.similarity && match.similarity >= 0.85) {
      return { artistId: match.artistId, action: "matched" };
    }
  }

  const slug = slugify(name);

  try {
    const [newArtist] = await db
      .insert(artists)
      .values({ name, slug })
      .returning({ id: artists.id });
    return { artistId: newArtist.id, action: "created" };
  } catch {
    // Slug collision — append a random suffix
    const fallbackSlug = `${slug}-${Date.now().toString(36)}`;
    const [retryArtist] = await db
      .insert(artists)
      .values({ name, slug: fallbackSlug })
      .returning({ id: artists.id });
    return { artistId: retryArtist.id, action: "created" };
  }
}
