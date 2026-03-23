export interface ScraperStats {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface NormalizedArtist {
  externalId: string;
  name: string;
  isB2B?: boolean;
}

export interface NormalizedEvent {
  externalId: string;
  name: string;
  date: string; // ISO date (YYYY-MM-DD)
  dateEnd?: string;
  location: string;
  venue?: string;
  festivalName?: string; // populated = this event belongs to a festival
  artists: NormalizedArtist[];
  isLivestream?: boolean;
}

export interface Scraper<TRaw = unknown> {
  readonly name: string;
  fetch(params: Record<string, string>): Promise<TRaw[]>;
  normalize(raw: TRaw): NormalizedEvent | null;
}
