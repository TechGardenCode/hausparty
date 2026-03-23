import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

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
export async function matchArtist(
  supabase: AdminClient,
  name: string
): Promise<MatchResult | null> {
  // Tier 1: Slug match
  const slug = slugify(name);
  const { data: slugMatch } = await supabase
    .from("artists")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugMatch) {
    return { artistId: slugMatch.id, confidence: "exact" };
  }

  // Tier 2: Alias match — case-insensitive array containment
  // Uses the GIN index on aliases column
  const nameLower = name.toLowerCase();
  const aliasResult = await supabase
    .from("artists")
    .select("id, aliases")
    .not("aliases", "eq", "{}");

  const aliasMatches = aliasResult.data;
  if (aliasMatches && Array.isArray(aliasMatches)) {
    for (const artist of aliasMatches) {
      if (!artist.aliases) continue;
      const match = (artist.aliases as string[]).some(
        (alias) => alias.toLowerCase() === nameLower
      );
      if (match) {
        return { artistId: artist.id, confidence: "alias" };
      }
    }
  }

  // Tier 3: Trigram similarity via RPC
  // Uses existing idx_artists_name_trgm GIN index
  const { data: fuzzyMatches } = await supabase.rpc("find_similar_artists_by_name", {
    search_name: name,
    similarity_threshold: 0.6,
  });

  if (fuzzyMatches && fuzzyMatches.length > 0) {
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
  supabase: AdminClient,
  name: string
): Promise<{ artistId: string; action: "matched" | "created" }> {
  const match = await matchArtist(supabase, name);

  if (match) {
    // Exact and alias matches are always accepted
    if (match.confidence === "exact" || match.confidence === "alias") {
      return { artistId: match.artistId, action: "matched" };
    }

    // Fuzzy matches: only auto-accept if similarity >= 0.85
    if (match.confidence === "fuzzy" && match.similarity && match.similarity >= 0.85) {
      return { artistId: match.artistId, action: "matched" };
    }
  }

  // No match or low-confidence fuzzy match: create new artist
  const slug = slugify(name);

  // Handle slug collision (different name but same slug is unlikely but possible)
  const { data: newArtist, error } = await supabase
    .from("artists")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error) {
    // Slug collision — append a random suffix
    const fallbackSlug = `${slug}-${Date.now().toString(36)}`;
    const { data: retryArtist, error: retryError } = await supabase
      .from("artists")
      .insert({ name, slug: fallbackSlug })
      .select("id")
      .single();

    if (retryError || !retryArtist) {
      throw new Error(`Failed to create artist "${name}": ${retryError?.message}`);
    }
    return { artistId: retryArtist.id, action: "created" };
  }

  return { artistId: newArtist.id, action: "created" };
}
