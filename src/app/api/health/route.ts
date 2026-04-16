export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Non-streaming plaintext response. Kubernetes probes read headers and close
// the body; pointing them at the RSC-rendered `/` page corrupts Node's
// internal TransformStream state under load (see vercel/next.js#75995,
// #68319). A plain `new Response(...)` body avoids that entire stream plumbing.
export async function GET() {
  return new Response("ok", {
    status: 200,
    headers: {
      "content-type": "text/plain",
      "cache-control": "no-store",
    },
  });
}
