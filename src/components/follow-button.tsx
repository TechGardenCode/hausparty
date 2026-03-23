"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFollow } from "@/lib/actions/library";
import { useToast } from "@/components/toast";
import type { FollowTarget } from "@/lib/types/database";

export function FollowButton({
  targetType,
  targetId,
  initialFollowing,
  isAuthenticated = true,
}: {
  targetType: FollowTarget;
  targetId: string;
  initialFollowing: boolean;
  isAuthenticated?: boolean;
}) {
  const [optimisticFollowing, setOptimisticFollowing] =
    useOptimistic(initialFollowing);
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const willFollow = !optimisticFollowing;
    startTransition(async () => {
      setOptimisticFollowing(willFollow);
      const result = await toggleFollow(targetType, targetId);
      if (result && "error" in result) {
        toast(result.error ?? "Something went wrong", "error");
        return;
      }
      toast(
        willFollow ? `Following ${targetType}` : `Unfollowed ${targetType}`,
        "success"
      );
    });
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        optimisticFollowing
          ? "bg-accent-primary/15 text-accent-primary"
          : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
      )}
    >
      {optimisticFollowing ? (
        <>
          <UserCheck className="h-4 w-4" /> Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" /> Follow
        </>
      )}
    </button>
  );
}
