# Hausparty Load Tests

k6 scripts + an in-cluster Job for stress/benchmark runs against the dev
environment.

**These tests are manual-trigger only.** Nothing here is tracked by ArgoCD —
the k8s manifest lives alongside the scripts and is applied by hand.

## Prerequisites

- `k6` installed locally (`brew install k6`)
- `kubectl` context pointing at the Talos cluster (`KUBECONFIG=../../talos/kubeconfig`)
- Dev cluster reachable; `hausparty.dev.techgarden.gg` resolves and is healthy

## Scenarios

| File | Purpose |
|---|---|
| `k6/scenarios/mixed-traffic.js` | Realistic user mix: 40% home page, 60% search API. Ramps to 50 VUs, holds 5min. Use as pre-hardening baseline + post-hardening comparison. |

More scenarios (search-spam, admin-flood) land in later phases of the API
hardening rollout — see `/.ai/plans/logical-singing-bumblebee.md`.

## Running

### Smoke (local, fast feedback)

Run a tiny version against dev to confirm the script is valid and the dev
endpoint responds:

```bash
cd loadtests
k6 run --vus 1 --duration 10s k6/scenarios/mixed-traffic.js
```

Expect: 2–4 requests total, all 2xx, zero thresholds fail. If anything fails,
fix before the full run.

### Full run (in-cluster, against dev)

Runs inside the `hausparty` namespace so the test traffic traverses the same
network path real users do (Envoy Gateway, Cloudflare Tunnel bypassed —
this is direct cluster-internal DNS to the public hostname).

```bash
# Apply
kubectl apply -f loadtests/k8s/job.yaml

# Watch
kubectl logs -n hausparty -l job-name=hausparty-loadtest-baseline -f

# Clean up after run completes
kubectl delete -f loadtests/k8s/job.yaml
```

The Job is a one-shot: `backoffLimit: 0`, `restartPolicy: Never`. If it fails,
read the logs, fix the script, rebuild the ConfigMap, reapply.

## Interpreting results

k6 emits a summary at the end of the run. Key metrics for the baseline:

- `http_req_duration` — p50 / p95 / p99 latency. Our SLO targets are
  p50 < 200ms, p95 < 800ms, p99 < 2s.
- `http_req_failed` — error rate. Target: < 1% at baseline load.
- `search_duration_ms` — custom trend for search latency specifically
  (search is the known-expensive path and should move most under load).
- `iterations` — total completed user journeys.

Record these numbers alongside the git SHA under test. The Phase 5 re-run
(after hardening lands) compares against this baseline to quantify impact.

## Dev vs. prod safety

- These scripts are **dev-only**. Hitting prod with 50 VUs would be
  inconsiderate at best and abusive at worst.
- The Job manifest hard-codes `hausparty.dev.techgarden.gg`. Don't change the
  URL without thinking carefully — there is no prod equivalent intended.
- The dev DB is CNPG with a single instance. If the Job exposes a DB
  saturation issue, stop the run (`kubectl delete job ...`) and investigate
  before re-running.
