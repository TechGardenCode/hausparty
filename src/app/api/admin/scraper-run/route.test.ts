import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsertReturning = vi.fn();
const mockGetInFlightRun = vi.fn();
const mockRunWithId = vi.fn();
const mockGetScraperByName = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        returning: (...args: unknown[]) => mockInsertReturning(...args),
      }),
    }),
  },
}));

vi.mock("@/lib/services/scrapers/in-flight", () => ({
  getInFlightRun: (...args: unknown[]) => mockGetInFlightRun(...args),
}));

vi.mock("@/lib/services/scrapers/registry", () => ({
  getScraperByName: (...args: unknown[]) => mockGetScraperByName(...args),
}));

vi.mock("@/lib/services/scrapers/runner", () => ({
  ScraperRunner: class {
    runWithId = (...args: unknown[]) => mockRunWithId(...args);
  },
}));

import { POST } from "./route";

function makeRequest(body?: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/admin/scraper-run", {
    method: "POST",
    headers: headers ?? { authorization: "Bearer test-key-123" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /api/admin/scraper-run", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ADMIN_API_KEY", "test-key-123");
    mockRunWithId.mockResolvedValue({ runId: "run-1", stats: {} });
  });

  it("returns 401 when authorization header is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/scraper-run", {
        method: "POST",
        body: JSON.stringify({ scraperName: "edmtrain" }),
      })
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/scraper-run", {
        method: "POST",
        headers: { authorization: "Bearer test-key-123" },
        body: "not-json",
      })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when scraperName is missing", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/scraperName/);
  });

  it("returns 400 when scraperName is unknown", async () => {
    mockGetScraperByName.mockReturnValue(undefined);
    const response = await POST(makeRequest({ scraperName: "nope" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Unknown scraper/);
  });

  it("returns 409 when a run for the same scraper is in flight", async () => {
    mockGetScraperByName.mockReturnValue({ create: () => ({ name: "edmtrain" }) });
    mockGetInFlightRun.mockResolvedValue({
      id: "existing-run",
      startedAt: new Date("2026-04-16T00:00:00.000Z"),
    });
    const response = await POST(makeRequest({ scraperName: "edmtrain" }));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("in_flight");
    expect(body.runId).toBe("existing-run");
    expect(body.startedAt).toBe("2026-04-16T00:00:00.000Z");
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it("returns 202 and starts the run when no run is in flight", async () => {
    mockGetScraperByName.mockReturnValue({ create: () => ({ name: "edmtrain" }) });
    mockGetInFlightRun.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([{ id: "new-run" }]);
    const response = await POST(
      makeRequest({
        scraperName: "edmtrain",
        params: { startDate: "2026-04-16" },
      })
    );
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.runId).toBe("new-run");
    expect(mockRunWithId).toHaveBeenCalledWith(
      "new-run",
      expect.anything(),
      { startDate: "2026-04-16" }
    );
  });

  it("defaults params to empty object when omitted", async () => {
    mockGetScraperByName.mockReturnValue({ create: () => ({ name: "edmtrain" }) });
    mockGetInFlightRun.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([{ id: "new-run" }]);
    const response = await POST(makeRequest({ scraperName: "edmtrain" }));
    expect(response.status).toBe(202);
    expect(mockRunWithId).toHaveBeenCalledWith("new-run", expect.anything(), {});
  });
});
