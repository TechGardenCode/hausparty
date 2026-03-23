import { describe, it, expect } from "vitest";
import { scraperRegistry, getScraperByName } from "./registry";

describe("scraperRegistry", () => {
  it("contains edmtrain as the first entry", () => {
    expect(scraperRegistry).toHaveLength(1);
    expect(scraperRegistry[0].name).toBe("edmtrain");
    expect(scraperRegistry[0].description).toBeTruthy();
  });

  it("creates a valid scraper instance", () => {
    const scraper = scraperRegistry[0].create();
    expect(scraper.name).toBe("edmtrain");
    expect(typeof scraper.fetch).toBe("function");
    expect(typeof scraper.normalize).toBe("function");
  });
});

describe("getScraperByName", () => {
  it("returns edmtrain entry", () => {
    const entry = getScraperByName("edmtrain");
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("edmtrain");
  });

  it("returns undefined for unknown scraper", () => {
    expect(getScraperByName("nonexistent")).toBeUndefined();
  });
});
