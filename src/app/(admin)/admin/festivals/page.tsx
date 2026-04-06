import Link from "next/link";
import { Pencil } from "lucide-react";
import { getAllFestivals } from "@/lib/queries/festivals";
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

      <div className="overflow-x-auto">
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
                <td className="py-3">
                  <Link
                    href={`/admin/festivals/${festival.id}/edit`}
                    className="rounded p-1 text-text-tertiary hover:text-accent-primary"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
