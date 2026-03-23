import Link from "next/link";
import Image from "next/image";
import { Play, Video, Headphones } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { Platform } from "@/lib/types/database";

interface SetCardProps {
  slug: string;
  title: string;
  artistNames: string[];
  eventName: string | null;
  durationSeconds: number | null;
  platform?: Platform;
  thumbnailUrl?: string | null;
}

export function SetCard({
  slug,
  title,
  artistNames,
  eventName,
  durationSeconds,
  platform,
  thumbnailUrl,
}: SetCardProps) {
  return (
    <Link
      href={`/sets/${slug}`}
      className="group flex w-[280px] shrink-0 flex-col overflow-hidden rounded-lg bg-bg-surface transition-colors hover:bg-bg-surface-hover"
    >
      <div className="relative aspect-video w-full bg-border-subtle">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={`${artistNames.join(", ")} — ${eventName || title}`}
            fill
            className="object-cover transition-opacity group-hover:opacity-80"
            sizes="280px"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="h-10 w-10 text-text-tertiary transition-colors group-hover:text-accent-primary drop-shadow-md" />
        </div>
        {durationSeconds && (
          <span className="absolute bottom-2 right-2 rounded bg-bg-primary/80 px-1.5 py-0.5 font-mono text-xs text-text-secondary">
            {formatDuration(durationSeconds)}
          </span>
        )}
        {platform && (
          <span className="absolute bottom-2 left-2">
            {platform === "youtube" ? (
              <Video className="h-4 w-4 text-text-tertiary" />
            ) : (
              <Headphones className="h-4 w-4 text-text-tertiary" />
            )}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <span className="text-sm font-semibold text-text-primary line-clamp-1">
          {artistNames.join(", ")}
        </span>
        <span className="text-xs text-text-secondary line-clamp-1">
          {eventName || title}
        </span>
      </div>
    </Link>
  );
}
