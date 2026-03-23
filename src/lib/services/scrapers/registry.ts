import type { Scraper } from "./types";
import { EdmtrainScraper } from "./edmtrain";

export interface ScraperEntry {
  name: string;
  description: string;
  create: () => Scraper;
}

export const scraperRegistry: ScraperEntry[] = [
  {
    name: "edmtrain",
    description:
      "Electronic music event listings from edmtrain.com. Populates events, artists, and festivals.",
    create: () => new EdmtrainScraper(),
  },
];

export function getScraperByName(name: string): ScraperEntry | undefined {
  return scraperRegistry.find((s) => s.name === name);
}
