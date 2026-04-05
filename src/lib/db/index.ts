import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _migrationPromise: Promise<void> | null = null;

function getDb() {
  if (!_db) {
    const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOSTNAME}:${process.env.PG_PORT}/${process.env.PG_DB}`;
    const client = postgres(connectionString, { max: 10 });
    _db = drizzle(client, { schema });

    // Kick off migrations immediately on first connection (runtime only)
    _migrationPromise = migrate(_db, { migrationsFolder: "./drizzle" })
      .then(() => console.log("Drizzle migrations applied"))
      .catch((err) => {
        console.error("Migration failed:", err);
        _migrationPromise = null;
      });
  }
  return _db;
}

// Proxy that lazily initializes the connection
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

export async function ensureMigrations() {
  getDb();
  if (_migrationPromise) await _migrationPromise;
}
