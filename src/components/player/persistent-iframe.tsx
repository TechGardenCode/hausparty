"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePlayer } from "./player-context";
import { getEmbedUrl } from "@/lib/player/embed-url";
import { createMediaBridge, type MediaBridge } from "@/lib/player/media-bridge";
import { cn } from "@/lib/utils";

export function PersistentIframe() {
  const { state, markLoaded, stop, registerPositionGetter } = usePlayer();
  const pathname = usePathname();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeRef = useRef<MediaBridge | null>(null);

  // Wire the iframe ↔ media-bridge every time the active source changes.
  // The iframe itself re-mounts on `key={embedUrl}` (see below), so this
  // effect fires on each new source.
  useEffect(() => {
    if (state.status !== "active" || !state.source) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let disposed = false;
    let pendingBridge: MediaBridge | null = null;
    const platform = state.source.platform;

    createMediaBridge(iframe, platform, {
      onEnded: () => {
        // Clear resume + fire `end` beacon, drop back to idle.
        stop();
      },
      startSeconds: state.startPositionSeconds,
    })
      .then((bridge) => {
        if (disposed) {
          bridge.dispose();
          return;
        }
        pendingBridge = bridge;
        bridgeRef.current = bridge;
        registerPositionGetter(() => bridge.getPosition());
      })
      .catch(() => {
        // Script load failed — fall back to wall-clock (already the default).
      });

    return () => {
      disposed = true;
      registerPositionGetter(null);
      bridgeRef.current = null;
      try {
        pendingBridge?.dispose();
      } catch {
        // ignore
      }
    };
  }, [
    state.status,
    state.source,
    state.startPositionSeconds,
    stop,
    registerPositionGetter,
  ]);

  if (state.status === "idle" || !state.source) return null;

  const embedUrl = getEmbedUrl(
    state.source,
    state.autoplay,
    state.startPositionSeconds
  );
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
        key={embedUrl}
        ref={iframeRef}
        src={embedUrl}
        onLoad={markLoaded}
        className="absolute inset-0 h-full w-full"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        title="Set player"
      />
    </div>
  );
}
