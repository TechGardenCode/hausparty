import { describe, it, expect } from "vitest";
import { normalizeEventName } from "./event-names";

describe("normalizeEventName", () => {
  describe("known festival resolution", () => {
    it("expands EDC abbreviation", () => {
      const result = normalizeEventName("EDC 2025");
      expect(result.displayName).toBe("Electric Daisy Carnival Las Vegas 2025");
      expect(result.festivalName).toBe("Electric Daisy Carnival");
      expect(result.year).toBe("2025");
    });

    it("expands Ultra abbreviation", () => {
      const result = normalizeEventName("Ultra 2026");
      expect(result.displayName).toBe("Ultra Music Festival Miami 2026");
      expect(result.festivalName).toBe("Ultra Music Festival");
    });

    it("handles Tomorrowland", () => {
      const result = normalizeEventName("Tomorrowland 2025");
      expect(result.displayName).toBe("Tomorrowland Boom 2025");
      expect(result.festivalName).toBe("Tomorrowland");
    });

    it("handles case-insensitive matching", () => {
      const result = normalizeEventName("edc las vegas 2026");
      expect(result.festivalName).toBe("Electric Daisy Carnival");
    });

    it("extracts location override from name", () => {
      const result = normalizeEventName("EDC Orlando 2025");
      expect(result.displayName).toBe("Electric Daisy Carnival Orlando 2025");
      expect(result.location).toBe("Orlando");
    });
  });

  describe("year extraction", () => {
    it("extracts year from name", () => {
      const result = normalizeEventName("Some Festival 2025");
      expect(result.year).toBe("2025");
    });

    it("falls back to date parameter for year", () => {
      const result = normalizeEventName("Some Festival", undefined, "2025-07-15");
      expect(result.year).toBe("2025");
    });

    it("prefers year in name over date parameter", () => {
      const result = normalizeEventName("Ultra 2025", undefined, "2026-03-28");
      expect(result.year).toBe("2025");
    });
  });

  describe("festival hint from scraper", () => {
    it("uses festival hint to resolve", () => {
      const result = normalizeEventName(
        "Some Event Name",
        "Tomorrowland",
        "2025-07-20"
      );
      expect(result.festivalName).toBe("Tomorrowland");
    });
  });

  describe("non-festival events", () => {
    it("preserves unknown event names", () => {
      const result = normalizeEventName("Boris Brejcha at Berghain");
      expect(result.displayName).toBe("Boris Brejcha at Berghain");
      expect(result.festivalName).toBeUndefined();
    });

    it("extracts year from non-festival name", () => {
      const result = normalizeEventName("Worship Red Rocks 2024");
      expect(result.displayName).toBe("Worship Red Rocks 2024");
      expect(result.year).toBe("2024");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = normalizeEventName("");
      expect(result.displayName).toBe("");
    });

    it("handles name with no year and no date", () => {
      const result = normalizeEventName("Random Party");
      expect(result.year).toBeUndefined();
    });
  });
});
