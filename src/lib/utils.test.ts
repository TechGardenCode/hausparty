import { describe, it, expect } from "vitest";
import { cn, formatDuration, slugify, formatRelativeDate } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "end")).toBe("base end");
  });

  it("handles undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});

describe("formatDuration", () => {
  it("formats seconds under an hour", () => {
    expect(formatDuration(90)).toBe("1:30");
  });

  it("formats seconds over an hour", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("pads minutes and seconds with zeroes", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
  });

  it("returns empty string for null", () => {
    expect(formatDuration(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDuration(undefined)).toBe("");
  });

  it("returns empty string for 0", () => {
    expect(formatDuration(0)).toBe("");
  });
});

describe("slugify", () => {
  it("converts to lowercase and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(slugify("Tomorrowland 2024 (Main Stage)")).toBe(
      "tomorrowland-2024-main-stage"
    );
  });

  it("removes leading and trailing hyphens", () => {
    expect(slugify("--test--")).toBe("test");
  });

  it("collapses consecutive hyphens", () => {
    expect(slugify("a   b   c")).toBe("a-b-c");
  });

  it("transliterates accented characters", () => {
    expect(slugify("AVÉ")).toBe("ave");
    expect(slugify("Tiësto")).toBe("tiesto");
    expect(slugify("RÜFÜS DU SOL")).toBe("rufus-du-sol");
    expect(slugify("Ben Böhmer")).toBe("ben-bohmer");
    expect(slugify("Sónar")).toBe("sonar");
  });

  it("transliterates non-decomposable characters", () => {
    expect(slugify("Herø")).toBe("hero");
    expect(slugify("Ørjan")).toBe("orjan");
    expect(slugify("Beyoncé")).toBe("beyonce");
    expect(slugify("Rižik")).toBe("rizik");
  });

  it("generates hash fallback for non-Latin names", () => {
    const slug = slugify("???????");
    expect(slug.length).toBeGreaterThan(0);
    // Should be deterministic
    expect(slugify("???????")).toBe(slug);
  });

  it("uses prefix + hash for partially non-Latin names", () => {
    const slug = slugify("X");
    // Single char slug gets hash appended
    expect(slug).toMatch(/^x-/);
  });
});

describe("formatRelativeDate", () => {
  const now = new Date("2026-03-15T12:00:00Z");

  it("returns 'Today' for same-day dates", () => {
    expect(formatRelativeDate("2026-03-15T08:00:00Z", now)).toBe("Today");
  });

  it("returns 'Yesterday' for one day ago", () => {
    expect(formatRelativeDate("2026-03-14T12:00:00Z", now)).toBe("Yesterday");
  });

  it("returns 'N days ago' for 2-6 days", () => {
    expect(formatRelativeDate("2026-03-12T12:00:00Z", now)).toBe("3 days ago");
    expect(formatRelativeDate("2026-03-09T12:00:00Z", now)).toBe("6 days ago");
  });

  it("returns 'N weeks ago' for 7-29 days", () => {
    expect(formatRelativeDate("2026-03-08T12:00:00Z", now)).toBe("1 weeks ago");
    expect(formatRelativeDate("2026-03-01T12:00:00Z", now)).toBe("2 weeks ago");
  });

  it("returns locale date string for 30+ days", () => {
    const result = formatRelativeDate("2026-01-15T12:00:00Z", now);
    expect(result).not.toContain("ago");
    expect(result).not.toBe("Today");
  });
});
