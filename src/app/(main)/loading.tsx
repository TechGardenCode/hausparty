import { SetCardSkeleton, SetRowSkeleton, Skeleton, TextSkeleton } from "@/components/skeleton";

export default function MainLoading() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero skeleton */}
      <div className="flex flex-col gap-2 pt-4">
        <TextSkeleton width="w-48" className="h-8" />
        <TextSkeleton width="w-80" />
      </div>

      {/* Trending cards row */}
      <section className="flex flex-col gap-4">
        <TextSkeleton width="w-36" className="h-5" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <SetCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Recent sets list */}
      <section className="flex flex-col gap-3">
        <TextSkeleton width="w-36" className="h-5" />
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <SetRowSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Genre chips */}
      <section className="flex flex-col gap-4">
        <TextSkeleton width="w-36" className="h-5" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
