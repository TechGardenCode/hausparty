import { describe, it, expect } from "vitest";
import { classifySource } from "./source-classifier";

describe("classifySource", () => {
  describe("official channels", () => {
    it("recognizes known festival channels", () => {
      expect(
        classifySource({
          channelName: "Tomorrowland",
          artistName: "Boris Brejcha",
        })
      ).toBe("official");
    });

    it("recognizes known label channels", () => {
      expect(
        classifySource({
          channelName: "Cercle",
          artistName: "Amelie Lens",
        })
      ).toBe("official");
    });

    it("matches case-insensitively", () => {
      expect(
        classifySource({
          channelName: "BOILER ROOM",
          artistName: "Carl Cox",
        })
      ).toBe("official");
    });

    it("matches festival name from context", () => {
      expect(
        classifySource({
          channelName: "Shambhala Music Festival",
          artistName: "Some DJ",
          festivalName: "Shambhala Music Festival",
        })
      ).toBe("official");
    });
  });

  describe("artist channels", () => {
    it("matches when channel name equals artist name", () => {
      expect(
        classifySource({
          channelName: "Boris Brejcha",
          artistName: "Boris Brejcha",
        })
      ).toBe("artist");
    });

    it("matches with 'Official' suffix on channel", () => {
      expect(
        classifySource({
          channelName: "Tiësto Official",
          artistName: "Tiësto",
        })
      ).toBe("artist");
    });

    it("matches with 'Music' suffix on channel", () => {
      expect(
        classifySource({
          channelName: "Charlotte de Witte Music",
          artistName: "Charlotte de Witte",
        })
      ).toBe("artist");
    });

    it("matches case-insensitively", () => {
      expect(
        classifySource({
          channelName: "FISHER",
          artistName: "Fisher",
        })
      ).toBe("artist");
    });
  });

  describe("fan channels", () => {
    it("defaults to fan for unknown channels", () => {
      expect(
        classifySource({
          channelName: "EDM Fan Uploads",
          artistName: "Tiësto",
        })
      ).toBe("fan");
    });

    it("defaults to fan when no match", () => {
      expect(
        classifySource({
          channelName: "Random Uploader 123",
          artistName: "Boris Brejcha",
        })
      ).toBe("fan");
    });
  });
});
