import { describe, it, expect } from "vitest";
import { crossValidate } from "./cross-validate";
import type { ParsedTitle } from "@/lib/services/normalization/title-parser";

describe("crossValidate", () => {
  describe("B2B detection", () => {
    it("produces warning and suggestion for B2B set", () => {
      const parsed: ParsedTitle = {
        artistName: "Martin Garrix",
        b2bArtists: ["Tiësto"],
        eventOrVenue: "Ultra Music Festival",
        year: "2026",
        isFullSet: true,
        isLive: true,
        cleanTitle: "Martin Garrix b2b Tiësto @ Ultra Music Festival 2026",
      };

      const result = crossValidate(parsed, {
        artistName: "Martin Garrix",
        eventName: "Ultra Music Festival Miami 2026",
        festivalName: "Ultra Music Festival",
      });

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe("b2b_detected");
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].type).toBe("add_b2b_artist");
      expect(result.suggestions[0].artistName).toBe("Tiësto");
      expect(result.confidence).toBe(1.0); // B2B is info, not a mismatch
    });

    it("handles B3B with multiple suggestions", () => {
      const parsed: ParsedTitle = {
        artistName: "Fisher",
        b2bArtists: ["Chris Lake", "Lee Foss"],
        cleanTitle: "Fisher B2B Chris Lake B2B Lee Foss",
        isFullSet: false,
        isLive: false,
      };

      const result = crossValidate(parsed, { artistName: "Fisher" });
      expect(result.suggestions).toHaveLength(2);
    });
  });

  describe("artist mismatch", () => {
    it("warns when parsed artist differs from context", () => {
      const parsed: ParsedTitle = {
        artistName: "Tiësto",
        eventOrVenue: "Ultra Music Festival",
        cleanTitle: "Tiësto @ Ultra Music Festival 2026",
        isFullSet: false,
        isLive: false,
      };

      const result = crossValidate(parsed, {
        artistName: "Martin Garrix",
        eventName: "Ultra Music Festival Miami 2026",
      });

      expect(result.warnings.some((w) => w.type === "artist_mismatch")).toBe(true);
      expect(result.confidence).toBeLessThan(1.0);
    });

    it("no warning when artists match (case-insensitive)", () => {
      const parsed: ParsedTitle = {
        artistName: "BORIS BREJCHA",
        cleanTitle: "BORIS BREJCHA @ Tomorrowland",
        isFullSet: false,
        isLive: false,
      };

      const result = crossValidate(parsed, {
        artistName: "Boris Brejcha",
      });

      expect(result.warnings).toHaveLength(0);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe("event mismatch", () => {
    it("warns when parsed event differs from context", () => {
      const parsed: ParsedTitle = {
        artistName: "Carl Cox",
        eventOrVenue: "Tomorrowland",
        cleanTitle: "Carl Cox @ Tomorrowland",
        isFullSet: false,
        isLive: false,
      };

      const result = crossValidate(parsed, {
        artistName: "Carl Cox",
        eventName: "Ultra Music Festival Miami 2026",
      });

      expect(result.warnings.some((w) => w.type === "event_mismatch")).toBe(true);
      expect(result.confidence).toBeLessThan(1.0);
    });

    it("matches against festival name as fallback", () => {
      const parsed: ParsedTitle = {
        artistName: "Carl Cox",
        eventOrVenue: "Ultra",
        cleanTitle: "Carl Cox @ Ultra",
        isFullSet: false,
        isLive: false,
      };

      const result = crossValidate(parsed, {
        artistName: "Carl Cox",
        eventName: "Ultra Music Festival Miami 2026",
        festivalName: "Ultra Music Festival",
      });

      expect(result.warnings.filter((w) => w.type === "event_mismatch")).toHaveLength(0);
    });
  });

  describe("clean match", () => {
    it("returns no warnings and full confidence for matching metadata", () => {
      const parsed: ParsedTitle = {
        artistName: "Hardwell",
        eventOrVenue: "Ultra Music Festival",
        year: "2026",
        cleanTitle: "Hardwell @ Ultra Music Festival 2026",
        isFullSet: true,
        isLive: true,
      };

      const result = crossValidate(parsed, {
        artistName: "Hardwell",
        eventName: "Ultra Music Festival Miami 2026",
        festivalName: "Ultra Music Festival",
      });

      expect(result.warnings).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
      expect(result.confidence).toBe(1.0);
    });
  });
});
