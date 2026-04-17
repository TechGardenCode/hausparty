import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture mock db calls so the test can assert what was read/written.
interface Call {
  method: string;
  args: unknown[];
}
const calls: Call[] = [];
let selectResult: { id: string }[] = [];
const insertValues = vi.fn();
const insertOnConflict = vi.fn();
const activityInsert = vi.fn();

function chain(method: string, final?: unknown): unknown {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally")
        return undefined;
      return (...args: unknown[]) => {
        calls.push({ method: `${method}.${String(prop)}`, args });
        if (prop === "limit") return Promise.resolve(final);
        return chain(method, final);
      };
    },
  });
}

vi.mock("@/lib/db", () => ({
  db: {
    select: () => chain("select", selectResult),
    insert: (table: { [key: string]: unknown }) => {
      const tableName = String(
        (table as { [Symbol.toStringTag]?: string })[Symbol.toStringTag] ??
          ""
      );
      const proxyCalls: { values?: unknown; onConflict?: unknown } = {};
      return new Proxy(function () {}, {
        get(_t, prop) {
          if (prop === "then" || prop === "catch" || prop === "finally")
            return undefined;
          if (prop === "values") {
            return (v: unknown) => {
              proxyCalls.values = v;
              // Submit to per-table spy.
              if (tableName === "play_events" || String(prop) === "values") {
                // The schema table object doesn't have a name at runtime — fall through.
              }
              return new Proxy(function () {}, {
                get(_t2, prop2) {
                  if (prop2 === "then") {
                    insertValues(v);
                    return (
                      resolve: (value: unknown) => void
                    ) => resolve(undefined);
                  }
                  if (prop2 === "onConflictDoUpdate") {
                    return (u: unknown) => {
                      insertOnConflict({ values: v, update: u });
                      return Promise.resolve(undefined);
                    };
                  }
                  if (prop2 === "returning") {
                    return () => Promise.resolve([{ id: "new-activity" }]);
                  }
                  return () => Promise.resolve(undefined);
                },
              });
            };
          }
          return () => Promise.resolve(undefined);
        },
      });
    },
  },
}));

// User-activity helper also uses db — swallow it by mocking the module.
vi.mock("@/lib/actions/user-activity", () => ({
  recordUserActivity: (...args: unknown[]) => {
    activityInsert(...args);
    return Promise.resolve();
  },
}));

const { recordPlayEvent } = await import("./play");

describe("recordPlayEvent", () => {
  beforeEach(() => {
    calls.length = 0;
    selectResult = [];
    insertValues.mockClear();
    insertOnConflict.mockClear();
    activityInsert.mockClear();
  });

  it("skips when the set slug is unknown", async () => {
    selectResult = [];
    const result = await recordPlayEvent({
      userId: "user-1",
      setSlug: "unknown",
      sourceId: "src-1",
      platform: "youtube",
      startedAt: new Date("2026-04-16T12:00:00Z"),
      positionSeconds: 10,
      event: "start",
    });
    expect(result).toEqual({ skipped: true });
    expect(insertOnConflict).not.toHaveBeenCalled();
    expect(activityInsert).not.toHaveBeenCalled();
  });

  it("upserts with non-negative floored position", async () => {
    selectResult = [{ id: "set-1" }];
    await recordPlayEvent({
      userId: "user-1",
      setSlug: "known-slug",
      sourceId: "src-1",
      platform: "soundcloud",
      startedAt: new Date("2026-04-16T12:00:00Z"),
      positionSeconds: 42.7,
      event: "heartbeat",
    });
    expect(insertOnConflict).toHaveBeenCalledOnce();
    const call = insertOnConflict.mock.calls[0][0] as {
      values: { lastPositionSeconds: number; durationListenedSeconds: number };
    };
    expect(call.values.lastPositionSeconds).toBe(42);
    expect(call.values.durationListenedSeconds).toBe(42);
  });

  it("floors negative positions to 0", async () => {
    selectResult = [{ id: "set-1" }];
    await recordPlayEvent({
      userId: "u",
      setSlug: "s",
      sourceId: "src",
      platform: "youtube",
      startedAt: new Date(),
      positionSeconds: -5,
      event: "heartbeat",
    });
    const call = insertOnConflict.mock.calls[0][0] as {
      values: { lastPositionSeconds: number };
    };
    expect(call.values.lastPositionSeconds).toBe(0);
  });

  it("records user_activity only on the `start` beat", async () => {
    selectResult = [{ id: "set-1" }];

    await recordPlayEvent({
      userId: "u",
      setSlug: "s",
      sourceId: "src",
      platform: "youtube",
      startedAt: new Date(),
      positionSeconds: 0,
      event: "start",
    });
    expect(activityInsert).toHaveBeenCalledOnce();
    expect(activityInsert.mock.calls[0][0]).toMatchObject({
      userId: "u",
      action: "play",
      targetType: "set",
      targetId: "set-1",
    });

    activityInsert.mockClear();
    await recordPlayEvent({
      userId: "u",
      setSlug: "s",
      sourceId: "src",
      platform: "youtube",
      startedAt: new Date(),
      positionSeconds: 10,
      event: "heartbeat",
    });
    expect(activityInsert).not.toHaveBeenCalled();

    await recordPlayEvent({
      userId: "u",
      setSlug: "s",
      sourceId: "src",
      platform: "youtube",
      startedAt: new Date(),
      positionSeconds: 100,
      event: "end",
    });
    expect(activityInsert).not.toHaveBeenCalled();
  });
});
