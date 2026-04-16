import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sets } from "@/lib/db/schema";
import { SetMergeForm } from "@/components/set-merge-form";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Merge Set | hausparty Admin",
};

export default async function MergeSetPage({ params }: Props) {
  const { id } = await params;

  const [fromSet] = await db
    .select({
      id: sets.id,
      title: sets.title,
      slug: sets.slug,
      status: sets.status,
      mergeCandidateFor: sets.mergeCandidateFor,
    })
    .from(sets)
    .where(eq(sets.id, id))
    .limit(1);

  if (!fromSet) notFound();

  let suggestedTarget: { id: string; title: string; slug: string } | null = null;
  if (fromSet.mergeCandidateFor) {
    const [target] = await db
      .select({ id: sets.id, title: sets.title, slug: sets.slug })
      .from(sets)
      .where(eq(sets.id, fromSet.mergeCandidateFor))
      .limit(1);
    suggestedTarget = target ?? null;
  }

  if (fromSet.status === "merged") {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/sets"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-accent-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sets
        </Link>
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
          <h1 className="text-xl font-bold">Already merged</h1>
          <p className="mt-2 text-text-secondary">
            This set has status <code>merged</code> — it can&apos;t be merged again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/sets"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-text-secondary hover:text-accent-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sets
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Merge set</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Fold this set into a canonical target. Sources, saves, collections and
          lineup move; tracklist entries on this set are dropped; the slug is
          redirected.
        </p>
      </div>

      <SetMergeForm
        from={{ id: fromSet.id, title: fromSet.title, slug: fromSet.slug }}
        suggestedTarget={suggestedTarget}
      />
    </div>
  );
}
