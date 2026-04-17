import { describe, it, expect } from "vitest";
import { parsePlayEventBody } from "./parse-body";

const valid = {
  setSlug: "artist-event-2024",
  sourceId: "00000000-0000-0000-0000-000000000001",
  platform: "youtube" as const,
  startedAtISO: "2026-04-16T12:00:00.000Z",
  positionSeconds: 42,
  event: "heartbeat" as const,
};

describe("parsePlayEventBody", () => {
  it("accepts a well-formed payload", () => {
    expect(parsePlayEventBody(valid)).toEqual(valid);
  });

  it("rejects null / non-object payloads", () => {
    expect(parsePlayEventBody(null)).toBeNull();
    expect(parsePlayEventBody(undefined)).toBeNull();
    expect(parsePlayEventBody("a string")).toBeNull();
    expect(parsePlayEventBody(42)).toBeNull();
  });

  it.each([
    ["setSlug missing", { ...valid, setSlug: undefined }],
    ["setSlug empty", { ...valid, setSlug: "" }],
    ["setSlug non-string", { ...valid, setSlug: 123 }],
    ["sourceId missing", { ...valid, sourceId: undefined }],
    ["sourceId empty", { ...valid, sourceId: "" }],
    ["platform unknown", { ...valid, platform: "spotify" }],
    ["event unknown", { ...valid, event: "pause" }],
    ["positionSeconds string", { ...valid, positionSeconds: "42" }],
    ["positionSeconds NaN", { ...valid, positionSeconds: NaN }],
    ["positionSeconds Infinity", { ...valid, positionSeconds: Infinity }],
    ["startedAtISO non-string", { ...valid, startedAtISO: 0 }],
    ["startedAtISO unparseable", { ...valid, startedAtISO: "not-a-date" }],
  ])("rejects when %s", (_label, payload) => {
    expect(parsePlayEventBody(payload)).toBeNull();
  });

  it("accepts all three event kinds", () => {
    expect(parsePlayEventBody({ ...valid, event: "start" })?.event).toBe(
      "start"
    );
    expect(parsePlayEventBody({ ...valid, event: "heartbeat" })?.event).toBe(
      "heartbeat"
    );
    expect(parsePlayEventBody({ ...valid, event: "end" })?.event).toBe("end");
  });

  it("accepts both platforms", () => {
    expect(parsePlayEventBody({ ...valid, platform: "youtube" })?.platform).toBe(
      "youtube"
    );
    expect(
      parsePlayEventBody({ ...valid, platform: "soundcloud" })?.platform
    ).toBe("soundcloud");
  });
});
