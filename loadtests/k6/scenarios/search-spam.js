// Burst /api/search from a single client IP. Validates the app-layer
// rate limiter (Phase 2) fires as designed: 20/min/IP unauth means the
// first ~20 requests succeed, the rest should 429 with Retry-After.
//
// Threshold asserts >80% of requests are 429 — anything less means the
// limiter isn't engaging and we have a regression.
import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://hausparty.dev.techgarden.gg";

const rateLimited = new Rate("rate_limited_429");
const allowedThroughLimit = new Rate("allowed_200");

export const options = {
  scenarios: {
    spam: {
      executor: "constant-arrival-rate",
      rate: 50,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 20,
      maxVUs: 30,
    },
  },
  thresholds: {
    rate_limited_429: ["rate>0.8"],
    "http_reqs{expected_response:true}": [],
  },
};

export default function searchSpam() {
  const res = http.get(`${BASE_URL}/api/search?q=spam${__ITER % 10}`);
  rateLimited.add(res.status === 429);
  allowedThroughLimit.add(res.status === 200);
  check(res, {
    "status is 200 or 429": (r) => r.status === 200 || r.status === 429,
    // k6's r.headers is case-sensitive; app-layer emits lowercase
    // `retry-after`, Envoy emits `Retry-After`. Check both.
    "429 has retry-after header": (r) =>
      r.status !== 429 ||
      !!(r.headers["Retry-After"] || r.headers["retry-after"]),
  });
}
