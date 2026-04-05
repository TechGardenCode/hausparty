import type { Source } from "@/lib/types/database";

export function getEmbedUrl(source: Source, autoplay = false): string | null {
  if (!source.embedSupported || !source.isActive) return null;

  if (source.platform === "youtube") {
    const match = source.url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (match) {
      const base = `https://www.youtube.com/embed/${match[1]}`;
      return autoplay ? `${base}?autoplay=1` : base;
    }
  }

  if (source.platform === "soundcloud") {
    const autoPlayParam = autoplay ? "true" : "false";
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(source.url)}&auto_play=${autoPlayParam}&color=%23A78BFA&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
  }

  return null;
}
