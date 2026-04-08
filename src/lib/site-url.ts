/**
 * Canonical site URL for this deployment. Used to build shareable links and
 * OpenGraph URLs in metadata. Reads AUTH_URL (which is set per-env and
 * already used by the auth flow) so share links always match the env the
 * user is browsing from — local, dev, or prod.
 *
 * Server-only: these helpers are called from Server Components and metadata
 * functions. Do not import from client components.
 */
export function getSiteUrl(): string {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ??
    "https://hausparty.dev.techgarden.gg"
  );
}

/** Build an absolute URL for a relative path on this deployment. */
export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
