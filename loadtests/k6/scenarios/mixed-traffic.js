import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://hausparty.dev.techgarden.gg";

const SEARCH_TERMS = [
  "house",
  "techno",
  "deep",
  "detroit",
  "minimal",
  "progressive",
  "acid",
  "dub",
  "melodic",
  "afro",
];

const errors = new Rate("errors");
const searchDuration = new Trend("search_duration_ms", true);
const homeDuration = new Trend("home_duration_ms", true);

export const options = {
  scenarios: {
    baseline: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "2m", target: 50 },
        { duration: "5m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<2000"],
    search_duration_ms: ["p(95)<500"],
    errors: ["rate<0.01"],
  },
  summaryTrendStats: ["min", "med", "avg", "p(90)", "p(95)", "p(99)", "max"],
};

export default function () {
  const pickSearch = Math.random() < 0.6;

  if (pickSearch) {
    const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    const res = http.get(`${BASE_URL}/api/search?q=${term}`, {
      tags: { endpoint: "search" },
    });
    searchDuration.add(res.timings.duration);
    const ok = check(res, {
      "search status 200": (r) => r.status === 200,
      "search returns JSON": (r) =>
        (r.headers["Content-Type"] || "").includes("application/json"),
    });
    if (!ok) errors.add(1);
  } else {
    const res = http.get(`${BASE_URL}/`, { tags: { endpoint: "home" } });
    homeDuration.add(res.timings.duration);
    const ok = check(res, {
      "home status 200": (r) => r.status === 200,
    });
    if (!ok) errors.add(1);
  }

  sleep(Math.random() * 2 + 1);
}
