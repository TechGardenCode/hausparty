"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/toast";
import { refreshSearchIndex } from "@/lib/actions/admin";

export function RefreshSearchButton() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await refreshSearchIndex();
        toast("Search index refreshed", "success");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to refresh search index", "error");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 rounded border border-border-subtle bg-bg-surface px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Refreshing..." : "Refresh search index"}
    </button>
  );
}
