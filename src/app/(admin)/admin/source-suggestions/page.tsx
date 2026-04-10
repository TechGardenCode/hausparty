import Link from "next/link";
import { getSourceSuggestions } from "@/lib/queries/admin";
import { formatRelativeDate } from "@/lib/utils";
import { ScrollableTable } from "@/components/scrollable-table";
import { SuggestionActions } from "./suggestion-actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Source Suggestions | hausparty Admin",
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

export default async function SourceSuggestionsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const activeStatus = status || "all";
  const suggestions = await getSourceSuggestions(activeStatus);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Source Suggestions</h1>

      {/* Status tabs */}
      <div className="flex gap-3 border-b border-border-subtle">
        {statusTabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/source-suggestions${key === "all" ? "" : `?status=${key}`}`}
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
      {suggestions.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">
          No source suggestions found.
        </p>
      ) : (
        <ScrollableTable>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-text-tertiary">
                <th className="pb-3 pr-4 font-medium">URL</th>
                <th className="pb-3 pr-4 font-medium">Set</th>
                <th className="pb-3 pr-4 font-medium">Type</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border-subtle last:border-0"
                >
                  <td className="max-w-[250px] truncate py-3 pr-4">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-primary hover:text-accent-primary"
                    >
                      {s.url}
                    </a>
                  </td>
                  <td className="max-w-[200px] truncate py-3 pr-4">
                    <Link
                      href={`/sets/${s.setSlug}`}
                      className="text-text-secondary hover:text-accent-primary"
                    >
                      {s.setTitle}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <SourceTypeBadge sourceType={s.sourceType} />
                  </td>
                  <td className="py-3 pr-4 text-text-tertiary">
                    {formatRelativeDate(s.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge
                      status={s.status}
                      rejectionReason={s.rejectionReason}
                    />
                  </td>
                  <td className="py-3">
                    <SuggestionActions
                      suggestionId={s.id}
                      status={s.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
      )}
    </div>
  );
}

function SourceTypeBadge({ sourceType }: { sourceType: string }) {
  const styles = {
    official: "bg-accent-positive/15 text-accent-positive",
    artist: "bg-accent-primary/15 text-accent-primary",
    fan: "bg-accent-warm/15 text-accent-warm",
  };
  const label = {
    official: "Official",
    artist: "Artist",
    fan: "Fan",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[sourceType as keyof typeof styles] || styles.fan
      }`}
    >
      {label[sourceType as keyof typeof label] || sourceType}
    </span>
  );
}

function StatusBadge({
  status,
  rejectionReason,
}: {
  status: string;
  rejectionReason: string | null;
}) {
  if (status === "approved") {
    return (
      <span className="inline-block rounded-full bg-accent-positive/15 px-2.5 py-0.5 text-xs font-medium text-accent-positive">
        Approved
      </span>
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
