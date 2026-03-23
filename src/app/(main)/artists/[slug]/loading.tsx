import { Skeleton, TextSkeleton, SetRowSkeleton } from "@/components/skeleton";

export default function ArtistLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <TextSkeleton width="w-48" className="h-7" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
            <TextSkeleton width="w-16" className="h-3" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <TextSkeleton width="w-full" />
          <TextSkeleton width="w-3/4" />
        </div>
      </div>

      {/* Sets by year */}
      {Array.from({ length: 2 }).map((_, yearIdx) => (
        <section key={yearIdx} className="flex flex-col gap-2">
          <TextSkeleton width="w-16" className="h-6" />
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <SetRowSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
