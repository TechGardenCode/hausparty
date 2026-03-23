"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Youtube, Headphones } from "lucide-react";
import Image from "next/image";
import { usePlayer } from "./player-context";
import { getEmbedUrl } from "@/lib/player/embed-url";
import { cn } from "@/lib/utils";

export function MiniPlayer() {
  const { state, stop } = usePlayer();
  const pathname = usePathname();

  if (state.status === "idle" || !state.source) return null;

  const embedUrl = getEmbedUrl(state.source);
  if (!embedUrl) return null;

  // Hide mini bar only when on the playing set's own page
  const isPlayingSetPage = pathname === `/sets/${state.setSlug}`;
  if (isPlayingSetPage) return null;

  const isYouTube = state.source.platform === "youtube";

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed bar */}
      <div className="h-14 w-full sm:h-16" />

      {/* Fixed player bar */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[60] border-t border-border-subtle bg-bg-surface/95 backdrop-blur-sm",
          "bottom-14 h-14 sm:bottom-0 sm:h-16"
        )}
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center gap-3 px-4">
          {/* Thumbnail */}
          <Link
            href={`/sets/${state.setSlug}`}
            className="relative h-10 w-[71px] shrink-0 overflow-hidden rounded bg-bg-primary sm:h-11 sm:w-[78px]"
          >
            {state.thumbnailUrl ? (
              <Image
                src={state.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                sizes="78px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {isYouTube ? (
                  <Youtube className="h-5 w-5 text-text-tertiary" />
                ) : (
                  <Headphones className="h-5 w-5 text-text-tertiary" />
                )}
              </div>
            )}
          </Link>

          {/* Set info */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link
              href={`/sets/${state.setSlug}`}
              className="truncate text-sm font-medium text-text-primary transition-colors hover:text-accent-primary"
            >
              {state.setTitle}
            </Link>
            {isYouTube ? (
              <Youtube className="h-4 w-4 shrink-0 text-text-tertiary" />
            ) : (
              <Headphones className="h-4 w-4 shrink-0 text-text-tertiary" />
            )}
          </div>

          {/* Close button */}
          <button
            onClick={stop}
            className="shrink-0 rounded-full p-1.5 text-text-tertiary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
            aria-label="Close player"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
