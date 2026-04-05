import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOSTNAME}:${process.env.PG_PORT}/${process.env.PG_DB}`;

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

console.log("Running Drizzle migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied successfully.");

await client.end();
process.exit(0);
