import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseHref: string;
}

export function Pagination({
  currentPage,
  totalPages,
  baseHref,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {currentPage > 1 ? (
        <Link
          href={`${baseHref}?page=${currentPage - 1}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-surface text-text-secondary hover:bg-bg-surface-hover"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Link
          key={page}
          href={`${baseHref}?page=${page}`}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
            page === currentPage
              ? "bg-accent-primary text-bg-primary"
              : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover"
          )}
        >
          {page}
        </Link>
      ))}
      {currentPage < totalPages ? (
        <Link
          href={`${baseHref}?page=${currentPage + 1}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-surface text-text-secondary hover:bg-bg-surface-hover"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
