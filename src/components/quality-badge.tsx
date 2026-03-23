import { cn } from "@/lib/utils";
import type { SourceType } from "@/lib/types/database";

const styles: Record<SourceType, string> = {
  official: "bg-accent-positive/15 text-accent-positive",
  artist: "bg-accent-primary/15 text-accent-primary",
  fan: "bg-accent-warm/15 text-accent-warm",
};

const labels: Record<SourceType, string> = {
  official: "Official",
  artist: "Artist",
  fan: "Fan",
};

export function QualityBadge({ sourceType }: { sourceType: SourceType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        styles[sourceType]
      )}
    >
      {labels[sourceType]}
    </span>
  );
}
