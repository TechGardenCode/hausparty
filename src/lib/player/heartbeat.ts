export const CLIENT_HEARTBEAT_MS = 5_000;
export const SERVER_HEARTBEAT_MS = 30_000;

export interface HeartbeatPayload {
  setSlug: string;
  sourceId: string;
  platform: "youtube" | "soundcloud";
  startedAtISO: string;
  positionSeconds: number;
  event: "start" | "heartbeat" | "end";
}

export function sendHeartbeat(payload: HeartbeatPayload, useBeacon = false) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  try {
    if (useBeacon && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/play", blob);
      return;
    }
    void fetch("/api/play", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: useBeacon,
    }).catch(() => {
      // fail silent — heartbeat is best-effort
    });
  } catch {
    // ignore
  }
}
