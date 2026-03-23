import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getArtistWithSets } from "@/lib/queries/admin";
import { MergeForm } from "./merge-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merge Artists | hausparty Admin",
};

interface Props {
  searchParams: Promise<{ canonical?: string; duplicate?: string }>;
}

export default async function MergeArtistsPage({ searchParams }: Props) {
  const { canonical: canonicalId, duplicate: duplicateId } = await searchParams;

  if (!canonicalId || !duplicateId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/artists/duplicates"
            className="text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Merge Artists</h1>
        </div>
        <MergeForm canonical={null} duplicate={null} />
      </div>
    );
  }

  const [canonical, duplicate] = await Promise.all([
    getArtistWithSets(canonicalId),
    getArtistWithSets(duplicateId),
  ]);

  if (!canonical || !duplicate) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/artists/duplicates"
            className="text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Merge Artists</h1>
        </div>
        <p className="text-accent-negative">
          One or both artists not found. They may have already been merged.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/artists/duplicates"
          className="text-text-tertiary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Merge Artists</h1>
      </div>

      <MergeForm canonical={canonical} duplicate={duplicate} />
    </div>
  );
}
