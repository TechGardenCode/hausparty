"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  buildUrl: (page: number) => string;
}

/**
 * Pagination with first/last, prev/next, page numbers, and jump-to-page.
 * Designed for admin tables with potentially hundreds of pages.
 */
export function AdminPagination({ currentPage, totalPages, buildUrl }: AdminPaginationProps) {
  const [jumpValue, setJumpValue] = useState("");

  if (totalPages <= 1) return null;

  const pageRange = getPageRange(currentPage, totalPages);

  function handleJump(e: React.FormEvent) {
    e.preventDefault();
    const page = parseInt(jumpValue, 10);
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      window.location.href = buildUrl(page);
    }
    setJumpValue("");
  }

  const linkClass =
    "flex h-8 w-8 items-center justify-center rounded text-sm transition-colors hover:bg-bg-surface-hover hover:text-text-primary";
  const disabledClass =
    "flex h-8 w-8 items-center justify-center rounded text-sm text-text-tertiary/30 cursor-default";

  return (
    <div className="flex items-center justify-center gap-1">
      {/* First */}
      {currentPage > 2 ? (
        <Link href={buildUrl(1)} className={`${linkClass} text-text-tertiary`} title="First page">
          <ChevronsLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={disabledClass}><ChevronsLeft className="h-4 w-4" /></span>
      )}

      {/* Previous */}
      {currentPage > 1 ? (
        <Link href={buildUrl(currentPage - 1)} className={`${linkClass} text-text-tertiary`} title="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={disabledClass}><ChevronLeft className="h-4 w-4" /></span>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-0.5 px-1">
        {pageRange.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-text-tertiary">
              ...
            </span>
          ) : (
            <Link
              key={p}
              href={buildUrl(p as number)}
              className={`flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-sm transition-colors ${
                p === currentPage
                  ? "bg-accent-primary/20 font-medium text-accent-primary"
                  : "text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
              }`}
            >
              {p}
            </Link>
          )
        )}
      </div>

      {/* Next */}
      {currentPage < totalPages ? (
        <Link href={buildUrl(currentPage + 1)} className={`${linkClass} text-text-tertiary`} title="Next page">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={disabledClass}><ChevronRight className="h-4 w-4" /></span>
      )}

      {/* Last */}
      {currentPage < totalPages - 1 ? (
        <Link href={buildUrl(totalPages)} className={`${linkClass} text-text-tertiary`} title="Last page">
          <ChevronsRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={disabledClass}><ChevronsRight className="h-4 w-4" /></span>
      )}

      {/* Jump to page */}
      {totalPages > 10 && (
        <form onSubmit={handleJump} className="ml-3 flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            placeholder="#"
            className="h-8 w-14 rounded border border-border-subtle bg-bg-primary px-2 text-center text-sm text-text-primary placeholder:text-text-tertiary"
          />
          <button
            type="submit"
            className="h-8 rounded border border-border-subtle px-2 text-xs text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
          >
            Go
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Generate page numbers with ellipsis: [1, ..., 4, 5, 6, ..., 20]
 */
function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  // Always show first page
  pages.push(1);

  // Left ellipsis
  if (current > 3) {
    pages.push("...");
  }

  // Window around current page
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Right ellipsis
  if (current < total - 2) {
    pages.push("...");
  }

  // Always show last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}
