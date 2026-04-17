import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  readResume,
  writeResume,
  clearResume,
  RESUME_STORAGE_KEY,
  RESUME_MAX_AGE_MS,
  type ResumeEntry,
} from "./use-resume";

function installFakeLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const fakeStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = { localStorage: fakeStorage };
  return store;
}

describe("use-resume localStorage utils", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
    vi.useRealTimers();
  });

  const sample: ResumeEntry = {
    setSlug: "artist-event-2024",
    setTitle: "Artist — Event 2024",
    thumbnailUrl: null,
    platform: "youtube",
    sourceId: "00000000-0000-0000-0000-000000000001",
    positionSeconds: 123,
    updatedAt: Date.now(),
  };

  it("writes and reads a valid entry", () => {
    writeResume(sample);
    const got = readResume();
    expect(got).toEqual(sample);
  });

  it("returns null when no entry is stored", () => {
    expect(readResume()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const store = installFakeLocalStorage({ [RESUME_STORAGE_KEY]: "not-json" });
    expect(readResume()).toBeNull();
    expect(store.get(RESUME_STORAGE_KEY)).toBe("not-json");
  });

  it("returns null for missing required fields", () => {
    installFakeLocalStorage({
      [RESUME_STORAGE_KEY]: JSON.stringify({ setSlug: "x" }),
    });
    expect(readResume()).toBeNull();
  });

  it("returns null for entries older than the max age", () => {
    const stale: ResumeEntry = {
      ...sample,
      updatedAt: Date.now() - RESUME_MAX_AGE_MS - 1000,
    };
    installFakeLocalStorage({
      [RESUME_STORAGE_KEY]: JSON.stringify(stale),
    });
    expect(readResume()).toBeNull();
  });

  it("honors entries right at the boundary", () => {
    const edge: ResumeEntry = {
      ...sample,
      updatedAt: Date.now() - (RESUME_MAX_AGE_MS - 1000),
    };
    installFakeLocalStorage({
      [RESUME_STORAGE_KEY]: JSON.stringify(edge),
    });
    expect(readResume()).not.toBeNull();
  });

  it("clearResume removes the entry", () => {
    const store = installFakeLocalStorage({
      [RESUME_STORAGE_KEY]: JSON.stringify(sample),
    });
    clearResume();
    expect(store.has(RESUME_STORAGE_KEY)).toBe(false);
  });

  it("tolerates window being undefined (SSR)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
    expect(readResume()).toBeNull();
    expect(() => writeResume(sample)).not.toThrow();
    expect(() => clearResume()).not.toThrow();
  });
});
