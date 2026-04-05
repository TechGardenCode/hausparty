"use server";

import { revalidatePath } from "next/cache";
import { eq, and, count as countFn } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedSets, follows, collections, collectionSets } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function toggleSaveSet(setId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const [{ value }] = await db
    .select({ value: countFn() })
    .from(savedSets)
    .where(and(eq(savedSets.userId, user.id), eq(savedSets.setId, setId)));

  const exists = value > 0;

  if (exists) {
    await db
      .delete(savedSets)
      .where(and(eq(savedSets.userId, user.id), eq(savedSets.setId, setId)));
  } else {
    await db.insert(savedSets).values({ userId: user.id, setId });
  }

  revalidatePath("/library");
  return { saved: !exists };
}

export async function toggleFollow(
  targetType: "artist" | "festival" | "genre",
  targetId: string
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const [{ value }] = await db
    .select({ value: countFn() })
    .from(follows)
    .where(
      and(
        eq(follows.userId, user.id),
        eq(follows.targetType, targetType),
        eq(follows.targetId, targetId)
      )
    );

  const exists = value > 0;

  if (exists) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.userId, user.id),
          eq(follows.targetType, targetType),
          eq(follows.targetId, targetId)
        )
      );
  } else {
    await db
      .insert(follows)
      .values({ userId: user.id, targetType, targetId });
  }

  revalidatePath("/library");
  return { following: !exists };
}

export async function createCollection(name: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  try {
    const [newCollection] = await db
      .insert(collections)
      .values({ userId: user.id, name })
      .returning({ id: collections.id });

    revalidatePath("/library");
    return { id: newCollection.id };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteCollection(collectionId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .delete(collections)
    .where(
      and(eq(collections.id, collectionId), eq(collections.userId, user.id))
    );

  revalidatePath("/library");
}

export async function addToCollection(collectionId: string, setId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .insert(collectionSets)
    .values({ collectionId, setId });

  revalidatePath("/library");
}

export async function removeFromCollection(collectionId: string, setId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  await db
    .delete(collectionSets)
    .where(
      and(
        eq(collectionSets.collectionId, collectionId),
        eq(collectionSets.setId, setId)
      )
    );

  revalidatePath("/library");
}
