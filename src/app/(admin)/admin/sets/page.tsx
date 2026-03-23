import { getAdminSets, getAllGenres } from "@/lib/queries/admin";
import { SetsTable } from "./sets-table";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sets | hausparty Admin",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 25;

export default async function AdminSetsPage({ searchParams }: Props) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const [{ sets, total, pageSize }, allGenres] = await Promise.all([
    getAdminSets(currentPage, PAGE_SIZE),
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
    />
  );
}
