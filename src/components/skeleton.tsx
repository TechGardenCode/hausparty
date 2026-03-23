import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-bg-surface", className)} />
  );
}

export function TextSkeleton({
  width = "w-32",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return <Skeleton className={cn("h-4", width, className)} />;
}

export function SetCardSkeleton() {
  return (
    <div className="flex w-[280px] shrink-0 flex-col overflow-hidden rounded-lg bg-bg-surface">
      {/* Thumbnail area */}
      <Skeleton className="aspect-video w-full rounded-none" />
      {/* Text area */}
      <div className="flex flex-col gap-1 p-3">
        <TextSkeleton width="w-3/4" />
        <TextSkeleton width="w-1/2" className="h-3" />
      </div>
    </div>
  );
}

export function SetRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
      <Skeleton className="h-4 w-4 shrink-0 rounded" />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TextSkeleton width="w-40" />
        <TextSkeleton width="w-24" className="hidden sm:block" />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <TextSkeleton width="w-12" className="h-3" />
      </div>
    </div>
  );
}
