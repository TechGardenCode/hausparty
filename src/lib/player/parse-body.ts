export interface PlayEventBody {
  setSlug: string;
  sourceId: string;
  platform: "youtube" | "soundcloud";
  startedAtISO: string;
  positionSeconds: number;
  event: "start" | "heartbeat" | "end";
}

/**
 * Validates an untrusted JSON payload from `/api/play`. Rejects anything that
 * can't be narrowed to `PlayEventBody`; never throws.
 */
export function parsePlayEventBody(raw: unknown): PlayEventBody | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (
    typeof body.setSlug !== "string" ||
    body.setSlug.length === 0 ||
    typeof body.sourceId !== "string" ||
    body.sourceId.length === 0 ||
    typeof body.startedAtISO !== "string" ||
    typeof body.positionSeconds !== "number" ||
    !Number.isFinite(body.positionSeconds) ||
    (body.platform !== "youtube" && body.platform !== "soundcloud") ||
    (body.event !== "start" && body.event !== "heartbeat" && body.event !== "end")
  ) {
    return null;
  }
  if (Number.isNaN(new Date(body.startedAtISO).getTime())) return null;
  return body as unknown as PlayEventBody;
}
