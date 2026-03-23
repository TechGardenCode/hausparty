import Link from "next/link";
import Image from "next/image";

interface ArtistCardProps {
  slug: string;
  name: string;
  imageUrl: string | null;
  genreNames: string[];
  setCount: number;
}

export function ArtistCard({
  slug,
  name,
  imageUrl,
  genreNames,
  setCount,
}: ArtistCardProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/artists/${slug}`}
      className="group flex flex-col items-center gap-3 rounded-lg p-4 transition-colors hover:bg-bg-surface"
    >
      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-bg-surface group-hover:bg-bg-surface-hover">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-lg font-bold text-text-tertiary">
            {initials}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-sm font-semibold text-text-primary">{name}</span>
        <span className="text-xs text-text-secondary">
          {genreNames.slice(0, 2).join(", ")}
        </span>
        <span className="text-xs text-text-tertiary">
          {setCount} {setCount === 1 ? "set" : "sets"}
        </span>
      </div>
    </Link>
  );
}
