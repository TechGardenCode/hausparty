import { db } from "@/lib/db";
import { events, festivals, scraperEntityMap } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import { findOrCreateArtist } from "@/lib/services/artist-matching";
import type { NormalizedEvent, NormalizedArtist } from "./types";

interface UpsertResult {
  action: "created" | "updated" | "skipped";
  eventId?: string;
}

async function findMapping(
  scraperName: string,
  externalId: string,
  entityType: string
): Promise<string | null> {
  const [row] = await db
    .select({ internalId: scraperEntityMap.internalId })
    .from(scraperEntityMap)
    .where(
      and(
        eq(scraperEntityMap.scraperName, scraperName),
        eq(scraperEntityMap.externalId, externalId),
        eq(scraperEntityMap.entityType, entityType)
      )
    )
    .limit(1);
  return row?.internalId ?? null;
}

async function createMapping(
  scraperName: string,
  externalId: string,
  entityType: string,
  internalId: string
) {
  await db.insert(scraperEntityMap).values({
    scraperName,
    externalId,
    entityType,
    internalId,
  });
}

async function upsertArtist(
  scraperName: string,
  artist: NormalizedArtist
): Promise<string> {
  const existingId = await findMapping(scraperName, artist.externalId, "artist");
  if (existingId) return existingId;

  const { artistId } = await findOrCreateArtist(artist.name);

  await createMapping(scraperName, artist.externalId, "artist", artistId);
  return artistId;
}

async function upsertFestival(
  scraperName: string,
  festivalName: string
): Promise<string> {
  const slug = slugify(festivalName);

  const [existing] = await db
    .select({ id: festivals.id })
    .from(festivals)
    .where(eq(festivals.slug, slug))
    .limit(1);

  if (existing) return existing.id;

  const [newFestival] = await db
    .insert(festivals)
    .values({ name: festivalName, slug })
    .returning({ id: festivals.id });

  return newFestival.id;
}

export async function upsertEvent(
  scraperName: string,
  event: NormalizedEvent
): Promise<UpsertResult> {
  const existingEventId = await findMapping(scraperName, event.externalId, "event");

  if (existingEventId) {
    return { action: "skipped", eventId: existingEventId };
  }

  let festivalId: string | null = null;
  if (event.festivalName) {
    festivalId = await upsertFestival(scraperName, event.festivalName);
  }

  const eventSlug = slugify(event.name);
  const [existingEvent] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.slug, eventSlug))
    .limit(1);

  let eventId: string;

  if (existingEvent) {
    eventId = existingEvent.id;
    await db
      .update(events)
      .set({
        dateStart: event.date,
        dateEnd: event.dateEnd ?? null,
        location: event.location,
        festivalId,
      })
      .where(eq(events.id, eventId));

    await createMapping(scraperName, event.externalId, "event", eventId);
    return { action: "updated", eventId };
  }

  try {
    const [newEvent] = await db
      .insert(events)
      .values({
        name: event.name,
        slug: eventSlug,
        dateStart: event.date,
        dateEnd: event.dateEnd ?? null,
        location: event.location,
        festivalId,
      })
      .returning({ id: events.id });
    eventId = newEvent.id;
  } catch {
    const fallbackSlug = `${eventSlug}-${event.date}`;
    const [retryEvent] = await db
      .insert(events)
      .values({
        name: event.name,
        slug: fallbackSlug,
        dateStart: event.date,
        dateEnd: event.dateEnd ?? null,
        location: event.location,
        festivalId,
      })
      .returning({ id: events.id });
    eventId = retryEvent.id;
  }

  await createMapping(scraperName, event.externalId, "event", eventId);

  for (const artist of event.artists) {
    await upsertArtist(scraperName, artist);
  }

  return { action: "created", eventId };
}
