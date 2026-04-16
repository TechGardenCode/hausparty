// Flood /api/admin/* without any credentials. Validates the admin
// Bearer-token gate holds — responses must be 401 (not 200, not 500,
// not handled by business logic). Quick sanity check that admin
// endpoints aren't accidentally open.
import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://hausparty.dev.techgarden.gg";

const rejected = new Rate("rejected_401_403");

export const options = {
  scenarios: {
    flood: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "10s",
      preAllocatedVUs: 5,
    },
  },
  thresholds: {
    rejected_401_403: ["rate>0.99"],
    "http_reqs{expected_response:true}": [],
  },
};

export default function () {
  // Target both admin endpoints — both should reject without the
  // ADMIN_API_KEY bearer token.
  const pickProcess = Math.random() < 0.5;
  const path = pickProcess
    ? "/api/admin/process-submissions"
    : "/api/admin/refresh-search";

  const res = http.post(`${BASE_URL}${path}`, "{}", {
    headers: { "content-type": "application/json" },
  });
  rejected.add(res.status === 401 || res.status === 403);
  check(res, {
    "unauth request rejected": (r) => r.status === 401 || r.status === 403,
    "never returns 200": (r) => r.status !== 200,
    "never returns 5xx": (r) => r.status < 500,
  });
}
