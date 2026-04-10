import { NextResponse } from "next/server";

const SCRIPT_PATH = "/op1.js";

/**
 * Custom OpenPanel proxy — replaces @openpanel/nextjs's createRouteHandler
 * which breaks on Next.js 16 / Node 24 due to TransformStream API changes.
 *
 * Two jobs:
 *  GET  /api/op/op1.js  → fetch tracker script from self-hosted OpenPanel
 *  POST /api/op/track   → forward event payload to OpenPanel API
 */

function getApiBase(): string {
  // NEXT_PUBLIC_OPENPANEL_API_URL = "https://openpanel.techgarden.gg/api"
  // We need the base domain for the script, and the /api path for track calls.
  return process.env.NEXT_PUBLIC_OPENPANEL_API_URL ?? "https://openpanel.techgarden.gg/api";
}

function getDomainBase(): string {
  const apiUrl = getApiBase();
  // Strip trailing /api to get domain root for script fetch
  return apiUrl.replace(/\/api\/?$/, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!url.pathname.endsWith(SCRIPT_PATH)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const scriptUrl = `${getDomainBase()}${SCRIPT_PATH}`;

  try {
    const res = await fetch(scriptUrl, { next: { revalidate: 86400 } });
    const script = await res.text();

    return new NextResponse(script, {
      headers: {
        "Content-Type": "text/javascript",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch script", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const trackIndex = url.pathname.indexOf("/track");

  if (trackIndex === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const trackPath = url.pathname.substring(trackIndex);
  const apiBase = getApiBase();

  // Build forwarding headers — origin from browser, not server
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("openpanel-client-id", request.headers.get("openpanel-client-id") ?? "");

  const origin = request.headers.get("origin")
    ?? (() => { const u = new URL(request.url); return `${u.protocol}//${u.host}`; })();
  headers.set("origin", origin);

  headers.set("User-Agent", request.headers.get("user-agent") ?? "");

  const clientIp = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]
    ?? request.headers.get("x-vercel-forwarded-for");
  if (clientIp) {
    headers.set("openpanel-client-ip", clientIp);
  }

  try {
    // Use request.text() instead of streaming to avoid Node 24 TransformStream bug
    const body = await request.text();

    const res = await fetch(`${apiBase}${trackPath}`, {
      method: "POST",
      headers,
      body,
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return NextResponse.json(await res.json(), { status: res.status });
    }
    return NextResponse.json(await res.text(), { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to proxy request", message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
