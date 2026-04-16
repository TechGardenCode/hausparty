import type { OEmbedMetadata } from "./youtube";

export async function fetchSoundCloudMetadata(
  url: string
): Promise<OEmbedMetadata | null> {
  const res = await fetch(
    `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return {
    title: data.title as string,
    author: data.author_name as string,
    thumbnailUrl: data.thumbnail_url as string | undefined,
  };
}
