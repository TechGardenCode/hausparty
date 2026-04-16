import { getAdminSets, getAllGenres } from "@/lib/queries/admin";
import { SetsTable } from "./sets-table";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sets | hausparty Admin",
};

interface Props {
  searchParams: Promise<{ page?: string; status?: string; candidate?: string }>;
}

const PAGE_SIZE = 25;

const VALID_STATUSES = ["draft", "published", "merged"] as const;
type AdminSetStatus = (typeof VALID_STATUSES)[number];

export default async function AdminSetsPage({ searchParams }: Props) {
  const { page, status, candidate } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const statusFilter = (VALID_STATUSES as readonly string[]).includes(
    status ?? ""
  )
    ? (status as AdminSetStatus)
    : undefined;
  const mergeCandidatesOnly = candidate === "1";

  const [{ sets, total, pageSize }, allGenres] = await Promise.all([
    getAdminSets(currentPage, PAGE_SIZE, statusFilter, {
      mergeCandidatesOnly,
    }),
    getAllGenres(),
  ]);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <SetsTable
      sets={sets}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      allGenres={allGenres}
      statusFilter={statusFilter}
      mergeCandidatesOnly={mergeCandidatesOnly}
    />
  );
}
