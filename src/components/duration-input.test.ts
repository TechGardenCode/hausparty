import { describe, it, expect } from "vitest";
import { secondsToMMSS, parseMMSS } from "./duration-input";

describe("secondsToMMSS", () => {
  it("returns empty string for null", () => {
    expect(secondsToMMSS(null)).toBe("");
  });

  it("returns empty string for 0", () => {
    expect(secondsToMMSS(0)).toBe("");
  });

  it("formats seconds under a minute", () => {
    expect(secondsToMMSS(45)).toBe("0:45");
  });

  it("formats exact minutes", () => {
    expect(secondsToMMSS(3600)).toBe("60:00");
  });

  it("formats minutes and seconds", () => {
    expect(secondsToMMSS(3930)).toBe("65:30");
  });

  it("pads seconds to two digits", () => {
    expect(secondsToMMSS(61)).toBe("1:01");
  });

  it("handles typical set duration (1 hour)", () => {
    expect(secondsToMMSS(3723)).toBe("62:03");
  });
});

describe("parseMMSS", () => {
  it("returns null for empty string", () => {
    expect(parseMMSS("")).toBeNull();
  });

  it("returns null for whitespace-only", () => {
    expect(parseMMSS("   ")).toBeNull();
  });

  it("parses MM:SS format", () => {
    expect(parseMMSS("65:30")).toBe(3930);
  });

  it("parses single-digit seconds", () => {
    expect(parseMMSS("1:5")).toBe(65);
  });

  it("parses 0:00", () => {
    expect(parseMMSS("0:00")).toBe(0);
  });

  it("returns null for seconds >= 60", () => {
    expect(parseMMSS("1:60")).toBeNull();
  });

  it("parses plain number as minutes", () => {
    expect(parseMMSS("65")).toBe(3900);
  });

  it("returns null for invalid format", () => {
    expect(parseMMSS("abc")).toBeNull();
  });

  it("handles multiple colons as plain number fallback", () => {
    // parseInt("1:2:3") = 1, treated as 1 minute
    expect(parseMMSS("1:2:3")).toBe(60);
  });

  it("trims whitespace before parsing", () => {
    expect(parseMMSS("  10:30  ")).toBe(630);
  });
});
