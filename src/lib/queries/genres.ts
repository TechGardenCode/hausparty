import { db } from "@/lib/db";
import { genres } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getAllGenres() {
  const data = await db.query.genres.findMany({
    orderBy: [genres.name],
  });

  return data.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
  }));
}

export async function getGenreBySlug(slug: string) {
  const data = await db.query.genres.findFirst({
    where: eq(genres.slug, slug),
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
  };
}
