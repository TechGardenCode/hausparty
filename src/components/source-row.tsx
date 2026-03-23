import { Video, Headphones, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { QualityBadge } from "./quality-badge";
import type { Source } from "@/lib/types/database";

interface SourceRowProps {
  source: Source;
  isActive: boolean;
  onSelect: () => void;
}

export function SourceRow({ source, isActive, onSelect }: SourceRowProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        isActive
          ? "bg-accent-primary/10 ring-1 ring-accent-primary/30"
          : "hover:bg-bg-surface-hover"
      )}
    >
      {source.media_type === "video" ? (
        <Video className="h-4 w-4 shrink-0 text-text-secondary" />
      ) : (
        <Headphones className="h-4 w-4 shrink-0 text-text-secondary" />
      )}
      <span className="flex-1 text-sm capitalize text-text-primary">
        {source.platform}
      </span>
      <QualityBadge sourceType={source.source_type} />
      {source.quality && (
        <span className="text-xs text-text-tertiary">{source.quality}</span>
      )}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-text-tertiary hover:text-text-secondary"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </button>
  );
}
