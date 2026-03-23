import Link from "next/link";
import { getSubmissions } from "@/lib/queries/admin";
import { formatRelativeDate } from "@/lib/utils";
import { SubmissionActions } from "./submission-actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submission Queue | hausparty Admin",
};

const statusTabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function SubmissionsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const activeStatus = status || "all";
  const submissions = await getSubmissions({
    status: activeStatus,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Submission Queue</h1>

      {/* Status tabs */}
      <div className="flex gap-3 border-b border-border-subtle">
        {statusTabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/submissions${key === "all" ? "" : `?status=${key}`}`}
            className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
              activeStatus === key
                ? "border-accent-primary text-accent-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {submissions.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">
          No submissions found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-text-tertiary">
                <th className="pb-3 pr-4 font-medium">URL</th>
                <th className="pb-3 pr-4 font-medium">Artist</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-border-subtle last:border-0"
                >
                  <td className="max-w-[300px] truncate py-3 pr-4">
                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-primary hover:text-accent-primary"
                    >
                      {sub.title || sub.url}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">
                    {sub.artist_name || "—"}
                  </td>
                  <td className="py-3 pr-4 text-text-tertiary">
                    {formatRelativeDate(sub.created_at)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge
                      status={sub.status}
                      matchedSet={sub.matchedSet}
                      rejectionReason={sub.rejection_reason}
                    />
                  </td>
                  <td className="py-3">
                    <SubmissionActions
                      submissionId={sub.id}
                      status={sub.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  matchedSet,
  rejectionReason,
}: {
  status: string;
  matchedSet: { slug: string; title: string } | null;
  rejectionReason: string | null;
}) {
  if (status === "approved" && matchedSet) {
    return (
      <Link
        href={`/sets/${matchedSet.slug}`}
        className="inline-block rounded-full bg-accent-positive/15 px-2.5 py-0.5 text-xs font-medium text-accent-positive hover:bg-accent-positive/25"
      >
        Approved
      </Link>
    );
  }
  if (status === "rejected") {
    return (
      <span
        className="inline-block rounded-full bg-accent-negative/15 px-2.5 py-0.5 text-xs font-medium text-accent-negative"
        title={rejectionReason || undefined}
      >
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-accent-warm/15 px-2.5 py-0.5 text-xs font-medium text-accent-warm">
      Pending
    </span>
  );
}
