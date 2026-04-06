import { getDiscoveryQueue } from "@/lib/queries/admin";
import { buildSearchUrls } from "@/lib/services/discovery/search-urls";
import { DiscoveryQueue } from "./discovery-queue";
import { ManualSearch } from "./manual-search";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discovery | hausparty Admin",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 25;

export default async function AdminDiscoveryPage({ searchParams }: Props) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);

  const { items, total } = await getDiscoveryQueue(currentPage, PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Generate search URLs for each item
  const itemsWithUrls = items.map((item) => ({
    ...item,
    searchUrls: buildSearchUrls({
      artistName: item.artistName,
      eventName: item.eventName,
      festivalName: item.festivalName ?? undefined,
      venue: item.venue ?? undefined,
      year: item.dateStart?.slice(0, 4),
    }),
  }));

  return (
    <div className="flex flex-col gap-6">
      <ManualSearch />
      <DiscoveryQueue
        items={itemsWithUrls}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}
