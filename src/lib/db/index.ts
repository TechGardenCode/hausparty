import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Pool sizing notes:
// - `max` is per Node.js process. CNPG max_connections is shared across ALL
//   pods of ALL apps hitting the cluster. Budget: max × replicas ≤
//   CNPG max_connections − reserved slots for CNPG itself and other apps.
// - Dev uses a small pool so HMR churn can't exhaust the shared dev CNPG.
// - Prod defaults to 10 and can be overridden via PG_POOL_MAX env var when
//   replica count changes.
// - `idle_timeout` releases idle sockets so they don't hold slots forever.
// - `connect_timeout` fails fast instead of piling up requests on a slow DB.
// - `max_lifetime` rotates connections periodically.
const isDev = process.env.NODE_ENV !== "production";
const DEFAULT_POOL_MAX = isDev ? 3 : 10;
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
    idle_timeout: 20, // seconds — release idle sockets back to CNPG
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
