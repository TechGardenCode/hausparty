"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, X } from "lucide-react";
import { useResumeEntry } from "@/lib/hooks/use-resume";
import { usePlayer } from "./player-context";
import { cn } from "@/lib/utils";

/**
 * One-shot resume pill. Renders under the mini-player / above the mobile nav
 * when the user loads the app and we have a recent (<24h) resume entry. Hides
 * itself once the player starts playing a set — the user either resumed or
 * started something new.
 */
export function ResumePrompt() {
  const { entry, dismiss } = useResumeEntry();
  const { state } = usePlayer();
  const pathname = usePathname();

  if (!entry) return null;
  if (state.status === "active") return null;
  // The set page itself auto-resumes from localStorage, so the pill would be
  // a redundant "resume this page you are on" pill. Hide it there.
  if (pathname === `/sets/${entry.setSlug}`) return null;

  return (
    <div
      className={cn(
        "fixed left-1/2 z-[55] flex -translate-x-1/2 items-center gap-3 rounded-full border border-border-subtle bg-bg-surface/95 px-4 py-2 text-sm shadow-lg backdrop-blur-sm",
        "bottom-20 sm:bottom-4"
      )}
    >
      <Link
        href={`/sets/${entry.setSlug}?resume=${Math.max(0, Math.floor(entry.positionSeconds))}`}
        className="flex items-center gap-2 font-medium text-text-primary hover:text-accent-primary"
        onClick={dismiss}
      >
        <Play className="h-4 w-4 fill-accent-primary text-accent-primary" />
        <span className="max-w-[40vw] truncate sm:max-w-xs">
          Resume {entry.setTitle}
        </span>
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss resume prompt"
        className="rounded-full p-1 text-text-tertiary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
