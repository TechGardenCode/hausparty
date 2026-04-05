import { db } from "@/lib/db";
import {
  sets,
  artists,
  genres,
  festivals,
  events,
  submissions,
  setGenres,
  artistGenres,
  scraperRuns,
  scraperEntityMap,
} from "@/lib/db/schema";
import { eq, desc, ilike, inArray, count, isNull } from "drizzle-orm";

export async function getAdminStats() {
  const [setsResult, artistsResult, pendingResult, noEventResult, draftResult] =
    await Promise.all([
      db.select({ count: count() }).from(sets),
      db.select({ count: count() }).from(artists),
      db
        .select({ count: count() })
        .from(submissions)
        .where(eq(submissions.status, "pending")),
      db
        .select({ count: count() })
        .from(sets)
        .where(isNull(sets.eventId)),
      db
        .select({ count: count() })
        .from(sets)
        .where(eq(sets.status, "draft")),
    ]);

  // Sets without genres: count sets that have zero genre joins
  const setsWithGenres = await db
    .select({ setId: setGenres.setId })
    .from(setGenres)
    .groupBy(setGenres.setId);

  const totalSets = setsResult[0]?.count ?? 0;
  const setsWithoutGenres = totalSets - setsWithGenres.length;

  return {
    totalSets,
    totalArtists: artistsResult[0]?.count ?? 0,
    pendingSubmissions: pendingResult[0]?.count ?? 0,
    setsWithoutGenres: Math.max(0, setsWithoutGenres),
    setsWithoutEvents: noEventResult[0]?.count ?? 0,
    draftSets: draftResult[0]?.count ?? 0,
  };
}

export async function getSubmissions(filters?: { status?: string }) {
  const whereClause =
    filters?.status && filters.status !== "all"
      ? eq(submissions.status, filters.status as "pending" | "approved" | "rejected")
      : undefined;

  const data = await db.query.submissions.findMany({
    where: whereClause,
    with: {
      matchedSet: true,
    },
    orderBy: [desc(submissions.createdAt)],
  });

  return data.map((s) => ({
    id: s.id,
    url: s.url,
    artist_name: s.artistName,
    title: s.title,
    status: s.status,
    rejection_reason: s.rejectionReason,
    matched_set_id: s.matchedSetId,
    created_at: s.createdAt,
    processed_at: s.processedAt,
    user_id: s.userId,
    matchedSet: s.matchedSet
      ? { slug: s.matchedSet.slug, title: s.matchedSet.title }
      : null,
  }));
}

export async function getAdminSets(
  page: number,
  pageSize: number,
  statusFilter?: "draft" | "published"
) {
  const offset = (page - 1) * pageSize;

  const whereClause = statusFilter ? eq(sets.status, statusFilter) : undefined;

  const [totalResult] = await db
    .select({ count: count() })
    .from(sets)
    .where(whereClause);

  const data = await db.query.sets.findMany({
    where: whereClause,
    with: {
      setArtists: { with: { artist: true } },
      setGenres: { with: { genre: true } },
      event: true,
      sources: true,
    },
    orderBy: [desc(sets.createdAt)],
    limit: pageSize,
    offset,
  });

  return {
    sets: data.map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      status: s.status,
      created_at: s.createdAt,
      performed_at: s.performedAt,
      artists: (s.setArtists ?? [])
        .sort((a, b) => a.position - b.position)
        .map((sa) => sa.artist)
        .filter((a): a is NonNullable<typeof a> => a !== null),
      genres: (s.setGenres ?? [])
        .map((sg) => sg.genre)
        .filter((g): g is NonNullable<typeof g> => g !== null),
      event: s.event
        ? { id: s.event.id, name: s.event.name, slug: s.event.slug }
        : null,
      sourceCount: s.sources?.length ?? 0,
    })),
    total: totalResult?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getScraperRuns(scraperName?: string, limit = 20) {
  const data = await db.query.scraperRuns.findMany({
    where: scraperName ? eq(scraperRuns.scraperName, scraperName) : undefined,
    orderBy: [desc(scraperRuns.startedAt)],
    limit,
  });

  return data;
}

export async function getScraperOverview() {
  // Get latest runs (limit to recent runs to avoid unbounded scan)
  const runs = await db.query.scraperRuns.findMany({
    orderBy: [desc(scraperRuns.startedAt)],
    limit: 100,
  });

  // Get entity counts per scraper
  const entityCounts = await db
    .select({
      scraperName: scraperEntityMap.scraperName,
      entityType: scraperEntityMap.entityType,
    })
    .from(scraperEntityMap)
    .limit(10000);

  // Group by scraper
  const scraperMap = new Map<
    string,
    {
      lastRun: (typeof runs)[number] | null;
      entityCounts: { artists: number; events: number; festivals: number };
    }
  >();

  for (const run of runs) {
    if (!scraperMap.has(run.scraperName)) {
      scraperMap.set(run.scraperName, {
        lastRun: run,
        entityCounts: { artists: 0, events: 0, festivals: 0 },
      });
    }
  }

  for (const entity of entityCounts) {
    let entry = scraperMap.get(entity.scraperName);
    if (!entry) {
      entry = {
        lastRun: null,
        entityCounts: { artists: 0, events: 0, festivals: 0 },
      };
      scraperMap.set(entity.scraperName, entry);
    }
    if (entity.entityType === "artist") entry.entityCounts.artists++;
    else if (entity.entityType === "event") entry.entityCounts.events++;
    else if (entity.entityType === "festival") entry.entityCounts.festivals++;
  }

  return Object.fromEntries(scraperMap);
}

