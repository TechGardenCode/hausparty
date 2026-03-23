"use client";

import { AlertCircle } from "lucide-react";
import type { Source } from "@/lib/types/database";
import { getEmbedUrl } from "@/lib/player/embed-url";

export function EmbeddedPlayer({ source, autoplay = false }: { source: Source; autoplay?: boolean }) {
  const embedUrl = getEmbedUrl(source, autoplay);

  if (!embedUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-bg-surface">
        <div className="flex flex-col items-center gap-2 text-text-tertiary">
          <AlertCircle className="h-8 w-8" />
          <span className="text-sm">
            {source.is_active
              ? "Embedding not available"
              : "Source unavailable"}
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-primary hover:underline"
          >
            Open on {source.platform === "youtube" ? "YouTube" : "SoundCloud"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-bg-surface">
      <iframe
        src={embedUrl}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        title="Set player"
      />
    </div>
  );
}
