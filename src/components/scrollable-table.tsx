"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollableTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontally scrollable wrapper for wide tables on narrow viewports.
 * Shows a right-edge fade gradient while content overflows and the user
 * hasn't scrolled to the end.
 */
export function ScrollableTable({ children, className }: ScrollableTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const hasOverflow = el.scrollWidth - el.clientWidth > 1;
      setOverflowing(hasOverflow);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const showFade = overflowing && !atEnd;

  return (
    <div className={cn("relative", className)}>
      <div ref={scrollRef} className="overflow-x-auto">
        {children}
      </div>
      {showFade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-bg-primary to-transparent"
        />
      )}
    </div>
  );
}
