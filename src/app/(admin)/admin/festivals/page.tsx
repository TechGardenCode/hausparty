import Link from "next/link";
import { Pencil } from "lucide-react";
import { getAllFestivals } from "@/lib/queries/festivals";
import { ScrollableTable } from "@/components/scrollable-table";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Festivals | hausparty Admin",
};

export default async function AdminFestivalsPage() {
  const festivals = await getAllFestivals();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Festivals</h1>
        <span className="text-sm text-text-tertiary">{festivals.length} total</span>
      </div>

      <ScrollableTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-text-tertiary">
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Slug</th>
              <th className="pb-3 pr-4 font-medium">Image</th>
              <th className="pb-3 pr-4 font-medium">Genres</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {festivals.map((festival) => (
              <tr
                key={festival.id}
                className="border-b border-border-subtle last:border-0"
              >
                <td className="py-3 pr-4">
                  <Link
                    href={`/festivals/${festival.slug}`}
                    className="text-text-primary hover:text-accent-primary"
                  >
                    {festival.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-text-tertiary">
                  {festival.slug}
                </td>
                <td className="py-3 pr-4">
                  {festival.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- festival thumbs come from arbitrary external hosts; admin-only view, LCP not a concern
                    <img
                      src={festival.image_url}
                      alt=""
                      className="h-8 w-14 rounded object-cover"
                    />
                  ) : (
                    <span className="text-xs text-text-tertiary">—</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-text-secondary">
                  {festival.genres.map((g) => g.name).join(", ") || "—"}
                </td>
                <td className="py-3 pl-2 pr-4">
                  <Link
                    href={`/admin/festivals/${festival.id}/edit`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-surface-hover hover:text-accent-primary"
                    title="Edit"
                    aria-label="Edit festival"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </div>
  );
}
