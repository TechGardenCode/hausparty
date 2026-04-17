import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { getUserActivity } from "@/lib/queries/user-activity";
import { formatRelativeDate } from "@/lib/utils";
import type { Metadata } from "next";
import type { UserAction } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "User activity | hausparty admin",
};

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const ACTION_LABEL: Record<UserAction, string> = {
  view_set: "viewed",
  play: "played",
  save: "saved",
  report: "reported",
  submit: "submitted",
};

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

export default async function UserActivityPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const rows = await getUserActivity(id, 200);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-text-secondary" />
        <h1 className="text-2xl font-bold">User activity</h1>
      </div>
      <p className="text-sm text-text-tertiary">
        User ID: <code className="font-mono text-xs">{id}</code>
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">No activity recorded.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-baseline justify-between gap-4 py-2"
            >
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="text-text-secondary">
                  {ACTION_LABEL[r.action]}
                </span>
                {r.target ? (
                  r.target.href ? (
                    <Link
                      href={r.target.href}
                      className="text-text-primary hover:text-accent-primary"
                    >
                      {r.target.label}
                    </Link>
                  ) : (
                    <span className="text-text-tertiary italic">
                      {r.target.label}
                    </span>
                  )
                ) : (
                  <span className="text-text-tertiary italic">(no target)</span>
                )}
              </div>
              <span className="shrink-0 text-xs text-text-tertiary">
                {formatRelativeDate(r.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
