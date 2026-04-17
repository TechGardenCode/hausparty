"use client";

import { useRef, useState, useLayoutEffect } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { EmbeddedPlayer } from "./embedded-player";
import { SourceRow } from "./source-row";
import { usePlayer } from "./player/player-context";
import { getEmbedUrl } from "@/lib/player/embed-url";
import { readResume } from "@/lib/hooks/use-resume";
import type { Source } from "@/lib/types/database";

interface SourceSwitcherProps {
  sources: Source[];
  setSlug: string;
  setTitle: string;
  thumbnailUrl: string | null;
  autoplay?: boolean;
  resumePositionSeconds?: number;
}

export function SourceSwitcher({
  sources,
  setSlug,
  setTitle,
  thumbnailUrl,
  autoplay = false,
  resumePositionSeconds = 0,
}: SourceSwitcherProps) {
  const activeSources = sources.filter((s) => s.isActive);
  const { state: playerState, play } = usePlayer();
  const hasAutoPlayed = useRef(false);

  // Pick the initial index by consulting the resume slot: if the user was
  // last listening to a specific source on this set, land on that source
  // rather than the default first-in-list. Falls back to platform match,
  // then 0. Computed lazily so SSR renders with index=0 and the client
  // corrects before the first paint.
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = readResume();
    if (!stored || stored.setSlug !== setSlug) return 0;
    const byId = activeSources.findIndex((s) => s.id === stored.sourceId);
    if (byId >= 0) return byId;
    const byPlatform = activeSources.findIndex(
      (s) => s.platform === stored.platform
    );
    return byPlatform >= 0 ? byPlatform : 0;
  });
  const current = activeSources[activeIndex];

  // Auto-register with the global player only if nothing is currently playing.
  // This preserves the active set when browsing to other set pages.
  //
  // Mobile autoplay gate: on coarse-pointer devices (phones, tablets) browsers
  // block autoplay without a prior user gesture, so we force the initial mount
  // to autoplay=false and show the iframe's own play button. Once the user taps
  // play (or selects another source), subsequent transitions can autoplay.
  useLayoutEffect(() => {
    if (
      !hasAutoPlayed.current &&
      current &&
      playerState.status === "idle"
    ) {
      // Resume preference ladder:
      //   1. Explicit `?resume=N` query param (user clicked the resume pill).
      //   2. localStorage entry matching this set (they reloaded mid-listen).
      //   3. 0 (fresh play).
      let effectiveResume = resumePositionSeconds;
      if (effectiveResume <= 0) {
        const stored = readResume();
        if (stored && stored.setSlug === setSlug) {
          effectiveResume = Math.max(0, Math.floor(stored.positionSeconds));
        }
      }

      if (!getEmbedUrl(current, autoplay, effectiveResume)) return;

      const isTouchOnly =
        typeof window !== "undefined" &&
        window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      // Resume from query param implies autoplay intent (user clicked the
      // pill). Resume from localStorage respects the user's autoplay pref so
      // they don't get surprise audio on page reload.
      const initialAutoplay =
        resumePositionSeconds > 0
          ? true
          : isTouchOnly
            ? false
            : autoplay;
      play(
        current,
        setSlug,
        setTitle,
        thumbnailUrl,
        initialAutoplay,
        effectiveResume
      );
      hasAutoPlayed.current = true;
    }
  }, [
    current,
    setSlug,
    setTitle,
    thumbnailUrl,
    play,
    playerState.status,
    autoplay,
    resumePositionSeconds,
  ]);

  if (!current) return null;

  // Explicit source selection always switches the global player with autoplay
  const handleSelect = (index: number) => {
    setActiveIndex(index);
    const source = activeSources[index];
    if (source) {
      play(source, setSlug, setTitle, thumbnailUrl, true);
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
            isLoading={playerState.isLoading && i === activeIndex}
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
          onClick={() => play(current, setSlug, setTitle, thumbnailUrl, true)}
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
