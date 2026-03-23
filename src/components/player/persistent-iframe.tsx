"use client";

import { usePathname } from "next/navigation";
import { usePlayer } from "./player-context";
import { getEmbedUrl } from "@/lib/player/embed-url";
import { cn } from "@/lib/utils";

export function PersistentIframe() {
  const { state } = usePlayer();
  const pathname = usePathname();

  if (state.status === "idle" || !state.source) return null;

  const embedUrl = getEmbedUrl(state.source, state.autoplay);
  if (!embedUrl) return null;

  // Only show inline when the playing set matches the current page
  const isPlayingSetPage = pathname === `/sets/${state.setSlug}`;

  return (
    <div
      className={cn(
        isPlayingSetPage
          ? "relative mb-8 aspect-video w-full overflow-hidden rounded-lg bg-bg-surface"
          : "pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden"
      )}
    >
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
