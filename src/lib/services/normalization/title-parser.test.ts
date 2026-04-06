import { describe, it, expect } from "vitest";
import { parseYouTubeTitle, isLikelyReject } from "./title-parser";

describe("parseYouTubeTitle", () => {
  describe("@ separator pattern", () => {
    it("parses 'Artist @ Festival 2024 (Full Set)'", () => {
      const result = parseYouTubeTitle(
        "Armin van Buuren @ Ultra Music Festival 2026 (Full Set)"
      );
      expect(result.artistName).toBe("Armin van Buuren");
      expect(result.eventOrVenue).toBe("Ultra Music Festival");
      expect(result.year).toBe("2026");
      expect(result.isFullSet).toBe(true);
    });

    it("parses 'Artist live @ Venue 2023'", () => {
      const result = parseYouTubeTitle(
        "Boris Brejcha live @ Tomorrowland 2023"
      );
      expect(result.artistName).toBe("Boris Brejcha");
      expect(result.eventOrVenue).toBe("Tomorrowland");
      expect(result.year).toBe("2023");
      expect(result.isLive).toBe(true);
    });
  });

  describe("B2B detection", () => {
    it("detects B2B artists", () => {
      const result = parseYouTubeTitle(
        "Martin Garrix b2b Tiësto @ Ultra Music Festival 2026"
      );
      expect(result.artistName).toBe("Martin Garrix");
      expect(result.b2bArtists).toEqual(["Tiësto"]);
      expect(result.eventOrVenue).toBe("Ultra Music Festival");
    });

    it("detects B3B (three artists)", () => {
      const result = parseYouTubeTitle(
        "Fisher B2B Chris Lake B2B Lee Foss @ EDC 2025"
      );
      expect(result.artistName).toBe("Fisher");
      expect(result.b2bArtists).toEqual(["Chris Lake", "Lee Foss"]);
    });

    it("returns no b2bArtists for solo sets", () => {
      const result = parseYouTubeTitle("Boris Brejcha @ Tomorrowland 2023");
      expect(result.b2bArtists).toBeUndefined();
    });
  });

  describe("pipe separator pattern", () => {
    it("parses 'ARTIST | Venue 2024 | Full Set'", () => {
      const result = parseYouTubeTitle(
        "WORSHIP | Red Rocks 2024 | Full Set"
      );
      expect(result.artistName).toBe("WORSHIP");
      expect(result.eventOrVenue).toContain("Red Rocks");
      expect(result.year).toBe("2024");
      expect(result.isFullSet).toBe(true);
    });
  });

  describe("dash separator pattern", () => {
    it("parses 'Artist - Title'", () => {
      const result = parseYouTubeTitle("Charlotte de Witte - Cercle Live");
      expect(result.artistName).toBe("Charlotte de Witte");
      expect(result.eventOrVenue).toBe("Cercle Live");
      expect(result.isLive).toBe(true);
    });

    it("parses 'Artist – Event (Official)'", () => {
      const result = parseYouTubeTitle(
        "Carl Cox – Space Ibiza 2024 (Official)"
      );
      expect(result.artistName).toBe("Carl Cox");
      expect(result.eventOrVenue).toContain("Space Ibiza");
      expect(result.year).toBe("2024");
    });
  });

  describe("'at' separator pattern", () => {
    it("parses 'Artist live at Venue'", () => {
      const result = parseYouTubeTitle(
        "Fisher live at EDC Las Vegas 2025"
      );
      expect(result.artistName).toBe("Fisher");
      expect(result.eventOrVenue).toContain("EDC Las Vegas");
      expect(result.year).toBe("2025");
      expect(result.isLive).toBe(true);
    });
  });

  describe("marker detection", () => {
    it("detects full set markers", () => {
      expect(parseYouTubeTitle("Artist @ Fest (Full Set)").isFullSet).toBe(true);
      expect(parseYouTubeTitle("Artist @ Fest [FULL SET]").isFullSet).toBe(true);
      expect(parseYouTubeTitle("Artist @ Fest | DJ Set").isFullSet).toBe(true);
      expect(parseYouTubeTitle("Artist @ Fest").isFullSet).toBe(false);
    });

    it("detects DJ set marker", () => {
      const result = parseYouTubeTitle("Artist @ Fest (DJ Set)");
      expect(result.isFullSet).toBe(true); // "dj set" is in FULL_SET_MARKERS
    });

    it("detects live marker", () => {
      expect(parseYouTubeTitle("Artist live @ Fest").isLive).toBe(true);
      expect(parseYouTubeTitle("Artist @ Fest").isLive).toBe(false);
    });
  });

  describe("year extraction", () => {
    it("extracts year from title", () => {
      expect(parseYouTubeTitle("Something 2025").year).toBe("2025");
    });

    it("returns undefined when no year", () => {
      expect(parseYouTubeTitle("Something cool").year).toBeUndefined();
    });
  });

  describe("no separator", () => {
    it("returns cleanTitle when no pattern matches", () => {
      const result = parseYouTubeTitle("Just A Random Title");
      expect(result.artistName).toBeUndefined();
      expect(result.eventOrVenue).toBeUndefined();
      expect(result.cleanTitle).toBe("Just A Random Title");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = parseYouTubeTitle("");
      expect(result.cleanTitle).toBe("");
    });

    it("strips [HD] and (Official Video) markers", () => {
      const result = parseYouTubeTitle(
        "Artist @ Festival 2024 [HD] (Official Video)"
      );
      expect(result.cleanTitle).not.toContain("[HD]");
      expect(result.cleanTitle).not.toContain("(Official Video)");
    });
  });
});

describe("isLikelyReject", () => {
  it("rejects reaction videos", () => {
    expect(isLikelyReject("My Reaction to Tiësto @ Ultra 2025")).toBe(true);
  });

  it("rejects aftermovies", () => {
    expect(isLikelyReject("Tomorrowland 2025 Aftermovie")).toBe(true);
  });

  it("rejects interviews", () => {
    expect(isLikelyReject("Interview with Carl Cox")).toBe(true);
  });

  it("allows normal set titles", () => {
    expect(isLikelyReject("Boris Brejcha @ Tomorrowland 2023")).toBe(false);
  });
});