export async function getLastScraperRun() {
  const data = await db.query.scraperRuns.findFirst({
    orderBy: [desc(scraperRuns.startedAt)],
  });

  if (!data) return null;

  return {
    scraper_name: data.scraperName,
    status: data.status,
    started_at: data.startedAt,
    completed_at: data.completedAt,
    stats: data.stats,
  };
}

export async function getSetForEdit(setId: string) {
  const data = await db.query.sets.findFirst({
    where: eq(sets.id, setId),
    with: {
      setArtists: { with: { artist: true } },
      setGenres: { with: { genre: true } },
      event: { with: { festival: true } },
      sources: true,
    },
  });

  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    performed_at: data.performedAt,
    duration_seconds: data.durationSeconds,
    stage: data.stage,
    event_id: data.eventId,
    artists: (data.setArtists ?? [])
      .sort((a, b) => a.position - b.position)
      .map((sa) => sa.artist)
      .filter((a): a is NonNullable<typeof a> => a !== null),
    genres: (data.setGenres ?? [])
      .map((sg) => sg.genre)
      .filter((g): g is NonNullable<typeof g> => g !== null),
    event: data.event
      ? {
          id: data.event.id,
          name: data.event.name,
          slug: data.event.slug,
          festival_id: data.event.festivalId,
          festivals: data.event.festival || null,
          stages: data.event.stages,
        }
      : null,
    sources: (data.sources ?? []).map((s) => ({
      id: s.id,
      url: s.url,
      platform: s.platform,
    })),
  };
}

export async function searchEvents(query: string) {
  const data = await db.query.events.findMany({
    where: ilike(events.name, `%${query}%`),
    with: {
      festival: true,
    },
    orderBy: [desc(events.dateStart)],
    limit: 20,
  });

  return data.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    date_start: e.dateStart,
    festivals: e.festival
      ? { id: e.festival.id, name: e.festival.name, slug: e.festival.slug }
      : null,
  }));
}

export async function getAllGenres() {
  const data = await db.query.genres.findMany({
    orderBy: [genres.name],
  });

  return data.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
  }));
}

export async function getGenreSuggestionsForArtists(artistIds: string[]) {
  if (artistIds.length === 0) return [];

  const data = await db.query.artistGenres.findMany({
    where: inArray(artistGenres.artistId, artistIds),
    with: {
      genre: true,
    },
  });

  // Count frequency and deduplicate
  const genreMap = new Map<
    string,
    { genre: NonNullable<(typeof data)[number]["genre"]>; count: number }
  >();
  for (const row of data) {
    if (!row.genre) continue;
    const existing = genreMap.get(row.genre.id);
    if (existing) {
      existing.count++;
    } else {
      genreMap.set(row.genre.id, { genre: row.genre, count: 1 });
    }
  }

  // Sort by frequency (most common first)
  return Array.from(genreMap.values())
    .sort((a, b) => b.count - a.count)
    .map((entry) => ({
      id: entry.genre.id,
      name: entry.genre.name,
      slug: entry.genre.slug,
    }));
}

export async function searchArtists(query: string) {
  const data = await db.query.artists.findMany({
    where: ilike(artists.name, `%${query}%`),
    orderBy: [artists.name],
    limit: 20,
  });

  return data.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
  }));
}

export async function searchFestivals(query: string) {
  const data = await db.query.festivals.findMany({
    where: ilike(festivals.name, `%${query}%`),
    orderBy: [festivals.name],
    limit: 20,
  });

  return data.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
  }));
}

export async function getArtistWithSets(artistId: string) {
  const data = await db.query.artists.findFirst({
    where: eq(artists.id, artistId),
    with: {
      setArtists: {
        with: { set: true },
      },
      artistGenres: {
        with: { genre: true },
      },
    },
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    aliases: data.aliases ?? [],
    sets: (data.setArtists ?? [])
      .map((sa) => sa.set)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({ id: s.id, title: s.title, slug: s.slug })),
    genres: (data.artistGenres ?? [])
      .map((ag) => ag.genre)
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
  };
}

export async function getAdminArtists(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;

  const [totalResult] = await db.select({ count: count() }).from(artists);

  const data = await db.query.artists.findMany({
    with: {
      setArtists: true,
      artistGenres: { with: { genre: true } },
    },
    orderBy: [artists.name],
    limit: pageSize,
    offset,
  });

  const artistList = data.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    created_at: a.createdAt,
    setCount: a.setArtists?.length ?? 0,
    genres: (a.artistGenres ?? [])
      .map((ag) => ag.genre)
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
  }));

  // Simple similar-slug flagging: group by first 5 chars of slug
  const slugPrefixes = new Map<string, string[]>();
  for (const a of artistList) {
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
    artists: artistList.map((a) => ({
      ...a,
      hasSimilarSlug: duplicateSlugs.has(a.slug),
    })),
    total: totalResult?.count ?? 0,
    page,
    pageSize,
  };
}
