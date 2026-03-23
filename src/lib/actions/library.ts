"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleSaveSet(setId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { count } = await supabase
    .from("saved_sets")
    .select("set_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("set_id", setId);

  if ((count || 0) > 0) {
    await supabase
      .from("saved_sets")
      .delete()
      .eq("user_id", user.id)
      .eq("set_id", setId);
  } else {
    await supabase
      .from("saved_sets")
      .insert({ user_id: user.id, set_id: setId });
  }

  revalidatePath("/library");
  return { saved: (count || 0) === 0 };
}

export async function toggleFollow(
  targetType: "artist" | "festival" | "genre",
  targetId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { count } = await supabase
    .from("follows")
    .select("target_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if ((count || 0) > 0) {
    await supabase
      .from("follows")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId);
  } else {
    await supabase
      .from("follows")
      .insert({ user_id: user.id, target_type: targetType, target_id: targetId });
  }

  revalidatePath("/library");
  return { following: (count || 0) === 0 };
}

export async function createCollection(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/library");
  return { id: data.id };
}

export async function deleteCollection(collectionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", user.id);

  revalidatePath("/library");
}

export async function addToCollection(collectionId: string, setId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("collection_sets")
    .insert({ collection_id: collectionId, set_id: setId });

  revalidatePath("/library");
}

export async function removeFromCollection(collectionId: string, setId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("collection_sets")
    .delete()
    .eq("collection_id", collectionId)
    .eq("set_id", setId);

  revalidatePath("/library");
}
