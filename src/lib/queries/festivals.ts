import { db } from "@/lib/db";
import { festivals, events, sets } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

export async function getAllFestivals() {
  const data = await db.query.festivals.findMany({
    with: {
      festivalGenres: { with: { genre: true } },
    },
    orderBy: [festivals.name],
  });

  return data.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    description: f.description,
    image_url: f.imageUrl,
    genres: (f.festivalGenres || [])
      .map((fg) => fg.genre)
      .filter((g): g is NonNullable<typeof g> => g !== null),
  }));
}

export async function getFestivalBySlug(slug: string) {
  const data = await db.query.festivals.findFirst({
    where: eq(festivals.slug, slug),
    with: {
      festivalGenres: { with: { genre: true } },
    },
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    image_url: data.imageUrl,
    genres: (data.festivalGenres || [])
      .map((fg) => fg.genre)
      .filter((g): g is NonNullable<typeof g> => g !== null),
  };
}

export async function getFestivalEvents(festivalId: string) {
  const data = await db.query.events.findMany({
    where: eq(events.festivalId, festivalId),
    orderBy: [desc(events.dateStart)],
  });

  return data.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    date_start: e.dateStart,
    date_end: e.dateEnd,
    location: e.location,
    stages: e.stages,
  }));
}

export async function getFestivalSetCount(festivalId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(sets)
    .innerJoin(events, eq(sets.eventId, events.id))
    .where(eq(events.festivalId, festivalId));

  return result?.count ?? 0;
}
