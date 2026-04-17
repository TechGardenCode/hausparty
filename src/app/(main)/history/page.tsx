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

type BucketKey = "today" | "yesterday" | "earlier_week" | "older";
const BUCKET_ORDER: BucketKey[] = ["today", "yesterday", "earlier_week", "older"];
const BUCKET_LABEL: Record<BucketKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier_week: "Earlier this week",
  older: "Older",
};

function bucketFor(playedAt: Date, now: Date): BucketKey {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (playedAt >= startOfToday) return "today";
  if (playedAt >= startOfYesterday) return "yesterday";
  if (playedAt >= startOfWeek) return "earlier_week";
  return "older";
}

function shortTime(date: Date, now: Date): string {
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return formatRelativeDate(date, now);
}

export default async function HistoryPage() {
  const session = await auth();
  const user = session?.user ?? null;
  if (!user?.id) redirect("/sign-in");

  const plays = await getRecentPlays(user.id, 100);
  const now = new Date();

  const buckets: Record<BucketKey, typeof plays> = {
    today: [],
    yesterday: [],
    earlier_week: [],
    older: [],
  };
  for (const play of plays) {
    const playedAt =
      play.lastHeartbeatAt instanceof Date
        ? play.lastHeartbeatAt
        : new Date(play.lastHeartbeatAt);
    buckets[bucketFor(playedAt, now)].push(play);
  }

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
        <div className="flex flex-col gap-8">
          {BUCKET_ORDER.filter((k) => buckets[k].length > 0).map((key) => (
            <section key={key} className="flex flex-col gap-2">
              <h2 className="px-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">
                {BUCKET_LABEL[key]}
              </h2>
              <div className="flex flex-col">
                {buckets[key].map((set) => {
                  const playedAt =
                    set.lastHeartbeatAt instanceof Date
                      ? set.lastHeartbeatAt
                      : new Date(set.lastHeartbeatAt);
                  return (
                    <SetRow
                      key={set.id}
                      slug={set.slug}
                      artistNames={set.artists.map(
                        (a: { name: string }) => a.name
                      )}
                      eventName={set.event?.name || null}
                      durationSeconds={set.duration_seconds}
                      platform={set.sources[0]?.platform}
                      sourceCount={set.sources.length}
                      thumbnailUrl={set.thumbnailUrl}
                      trailingLabel={shortTime(playedAt, now)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
