import Link from "next/link";
import Image from "next/image";

interface FestivalCardProps {
  slug: string;
  name: string;
  imageUrl: string | null;
  setCount: number;
}

export function FestivalCard({
  slug,
  name,
  imageUrl,
  setCount,
}: FestivalCardProps) {
  return (
    <Link
      href={`/festivals/${slug}`}
      className="group flex w-[280px] shrink-0 flex-col overflow-hidden rounded-lg bg-bg-surface transition-colors hover:bg-bg-surface-hover"
    >
      <div className="relative aspect-video w-full bg-border-subtle">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 to-transparent" />
        <div className="absolute bottom-0 left-0 p-3">
          <span className="text-sm font-bold text-text-primary">{name}</span>
          <span className="block text-xs text-text-secondary">
            {setCount} {setCount === 1 ? "set" : "sets"}
          </span>
        </div>
      </div>
    </Link>
  );
}
