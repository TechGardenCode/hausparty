import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminStats() {
  const supabase = createAdminClient();

  const [setsResult, artistsResult, pendingResult, noGenreResult, noEventResult] =
    await Promise.all([
      supabase.from("sets").select("id", { count: "exact", head: true }),
      supabase.from("artists").select("id", { count: "exact", head: true }),
      supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("sets")
        .select("id, set_genres(genre_id)"),
      supabase
        .from("sets")
        .select("id", { count: "exact", head: true })
        .is("event_id", null),
    ]);

  // For "sets without genres", we need to count sets that have zero genre joins
  // The above left-join approach returns all sets; filter those with no genres
  const setsWithoutGenres = (noGenreResult.data ?? []).filter(
    (s) => !s.set_genres || s.set_genres.length === 0
  ).length;

  return {
    totalSets: setsResult.count ?? 0,
    totalArtists: artistsResult.count ?? 0,
    pendingSubmissions: pendingResult.count ?? 0,
    setsWithoutGenres,
    setsWithoutEvents: noEventResult.count ?? 0,
  };
}

export async function getSubmissions(filters?: { status?: string }) {
  const supabase = createAdminClient();

  let query = supabase
    .from("submissions")
    .select(
      "id, url, artist_name, title, status, rejection_reason, matched_set_id, created_at, processed_at, user_id, sets!matched_set_id(slug, title)"
    )
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status as "pending" | "approved" | "rejected");
  }

  const { data } = await query;

  return (data ?? []).map((s) => ({
    ...s,
    matchedSet: s.sets ?? null,
  }));
}

