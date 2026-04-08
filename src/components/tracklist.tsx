"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface Track {
  id: string;
  position: number;
  title: string;
  timestamp_seconds: number | null;
}

export function Tracklist({ tracks }: { tracks: Track[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tracks : tracks.slice(0, 5);
  const hasMore = tracks.length > 5;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-text-primary">Tracklist</h3>
      <div className="flex flex-col">
        {visible.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-3 py-1.5 text-sm"
          >
            <span className="w-6 shrink-0 text-right font-mono text-xs text-text-tertiary">
              {track.position}
            </span>
            <span className="min-w-0 flex-1 truncate text-text-secondary">{track.title}</span>
            {track.timestamp_seconds != null && (
              <span className="font-mono text-xs text-text-tertiary">
                {formatDuration(track.timestamp_seconds)}
              </span>
            )}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> Show all {tracks.length} tracks
            </>
          )}
        </button>
      )}
    </div>
  );
}
