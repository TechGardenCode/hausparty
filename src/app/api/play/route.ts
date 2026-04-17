import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { recordPlayEvent } from "@/lib/actions/play";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { parsePlayEventBody } from "@/lib/player/parse-body";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  // Anonymous users: client still fires for consistency; quietly drop.
  if (!user) return new Response(null, { status: 204 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const body = parsePlayEventBody(json);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  await recordPlayEvent({
    userId: user.id,
    setSlug: body.setSlug,
    sourceId: body.sourceId,
    platform: body.platform,
    startedAt: new Date(body.startedAtISO),
    positionSeconds: body.positionSeconds,
    event: body.event,
  });

  return new Response(null, { status: 204 });
}
