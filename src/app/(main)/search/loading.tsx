import { Skeleton, SetRowSkeleton, TextSkeleton } from "@/components/skeleton";

export default function SearchLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Search input skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-border-subtle pb-2">
        <TextSkeleton width="w-16" />
        <TextSkeleton width="w-16" />
        <TextSkeleton width="w-20" />
      </div>

      {/* Results skeleton */}
      <div className="flex flex-col">
        {Array.from({ length: 8 }).map((_, i) => (
          <SetRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
