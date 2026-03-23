import { Skeleton, TextSkeleton, SetRowSkeleton } from "@/components/skeleton";

export default function LibraryLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <TextSkeleton width="w-24" className="h-7" />
        <TextSkeleton width="w-16" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-24" />
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <SetRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
