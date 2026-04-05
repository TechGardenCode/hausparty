import { describe, it, expect } from "vitest";
import { normalizeArtistName } from "./artist-names";

describe("normalizeArtistName", () => {
  describe("stylized names", () => {
    it("preserves deadmau5 casing", () => {
      expect(normalizeArtistName("DEADMAU5")).toBe("deadmau5");
      expect(normalizeArtistName("deadmau5")).toBe("deadmau5");
      expect(normalizeArtistName("Deadmau5")).toBe("deadmau5");
    });

    it("preserves REZZ casing", () => {
      expect(normalizeArtistName("rezz")).toBe("REZZ");
      expect(normalizeArtistName("REZZ")).toBe("REZZ");
      expect(normalizeArtistName("Rezz")).toBe("REZZ");
    });

    it("normalizes Tiësto with diacritics", () => {
      expect(normalizeArtistName("TIESTO")).toBe("Tiësto");
      expect(normalizeArtistName("tiesto")).toBe("Tiësto");
    });

    it("handles Fred again..", () => {
      expect(normalizeArtistName("FRED AGAIN..")).toBe("Fred again..");
      expect(normalizeArtistName("fred again..")).toBe("Fred again..");
    });

    it("handles Armin van Buuren", () => {
      expect(normalizeArtistName("ARMIN VAN BUUREN")).toBe("Armin van Buuren");
      expect(normalizeArtistName("armin van buuren")).toBe("Armin van Buuren");
    });

    it("handles Charlotte de Witte", () => {
      expect(normalizeArtistName("CHARLOTTE DE WITTE")).toBe("Charlotte de Witte");
    });
  });

  describe("ALL CAPS to title case", () => {
    it("converts generic ALL CAPS names", () => {
      expect(normalizeArtistName("JOHN DOE")).toBe("John Doe");
    });

    it("handles single word ALL CAPS", () => {
      expect(normalizeArtistName("WORSHIP")).toBe("Worship");
    });

    it("preserves lowercase particles", () => {
      expect(normalizeArtistName("TALE OF US")).toBe("Tale Of Us");
    });
  });

  describe("already mixed case", () => {
    it("preserves properly cased names", () => {
      expect(normalizeArtistName("Boris Brejcha")).toBe("Boris Brejcha");
    });

    it("preserves names with internal caps", () => {
      expect(normalizeArtistName("MitiS")).toBe("MitiS");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(normalizeArtistName("")).toBe("");
    });

    it("trims whitespace", () => {
      expect(normalizeArtistName("  REZZ  ")).toBe("REZZ");
    });

    it("collapses multiple spaces", () => {
      expect(normalizeArtistName("ARMIN  VAN  BUUREN")).toBe("Armin van Buuren");
    });

    it("handles all lowercase generic name", () => {
      expect(normalizeArtistName("some artist")).toBe("Some Artist");
    });

    it("handles DJ prefix", () => {
      expect(normalizeArtistName("DJ SNAKE")).toBe("DJ Snake");
    });
  });
});
