import Link from "next/link";
import Image from "next/image";
import { Play, Video, Headphones, Disc3 } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { Platform } from "@/lib/types/database";

interface SetRowProps {
  slug: string;
  artistNames: string[];
  eventName: string | null;
  durationSeconds: number | null;
  genreNames?: string[];
  platform?: Platform;
  sourceCount?: number;
  thumbnailUrl?: string | null;
}

export function SetRow({
  slug,
  artistNames,
  eventName,
  durationSeconds,
  genreNames,
  platform,
  sourceCount,
  thumbnailUrl,
}: SetRowProps) {
  return (
    <Link
      href={`/sets/${slug}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-bg-surface"
    >
      {thumbnailUrl ? (
        <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded">
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
      ) : (
        <Play className="h-4 w-4 shrink-0 text-text-tertiary transition-colors group-hover:text-accent-primary" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0 sm:flex-row sm:items-center sm:gap-2">
        <span className="truncate text-sm font-medium text-text-primary">
          {artistNames.join(", ")}
        </span>
        {eventName && (
          <>
            <span className="hidden text-text-tertiary sm:inline">&mdash;</span>
            <span className="truncate text-xs text-text-secondary sm:text-sm">
              {eventName}
            </span>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {genreNames && genreNames.length > 0 && (
          <span className="hidden text-xs text-text-tertiary sm:inline">
            {genreNames[0]}
          </span>
        )}
        {sourceCount !== undefined && sourceCount > 1 && (
          <span className="flex items-center gap-1 text-xs text-text-tertiary">
            <Disc3 className="h-3 w-3" />
            {sourceCount} sources
          </span>
        )}
        {platform && (
          <span className="text-text-tertiary">
            {platform === "youtube" ? (
              <Video className="h-3.5 w-3.5" />
            ) : (
              <Headphones className="h-3.5 w-3.5" />
            )}
          </span>
        )}
        {durationSeconds && (
          <span className="font-mono text-xs text-text-tertiary">
            {formatDuration(durationSeconds)}
          </span>
        )}
      </div>
    </Link>
  );
}
