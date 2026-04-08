"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleSaveSet } from "@/lib/actions/library";
import { useToast } from "@/components/toast";

export function SaveButton({
  setId,
  initialSaved,
  isAuthenticated = true,
}: {
  setId: string;
  initialSaved: boolean;
  isAuthenticated?: boolean;
}) {
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(initialSaved);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const willSave = !optimisticSaved;
    startTransition(async () => {
      setOptimisticSaved(willSave);
      const result = await toggleSaveSet(setId);
      if (result && "error" in result) {
        toast(result.error ?? "Something went wrong", "error");
        return;
      }
      toast(
        willSave ? "Set saved to library" : "Set removed from library",
        "success"
      );
    });
  }

  const label = optimisticSaved ? "Saved" : "Save";
  return (
    <button
      onClick={handleClick}
      aria-label={label}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors max-sm:px-2.5",
        optimisticSaved
          ? "bg-accent-primary/15 text-accent-primary"
          : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
      )}
    >
      <Bookmark
        className={cn("h-4 w-4", optimisticSaved && "fill-current")}
      />
      <span className="max-sm:hidden">{label}</span>
    </button>
  );
}
