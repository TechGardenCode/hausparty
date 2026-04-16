import type { Scraper, NormalizedEvent, NormalizedArtist } from "./types";

export interface EdmtrainArtist {
  id: number;
  name: string;
  link?: string;
  b2bInd?: boolean;
}

export interface EdmtrainVenue {
  id: number;
  name: string;
  location: string;
  address?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

export interface EdmtrainRawEvent {
  id: number;
  link?: string;
  name?: string;
  festivalInd?: boolean;
  electronicMusicInd?: boolean;
  otherMusicInd?: boolean;
  date: string; // YYYY-MM-DD
  endDate?: string;
  ages?: string;
  venue?: EdmtrainVenue;
  artistList?: EdmtrainArtist[];
  festivalName?: string;
}

interface EdmtrainResponse {
  success: boolean;
  data: EdmtrainRawEvent[];
}

export class EdmtrainScraper implements Scraper<EdmtrainRawEvent> {
  readonly name = "edmtrain";

  private get apiKey(): string {
    const key = process.env.EDMTRAIN_API_KEY;
    if (!key) throw new Error("EDMTRAIN_API_KEY environment variable is not set");
    return key;
  }

  async fetch(params: Record<string, string>): Promise<EdmtrainRawEvent[]> {
    const url = new URL("https://edmtrain.com/api/events");
    url.searchParams.set("client", this.apiKey);

    // Forward params (e.g., startDate, endDate, state, festivalOnly)
    for (const [key, value] of Object.entries(params)) {
      if (key !== "client") {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(
        `edmtrain API returned ${response.status}: ${response.statusText}`
      );
    }

    const json: EdmtrainResponse = await response.json();
    if (!json.success) {
      throw new Error("edmtrain API returned success=false");
    }

    return json.data ?? [];
  }

  normalize(raw: EdmtrainRawEvent): NormalizedEvent | null {
    // Skip events with no artists
    if (!raw.artistList || raw.artistList.length === 0) {
      return null;
    }

    // Build event name: use raw.name, festivalName, or construct from artists + venue
    const eventName =
      raw.name ||
      raw.festivalName ||
      buildEventName(raw.artistList, raw.venue, raw.date);

    const location = raw.venue?.location ?? "Unknown";

    const artists: NormalizedArtist[] = raw.artistList.map((a) => ({
      externalId: `edmtrain-artist-${a.id}`,
      name: a.name,
      isB2B: a.b2bInd ?? false,
    }));

    return {
      externalId: `edmtrain-event-${raw.id}`,
      name: eventName,
      date: raw.date,
      dateEnd: raw.endDate,
      location,
      venue: raw.venue?.name,
      festivalName: raw.festivalInd ? (raw.festivalName ?? raw.name) : undefined,
      artists,
      isLivestream: false,
    };
  }
}

function buildEventName(
  artists: EdmtrainArtist[],
  venue?: EdmtrainVenue,
  date?: string
): string {
  const artistNames = artists
    .slice(0, 3)
    .map((a) => a.name)
    .join(", ");
  const suffix = artists.length > 3 ? ` +${artists.length - 3} more` : "";
  const venuePart = venue?.name ? ` at ${venue.name}` : "";
  const datePart = date ? ` (${date})` : "";
  return `${artistNames}${suffix}${venuePart}${datePart}`;
}
