import { Skeleton, TextSkeleton, SetRowSkeleton } from "@/components/skeleton";

export default function SetDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Player skeleton */}
      <Skeleton className="aspect-video w-full rounded-lg" />

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <TextSkeleton width="w-64" className="h-7" />
            <TextSkeleton width="w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4">
          <TextSkeleton width="w-24" />
          <TextSkeleton width="w-20" />
          <TextSkeleton width="w-16" />
        </div>

        {/* Genre chips */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Tracklist skeleton */}
      <div className="flex flex-col gap-2">
        <TextSkeleton width="w-24" className="h-5" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <TextSkeleton width="w-8" className="h-3" />
            <TextSkeleton width="w-48" />
            <TextSkeleton width="w-32" className="hidden sm:block" />
          </div>
        ))}
      </div>

      {/* Related sets */}
      <section className="flex flex-col gap-3">
        <TextSkeleton width="w-48" className="h-5" />
        <div className="flex flex-col">
          {Array.from({ length: 4 }).map((_, i) => (
            <SetRowSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
