import { describe, it, expect } from "vitest";
import { EdmtrainScraper } from "./edmtrain";
import type { EdmtrainRawEvent } from "./edmtrain";
import fixtureData from "./__fixtures__/edmtrain-events.json";

const scraper = new EdmtrainScraper();
const events = fixtureData.data as unknown as EdmtrainRawEvent[];

describe("EdmtrainScraper.normalize", () => {
  it("normalizes a standard event with artists", () => {
    const result = scraper.normalize(events[0]);
    expect(result).not.toBeNull();
    expect(result!.externalId).toBe("edmtrain-event-100001");
    expect(result!.name).toBe("Techno Tuesday: Charlotte de Witte");
    expect(result!.date).toBe("2026-03-17");
    expect(result!.location).toBe("Manchester, UK");
    expect(result!.venue).toBe("Warehouse Project");
    expect(result!.festivalName).toBeUndefined();
    expect(result!.artists).toHaveLength(2);
    expect(result!.artists[0].name).toBe("Charlotte de Witte");
    expect(result!.artists[0].externalId).toBe("edmtrain-artist-2001");
  });

  it("detects festivals and sets festivalName", () => {
    const result = scraper.normalize(events[1]);
    expect(result).not.toBeNull();
    expect(result!.festivalName).toBe("Tomorrowland Winter");
    expect(result!.dateEnd).toBe("2026-03-20");
    expect(result!.artists).toHaveLength(3);
  });

  it("returns null for events with no artists", () => {
    const result = scraper.normalize(events[3]);
    expect(result).toBeNull();
  });

  it("handles B2B artist indicator", () => {
    const result = scraper.normalize(events[2]);
    expect(result).not.toBeNull();
    const b2bArtist = result!.artists.find(
      (a) => a.name === "Marcel Dettmann"
    );
    expect(b2bArtist?.isB2B).toBe(true);
  });

  it("builds event name from artists + venue when name is missing", () => {
    const result = scraper.normalize(events[2]);
    expect(result).not.toBeNull();
    // No name on fixture event 100003 — should construct from artists + venue
    expect(result!.name).toContain("Ben Klock");
    expect(result!.name).toContain("Berghain");
  });

  it("handles single-artist event", () => {
    const result = scraper.normalize(events[4]);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("fabric presents: Four Tet");
    expect(result!.artists).toHaveLength(1);
    expect(result!.artists[0].name).toBe("Four Tet");
  });

  it("uses festivalName or name for festival events with null name", () => {
    const result = scraper.normalize(events[1]);
    expect(result).not.toBeNull();
    // events[1] has name: null but festivalName: "Tomorrowland Winter"
    expect(result!.name).toBe("Tomorrowland Winter");
  });
});

describe("EdmtrainScraper.extractRawPayloads", () => {
  it("emits an event payload plus one artist payload per artist", () => {
    const payloads = scraper.extractRawPayloads(events[0]);
    const types = payloads.map((p) => p.entityType);
    expect(types).toContain("event");
    expect(types.filter((t) => t === "artist")).toHaveLength(events[0].artistList!.length);
    const eventPayload = payloads.find((p) => p.entityType === "event");
    expect(eventPayload?.externalId).toBe("edmtrain-event-100001");
    expect(eventPayload?.payload).toBe(events[0]);
  });

  it("emits a venue payload when venue has an id", () => {
    const payloads = scraper.extractRawPayloads(events[0]);
    const venuePayload = payloads.find((p) => p.entityType === "venue");
    if (events[0].venue?.id) {
      expect(venuePayload).toBeDefined();
      expect(venuePayload?.externalId).toBe(`edmtrain-venue-${events[0].venue.id}`);
    }
  });

  it("emits only the event payload when artistList is empty", () => {
    const payloads = scraper.extractRawPayloads(events[3]);
    expect(payloads.some((p) => p.entityType === "artist")).toBe(false);
    expect(payloads.some((p) => p.entityType === "event")).toBe(true);
  });
});
