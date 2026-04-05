import { describe, it, expect } from "vitest";
import { buildSearchUrls } from "./search-urls";

describe("buildSearchUrls", () => {
  it("generates YouTube URLs with quoted artist + festival", () => {
    const result = buildSearchUrls({
      artistName: "Armin van Buuren",
      festivalName: "Ultra Music Festival",
      year: "2026",
    });

    expect(result.youtube).toHaveLength(2); // quoted + unquoted
    expect(result.youtube[0]).toContain("youtube.com/results");
    expect(result.youtube[0]).toContain("%22Armin+van+Buuren%22");
    expect(result.youtube[0]).toContain("%22Ultra+Music+Festival%22");
    expect(result.youtube[0]).toContain("2026");
    expect(result.youtube[0]).toContain("live+set");
  });

  it("generates unquoted relaxed YouTube URL", () => {
    const result = buildSearchUrls({
      artistName: "Boris Brejcha",
      eventName: "Tomorrowland",
      year: "2025",
    });

    expect(result.youtube[1]).toContain("Boris+Brejcha");
    expect(result.youtube[1]).toContain("Tomorrowland");
    expect(result.youtube[1]).toContain("full+set");
  });

  it("generates venue fallback when venue differs from event", () => {
    const result = buildSearchUrls({
      artistName: "Worship",
      eventName: "Summer Sessions",
      venue: "Red Rocks",
      year: "2024",
    });

    expect(result.youtube).toHaveLength(3); // quoted + unquoted + venue
    expect(result.youtube[2]).toContain("Red+Rocks");
    expect(result.youtube[2]).toContain("DJ+set");
  });

  it("skips venue fallback when venue matches event", () => {
    const result = buildSearchUrls({
      artistName: "Fisher",
      eventName: "Red Rocks",
      venue: "Red Rocks",
      year: "2024",
    });

    expect(result.youtube).toHaveLength(2); // no venue fallback
  });

  it("uses venue when no event/festival", () => {
    const result = buildSearchUrls({
      artistName: "Carl Cox",
      venue: "Space Ibiza",
      year: "2024",
    });

    expect(result.youtube).toHaveLength(2); // unquoted + venue
    expect(result.youtube[0]).toContain("Space+Ibiza");
  });

  it("generates SoundCloud URL", () => {
    const result = buildSearchUrls({
      artistName: "Charlotte de Witte",
      festivalName: "Awakenings",
      year: "2025",
    });

    expect(result.soundcloud).toHaveLength(1);
    expect(result.soundcloud[0]).toContain("soundcloud.com/search");
    expect(result.soundcloud[0]).toContain("Charlotte+de+Witte");
    expect(result.soundcloud[0]).toContain("Awakenings");
  });

  it("works with minimal context (artist only)", () => {
    const result = buildSearchUrls({ artistName: "Skrillex" });

    expect(result.youtube.length).toBeGreaterThanOrEqual(1);
    expect(result.soundcloud).toHaveLength(1);
    expect(result.youtube[0]).toContain("Skrillex");
  });

  it("prefers festival name over event name", () => {
    const result = buildSearchUrls({
      artistName: "Tiësto",
      eventName: "EDC Day 2",
      festivalName: "Electric Daisy Carnival",
      year: "2025",
    });

    expect(result.youtube[0]).toContain("Electric+Daisy+Carnival");
  });
});
