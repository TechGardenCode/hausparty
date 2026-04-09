import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Pool sizing & PgBouncer compatibility notes:
//
// The app is designed to connect through a PgBouncer Pooler (CNPG Pooler CR)
// in transaction-pool mode. PgBouncer multiplexes many logical app
// connections through a small fixed pool of real backend connections, so the
// app-side pool can stay tiny — we don't need one slot per concurrent
// request, we just need enough concurrency to keep the pooler happy.
//
// Pool sizing math (holds whether we go through pooler or direct):
//   CNPG max_connections ≥ (app POOL_MAX × app_replicas)
//                         + (pooler default_pool_size × pooler_instances)
//                         + other apps
//                         + ~8 reserved (CNPG operator + superuser)
//
// - `max`: per Node.js process. Low by design — the pooler does the heavy
//   multiplexing. Override via PG_POOL_MAX env var if a deployment truly
//   needs more (e.g. long-running background jobs).
// - Dev uses a very small pool so HMR churn can't exhaust dev CNPG.
// - `prepare: false`: REQUIRED for transaction-mode PgBouncer — prepared
//   statements can leak across pool sessions. Harmless when talking directly
//   to a CNPG -rw service, so we set it unconditionally.
// - `idle_timeout`: release idle sockets so they don't hold pooler slots.
// - `connect_timeout`: fail fast on slow/dead DB instead of piling up.
// - `max_lifetime`: rotate connections periodically (TLS cert rotation,
//   pooler graceful restarts).
const isDev = process.env.NODE_ENV !== "production";
const DEFAULT_POOL_MAX = isDev ? 2 : 5;
const POOL_MAX = Number(process.env.PG_POOL_MAX) || DEFAULT_POOL_MAX;

// HMR fix: in dev Next.js re-evaluates modules on every hot reload, creating
// a fresh `_db` (and thus a fresh pool of N connections) each time. Old
// pools linger until GC closes them, which at scale exhausts CNPG. Stash
// the client on globalThis so HMR reuses a single pool for the life of the
// dev process.
type DbClient = ReturnType<typeof drizzle<typeof schema>>;
const globalForDb = globalThis as unknown as { __hausparty_db?: DbClient };

function getDb(): DbClient {
  if (globalForDb.__hausparty_db) return globalForDb.__hausparty_db;

  const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOSTNAME}:${process.env.PG_PORT}/${process.env.PG_DB}`;
  const client = postgres(connectionString, {
    max: POOL_MAX,
    prepare: false, // required for transaction-mode PgBouncer
    idle_timeout: 20, // seconds — release idle sockets back to the pooler
    connect_timeout: 10, // seconds — fail fast on slow DB
    max_lifetime: 60 * 30, // seconds — rotate connections every 30min
  });
  const db = drizzle(client, { schema });

  globalForDb.__hausparty_db = db;
  return db;
}

// Lazy proxy — avoids connecting at build time (env vars don't exist during `next build`)
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const real = getDb();
    const value = (real as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(real);
    }
    return value;
  },
});
