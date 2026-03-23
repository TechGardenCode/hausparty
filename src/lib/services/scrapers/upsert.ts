import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { findOrCreateArtist } from "@/lib/services/artist-matching";
import type { NormalizedEvent, NormalizedArtist } from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;

interface UpsertResult {
  action: "created" | "updated" | "skipped";
  eventId?: string;
}

/**
 * Look up an entity in scraper_entity_map by external ID.
 */
async function findMapping(
  supabase: AdminClient,
  scraperName: string,
  externalId: string,
  entityType: string
): Promise<string | null> {
  const { data } = await supabase
    .from("scraper_entity_map")
    .select("internal_id")
    .eq("scraper_name", scraperName)
    .eq("external_id", externalId)
    .eq("entity_type", entityType)
    .maybeSingle();
  return data?.internal_id ?? null;
}

/**
 * Create a mapping in scraper_entity_map.
 */
async function createMapping(
  supabase: AdminClient,
  scraperName: string,
  externalId: string,
  entityType: string,
  internalId: string
) {
  await supabase.from("scraper_entity_map").insert({
    scraper_name: scraperName,
    external_id: externalId,
    entity_type: entityType,
    internal_id: internalId,
  });
}

/**
 * Find or create an artist. Three-tier dedup:
 * 0. Check scraper_entity_map for existing external ID mapping (scraper-specific)
 * 1-3. Delegate to findOrCreateArtist (slug → alias → trigram)
 */
async function upsertArtist(
  supabase: AdminClient,
  scraperName: string,
  artist: NormalizedArtist
): Promise<string> {
  // Tier 0: entity_map lookup (scraper-specific fast path)
  const existingId = await findMapping(
    supabase,
    scraperName,
    artist.externalId,
    "artist"
  );
  if (existingId) return existingId;

  // Tiers 1-3: slug → alias → trigram matching, or create new
  const { artistId } = await findOrCreateArtist(supabase, artist.name);

  // Record mapping for future scraper lookups
  await createMapping(
    supabase,
    scraperName,
    artist.externalId,
    "artist",
    artistId
  );
  return artistId;
}

/**
 * Find or create a festival by name.
 */
async function upsertFestival(
  supabase: AdminClient,
  scraperName: string,
  festivalName: string
): Promise<string> {
  const slug = slugify(festivalName);

  // Slug match
  const { data: existing } = await supabase
    .from("festivals")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: newFestival, error } = await supabase
    .from("festivals")
    .insert({ name: festivalName, slug })
    .select("id")
    .single();

  if (error || !newFestival) {
    throw new Error(
      `Failed to create festival "${festivalName}": ${error?.message}`
    );
  }

  return newFestival.id;
}

/**
 * Upsert a normalized event and its associated artists/festival.
 */
export async function upsertEvent(
  supabase: AdminClient,
  scraperName: string,
  event: NormalizedEvent
): Promise<UpsertResult> {
  // Check entity_map for existing event
  const existingEventId = await findMapping(
    supabase,
    scraperName,
    event.externalId,
    "event"
  );

  if (existingEventId) {
    return { action: "skipped", eventId: existingEventId };
  }

  // Resolve festival if applicable
  let festivalId: string | null = null;
  if (event.festivalName) {
    festivalId = await upsertFestival(supabase, scraperName, event.festivalName);
  }

  // Slug-based dedup for event
  const eventSlug = slugify(event.name);
  const { data: existingEvent } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle();

  let eventId: string;

  if (existingEvent) {
    eventId = existingEvent.id;
    // Update with any new data
    await supabase
      .from("events")
      .update({
        date_start: event.date,
        date_end: event.dateEnd ?? null,
        location: event.location,
        festival_id: festivalId,
      })
      .eq("id", eventId);

    await createMapping(
      supabase,
      scraperName,
      event.externalId,
      "event",
      eventId
    );

    return { action: "updated", eventId };
  }

  // Create new event
  const { data: newEvent, error: eventError } = await supabase
    .from("events")
    .insert({
      name: event.name,
      slug: eventSlug,
      date_start: event.date,
      date_end: event.dateEnd ?? null,
      location: event.location,
      festival_id: festivalId,
    })
    .select("id")
    .single();

  if (eventError || !newEvent) {
    // Slug collision — append date suffix
    const fallbackSlug = `${eventSlug}-${event.date}`;
    const { data: retryEvent, error: retryError } = await supabase
      .from("events")
      .insert({
        name: event.name,
        slug: fallbackSlug,
        date_start: event.date,
        date_end: event.dateEnd ?? null,
        location: event.location,
        festival_id: festivalId,
      })
      .select("id")
      .single();

    if (retryError || !retryEvent) {
      throw new Error(
        `Failed to create event "${event.name}": ${retryError?.message}`
      );
    }
    eventId = retryEvent.id;
  } else {
    eventId = newEvent.id;
  }

  // Map external ID → internal ID
  await createMapping(
    supabase,
    scraperName,
    event.externalId,
    "event",
    eventId
  );

  // Upsert artists and link to... well, we don't link artists to events directly.
  // Artists are linked to sets, but this scraper creates events, not sets.
  // We still create/dedup artist records for catalog enrichment.
  for (const artist of event.artists) {
    await upsertArtist(supabase, scraperName, artist);
  }

  return { action: "created", eventId };
}
