/**
 * One-time fixture capture script.
 *
 * Run: npx tsx src/lib/services/scrapers/__fixtures__/capture-edmtrain.ts
 *
 * Makes ONE API call with tight params and saves the response
 * to edmtrain-events.json for use in tests. The fixture is committed
 * to the repo so tests never hit the real API.
 */

import { writeFileSync } from "fs";
import { join } from "path";

async function capture() {
  const apiKey = process.env.EDMTRAIN_API_KEY;
  if (!apiKey) {
    console.error("Set EDMTRAIN_API_KEY env var before running this script.");
    process.exit(1);
  }

  // Narrow window: 1 week from today, electronic only
  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const url = new URL("https://edmtrain.com/api/events");
  url.searchParams.set("client", apiKey);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);

  console.log(`Fetching: ${url.toString().replace(apiKey, "***")}`);

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`API returned ${response.status}: ${response.statusText}`);
    process.exit(1);
  }

  const json = await response.json();
  const outPath = join(__dirname, "edmtrain-events.json");
  writeFileSync(outPath, JSON.stringify(json, null, 2));
  console.log(
    `Saved ${json.data?.length ?? 0} events to ${outPath}`
  );
}

capture();
