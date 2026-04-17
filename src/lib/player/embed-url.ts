import type { Source } from "@/lib/types/database";

export function getEmbedUrl(
  source: Source,
  autoplay = false,
  startSeconds = 0
): string | null {
  if (!source.embedSupported || !source.isActive) return null;

  if (source.platform === "youtube") {
    const match = source.url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (match) {
      const params = new URLSearchParams({
        // Inline playback on iOS Safari — required for mobile to not error /
        // force fullscreen.
        playsinline: "1",
        // Modestly reduces branding overlays.
        modestbranding: "1",
        // Restrict related videos at end to same channel (can't fully disable).
        rel: "0",
        // Required for the YT IFrame Player API — lets us read currentTime
        // and subscribe to state changes from the parent window.
        enablejsapi: "1",
      });
      if (autoplay) params.set("autoplay", "1");
      if (startSeconds > 0) params.set("start", String(Math.floor(startSeconds)));
      return `https://www.youtube.com/embed/${match[1]}?${params.toString()}`;
    }
  }

  if (source.platform === "soundcloud") {
    const autoPlayParam = autoplay ? "true" : "false";
    const base = `https://w.soundcloud.com/player/?url=${encodeURIComponent(source.url)}&auto_play=${autoPlayParam}&color=%23A78BFA&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
    // Widget honors `#t=NNNs` as a seek-on-load hint.
    return startSeconds > 0 ? `${base}#t=${Math.floor(startSeconds)}s` : base;
  }

  return null;
}
