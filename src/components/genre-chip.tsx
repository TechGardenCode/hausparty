import Link from "next/link";
import { cn } from "@/lib/utils";

export function GenreChip({
  name,
  slug,
  active,
}: {
  name: string;
  slug: string;
  active?: boolean;
}) {
  return (
    <Link
      href={`/genres/${slug}`}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-accent-primary text-bg-primary"
          : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
      )}
    >
      {name}
    </Link>
  );
}
