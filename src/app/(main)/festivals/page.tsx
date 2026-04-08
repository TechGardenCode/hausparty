import Link from "next/link";
import { Music } from "lucide-react";
import { getBrowseFestivals } from "@/lib/queries/festivals";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Festivals | hausparty",
  description: "Browse electronic music festivals on hausparty.",
};

export default async function FestivalsPage() {
  const festivals = await getBrowseFestivals();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Festivals</h1>
        <span className="text-sm text-text-tertiary">{festivals.length} festivals</span>
      </div>

      {festivals.length === 0 ? (
        <EmptyState icon={Music} message="No festivals found." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((festival) => (
            <Link
              key={festival.id}
              href={`/festivals/${festival.slug}`}
              className="group relative overflow-hidden rounded-lg border border-border-subtle bg-bg-surface transition-colors hover:bg-bg-surface-hover"
            >
              {/* Hero image */}
              <div className="relative h-36">
                {festival.imageUrl ? (
                  <img
                    src={festival.imageUrl}
                    alt={festival.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-accent-primary/5">
                    <Music className="h-10 w-10 text-accent-primary/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 to-transparent" />

                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h2 className="text-lg font-bold text-text-primary group-hover:text-accent-primary">
                    {festival.name}
                  </h2>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {festival.genres.map((g) => (
                    <span
                      key={g.id}
                      className="inline-flex max-w-[8rem] shrink-0 items-center truncate whitespace-nowrap rounded-full bg-bg-surface-hover px-2 py-0.5 text-[10px] text-text-tertiary"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
                {festival.setCount > 0 && (
                  <span className="text-xs text-text-tertiary">
                    {festival.setCount} set{festival.setCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
