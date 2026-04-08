"use client";

import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  className?: string;
}

export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const { toast } = useToast();

  async function handleClick() {
    const shareData = { title, text, url };

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      // User cancelled share sheet — not an error
      if (err instanceof Error && err.name === "AbortError") return;
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied", "success");
    } catch {
      toast("Couldn't share", "error");
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Share"
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors max-sm:px-2.5",
        "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary",
        className
      )}
    >
      <Share2 className="h-4 w-4" />
      <span className="max-sm:hidden">Share</span>
    </button>
  );
}
