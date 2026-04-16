export interface OEmbedMetadata {
  title: string;
  author: string;
  thumbnailUrl: string | undefined;
}

export async function fetchYouTubeMetadata(
  url: string
): Promise<OEmbedMetadata | null> {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
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
