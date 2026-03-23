import { describe, it, expect } from "vitest";
import { detectPlatform, parseTitle } from "./submission-processor";
import { slugify } from "@/lib/utils";

describe("detectPlatform", () => {
  it("detects youtube.com URLs", () => {
    expect(detectPlatform("https://www.youtube.com/watch?v=abc123")).toBe("youtube");
  });

  it("detects youtu.be short URLs", () => {
    expect(detectPlatform("https://youtu.be/abc123")).toBe("youtube");
  });

  it("detects soundcloud.com URLs", () => {
    expect(detectPlatform("https://soundcloud.com/artist/set-name")).toBe("soundcloud");
  });

  it("returns null for unsupported platforms", () => {
    expect(detectPlatform("https://spotify.com/track/123")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(detectPlatform("")).toBeNull();
  });

  it("returns null for non-URL strings", () => {
    expect(detectPlatform("not a url")).toBeNull();
  });
});

describe("slugify", () => {
  it("lowercases text", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces non-alphanumeric chars with hyphens", () => {
    expect(slugify("Artist @ Event 2024")).toBe("artist-event-2024");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("a   b   c")).toBe("a-b-c");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles special characters", () => {
    expect(slugify("Charlotte de Witte — Tomorrowland 2024")).toBe(
      "charlotte-de-witte-tomorrowland-2024"
    );
  });
});

describe("parseTitle", () => {
  it("parses 'Artist - Title' format with dash", () => {
    const result = parseTitle("Charlotte de Witte - Tomorrowland 2024");
    expect(result.artist).toBe("Charlotte de Witte");
    expect(result.setTitle).toBe("Tomorrowland 2024");
  });

  it("parses 'Artist – Title' format with en-dash", () => {
    const result = parseTitle("Amelie Lens – Awakenings 2024");
    expect(result.artist).toBe("Amelie Lens");
    expect(result.setTitle).toBe("Awakenings 2024");
  });

  it("parses 'Artist — Title' format with em-dash", () => {
    const result = parseTitle("ANNA — Time Warp 2024");
    expect(result.artist).toBe("ANNA");
    expect(result.setTitle).toBe("Time Warp 2024");
  });

  it("parses 'Artist | Title' format with pipe", () => {
    const result = parseTitle("Boris Brejcha | Live at Tomorrowland");
    expect(result.artist).toBe("Boris Brejcha");
    expect(result.setTitle).toBe("Live at Tomorrowland");
  });

  it("falls back to full title when no separator found", () => {
    const result = parseTitle("Some Random Title Without Separator");
    expect(result.artist).toBe("");
    expect(result.setTitle).toBe("Some Random Title Without Separator");
  });

  it("handles whitespace around separators", () => {
    const result = parseTitle("  Artist  -  Title  ");
    expect(result.artist).toBe("Artist");
    expect(result.setTitle).toBe("Title");
  });

  it("uses first dash as separator (greedy right)", () => {
    const result = parseTitle("DJ A - Set B - Part 2");
    expect(result.artist).toBe("DJ A");
    expect(result.setTitle).toBe("Set B - Part 2");
  });
});
