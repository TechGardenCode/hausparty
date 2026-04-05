import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.PG_HOSTNAME!,
    port: parseInt(process.env.PG_PORT || "5432"),
    database: process.env.PG_DB!,
    user: process.env.PG_USER!,
    password: process.env.PG_PASSWORD!,
  },
});
