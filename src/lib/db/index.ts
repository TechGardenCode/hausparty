import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _migrated = false;

function getDb() {
  if (!_db) {
    const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOSTNAME}:${process.env.PG_PORT}/${process.env.PG_DB}`;
    const client = postgres(connectionString, { max: 10 });
    _db = drizzle(client, { schema });
  }
  return _db;
}

async function ensureMigrated() {
  if (_migrated) return;
  _migrated = true;
  try {
    await migrate(getDb(), { migrationsFolder: "./drizzle" });
  } catch (err) {
    _migrated = false;
    console.error("Migration failed:", err);
    throw err;
  }
}

// Proxy that lazily initializes the connection and runs migrations
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

export { ensureMigrated as ensureMigrations };
