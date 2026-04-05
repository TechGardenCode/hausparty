"use client";

import { useRef, useState, useLayoutEffect } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { EmbeddedPlayer } from "./embedded-player";
import { SourceRow } from "./source-row";
import { usePlayer } from "./player/player-context";
import { getEmbedUrl } from "@/lib/player/embed-url";
import type { Source } from "@/lib/types/database";

interface SourceSwitcherProps {
  sources: Source[];
  setSlug: string;
  setTitle: string;
  thumbnailUrl: string | null;
  autoplay?: boolean;
}

export function SourceSwitcher({
  sources,
  setSlug,
  setTitle,
  thumbnailUrl,
  autoplay = false,
}: SourceSwitcherProps) {
  const activeSources = sources.filter((s) => s.isActive);
  const [activeIndex, setActiveIndex] = useState(0);
  const current = activeSources[activeIndex];
  const { state: playerState, play } = usePlayer();
  const hasAutoPlayed = useRef(false);

  // Auto-register with the global player only if nothing is currently playing.
  // This preserves the active set when browsing to other set pages.
  useLayoutEffect(() => {
    if (
      !hasAutoPlayed.current &&
      current &&
      getEmbedUrl(current, autoplay) &&
      playerState.status === "idle"
    ) {
      play(current, setSlug, setTitle, thumbnailUrl, autoplay);
      hasAutoPlayed.current = true;
    }
  }, [current, setSlug, setTitle, thumbnailUrl, play, playerState.status, autoplay]);

  if (!current) return null;

  // Explicit source selection always switches the global player
  const handleSelect = (index: number) => {
    setActiveIndex(index);
    const source = activeSources[index];
    if (source) {
      play(source, setSlug, setTitle, thumbnailUrl, autoplay);
    }
  };

  const embedUrl = getEmbedUrl(current, autoplay);
  const isPlayingThisSet =
    playerState.status === "active" && playerState.setSlug === setSlug;

  // When the global player is handling this set, PersistentIframe renders the player
  if (isPlayingThisSet && embedUrl) {
    return activeSources.length > 1 ? (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Sources
        </span>
        {activeSources.map((source, i) => (
          <SourceRow
            key={source.id}
            source={source}
            isActive={i === activeIndex}
            onSelect={() => handleSelect(i)}
          />
        ))}
      </div>
    ) : null;
  }

  // Another set is playing — show a preview with a play button to switch
  if (playerState.status === "active" && embedUrl) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => play(current, setSlug, setTitle, thumbnailUrl, autoplay)}
          className="group relative aspect-video w-full overflow-hidden rounded-lg bg-bg-surface"
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={setTitle}
              fill
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-bg-surface-hover to-bg-surface" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary/90 transition-transform group-hover:scale-110">
              <Play className="h-7 w-7 fill-white text-white" />
            </div>
          </div>
        </button>
        {activeSources.length > 1 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Sources
            </span>
            {activeSources.map((source, i) => (
              <SourceRow
                key={source.id}
                source={source}
                isActive={i === activeIndex}
                onSelect={() => handleSelect(i)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // No global player active, or embed not available — show inline player
  return (
    <div className="flex flex-col gap-4">
      <EmbeddedPlayer source={current} autoplay={autoplay} />
      {activeSources.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Sources
          </span>
          {activeSources.map((source, i) => (
            <SourceRow
              key={source.id}
              source={source}
              isActive={i === activeIndex}
              onSelect={() => handleSelect(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
