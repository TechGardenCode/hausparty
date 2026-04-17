import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { auth } from "@/lib/auth";
import { getRecentPlays } from "@/lib/queries/history";
import { SetRow } from "@/components/set-row";
import { EmptyState } from "@/components/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "History | hausparty",
};

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await auth();
  const user = session?.user ?? null;
  if (!user?.id) redirect("/sign-in");

  const plays = await getRecentPlays(user.id, 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-text-secondary" />
        <h1 className="text-2xl font-bold">History</h1>
      </div>

      {plays.length === 0 ? (
        <EmptyState
          icon={History}
          message="No plays yet. Find a set and hit play."
        />
      ) : (
        <div className="flex flex-col">
          {plays.map((set) => (
            <div key={set.id} className="flex flex-col">
              <SetRow
                slug={set.slug}
                artistNames={set.artists.map((a: { name: string }) => a.name)}
                eventName={set.event?.name || null}
                durationSeconds={set.duration_seconds}
                platform={set.sources[0]?.platform}
                sourceCount={set.sources.length}
                thumbnailUrl={set.thumbnailUrl}
              />
              <span className="ml-3 -mt-1 mb-2 text-xs text-text-tertiary">
                Played {formatRelativeDate(set.lastHeartbeatAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