export async function getAdminSets(page: number, pageSize: number) {
  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("sets")
    .select(
      `
      id, title, slug, created_at, performed_at,
      set_artists(position, artists(id, name, slug)),
      set_genres(genres(id, name, slug)),
      events(id, name, slug),
      sources(id)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    sets: (data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      created_at: s.created_at,
      performed_at: s.performed_at,
      artists: (s.set_artists ?? [])
        .sort((a, b) => a.position - b.position)
        .map((sa) => sa.artists)
        .filter((a): a is NonNullable<typeof a> => a !== null),
      genres: (s.set_genres ?? [])
        .map((sg) => sg.genres)
        .filter((g): g is NonNullable<typeof g> => g !== null),
      event: s.events,
      sourceCount: s.sources?.length ?? 0,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getScraperRuns(scraperName?: string, limit = 20) {
  const supabase = createAdminClient();

  let query = supabase
    .from("scraper_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (scraperName) {
    query = query.eq("scraper_name", scraperName);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getScraperOverview() {
  const supabase = createAdminClient();

  // Get latest run per scraper (limit to recent runs to avoid unbounded scan)
  const { data: runs } = await supabase
    .from("scraper_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  // Get entity counts per scraper using count-only select grouped client-side
  // (Supabase JS doesn't support GROUP BY, so we select minimal columns with a limit)
  const { data: entityCounts } = await supabase
    .from("scraper_entity_map")
    .select("scraper_name, entity_type")
    .limit(10000);

  // Group by scraper
  const scraperMap = new Map<
    string,
    {
      lastRun: NonNullable<typeof runs>[number] | null;
      entityCounts: { artists: number; events: number; festivals: number };
    }
  >();

  for (const run of runs ?? []) {
    if (!scraperMap.has(run.scraper_name)) {
      scraperMap.set(run.scraper_name, {
        lastRun: run,
        entityCounts: { artists: 0, events: 0, festivals: 0 },
      });
    }
  }

  for (const entity of entityCounts ?? []) {
    let entry = scraperMap.get(entity.scraper_name);
    if (!entry) {
      entry = {
        lastRun: null,
        entityCounts: { artists: 0, events: 0, festivals: 0 },
      };
      scraperMap.set(entity.scraper_name, entry);
    }
    if (entity.entity_type === "artist") entry.entityCounts.artists++;
    else if (entity.entity_type === "event") entry.entityCounts.events++;
    else if (entity.entity_type === "festival") entry.entityCounts.festivals++;
  }

  return Object.fromEntries(scraperMap);
}

export async function getLastScraperRun() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("scraper_runs")
    .select("scraper_name, status, started_at, completed_at, stats")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getSetForEdit(setId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sets")
    .select(
      `
      id, title, slug, performed_at, duration_seconds, stage, event_id,
      set_artists(position, artists(id, name, slug)),
      set_genres(genres(id, name, slug)),
      events(id, name, slug, festival_id, festivals(id, name, slug), stages),
      sources(id, url, platform)
    `
    )
    .eq("id", setId)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    artists: (data.set_artists ?? [])
      .sort((a, b) => a.position - b.position)
      .map((sa) => sa.artists)
      .filter((a): a is NonNullable<typeof a> => a !== null),
    genres: (data.set_genres ?? [])
      .map((sg) => sg.genres)
      .filter((g): g is NonNullable<typeof g> => g !== null),
    event: data.events,
    sources: data.sources ?? [],
  };
}

export async function searchEvents(query: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("events")
    .select("id, name, slug, date_start, festivals(id, name, slug)")
    .ilike("name", `%${query}%`)
    .order("date_start", { ascending: false, nullsFirst: false })
    .limit(20);

  return data ?? [];
}

export async function getAllGenres() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("genres")
    .select("id, name, slug")
    .order("name");

  return data ?? [];
}

export async function getGenreSuggestionsForArtists(artistIds: string[]) {
  if (artistIds.length === 0) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("artist_genres")
    .select("genre_id, genres(id, name, slug)")
    .in("artist_id", artistIds);

  if (!data) return [];

  // Count frequency and deduplicate
  const genreMap = new Map<string, { genre: NonNullable<(typeof data)[number]["genres"]>; count: number }>();
  for (const row of data) {
    if (!row.genres) continue;
    const existing = genreMap.get(row.genres.id);
    if (existing) {
      existing.count++;
    } else {
      genreMap.set(row.genres.id, { genre: row.genres, count: 1 });
    }
  }

  // Sort by frequency (most common first)
  return Array.from(genreMap.values())
    .sort((a, b) => b.count - a.count)
    .map((entry) => entry.genre);
}

export async function searchArtists(query: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("artists")
    .select("id, name, slug")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(20);

  return data ?? [];
}

export async function searchFestivals(query: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("festivals")
    .select("id, name, slug")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(20);

  return data ?? [];
}

export async function getArtistWithSets(artistId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("artists")
    .select(
      `
      id, name, slug, aliases,
      set_artists(sets(id, title, slug)),
      artist_genres(genres(id, name, slug))
    `
    )
    .eq("id", artistId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    aliases: data.aliases ?? [],
    sets: (data.set_artists ?? [])
      .map((sa) => sa.sets)
      .filter((s): s is NonNullable<typeof s> => s !== null),
    genres: (data.artist_genres ?? [])
      .map((ag) => ag.genres)
      .filter((g): g is NonNullable<typeof g> => g !== null),
  };
}

export async function getAdminArtists(page: number, pageSize: number) {
  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("artists")
    .select(
      `
      id, name, slug, created_at,
      set_artists(set_id),
      artist_genres(genres(id, name, slug))
    `,
      { count: "exact" }
    )
    .order("name")
    .range(from, to);

  const artists = (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    created_at: a.created_at,
    setCount: a.set_artists?.length ?? 0,
    genres: (a.artist_genres ?? [])
      .map((ag) => ag.genres)
      .filter((g): g is NonNullable<typeof g> => g !== null),
  }));

  // Simple similar-slug flagging: group by first 5 chars of slug
  const slugPrefixes = new Map<string, string[]>();
  for (const a of artists) {
    const prefix = a.slug.slice(0, 5);
    const existing = slugPrefixes.get(prefix) ?? [];
    existing.push(a.slug);
    slugPrefixes.set(prefix, existing);
  }

  const duplicateSlugs = new Set<string>();
  for (const slugs of slugPrefixes.values()) {
    if (slugs.length > 1) {
      for (const s of slugs) duplicateSlugs.add(s);
    }
  }

  return {
    artists: artists.map((a) => ({
      ...a,
      hasSimilarSlug: duplicateSlugs.has(a.slug),
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}
