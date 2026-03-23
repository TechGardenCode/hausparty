import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types/database";

export async function getUserRole(userId: string): Promise<UserRole> {
  // Use admin client to bypass RLS — this is a trusted server-side check
  // where userId is already validated by the caller's auth check.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  return (data?.role as UserRole) ?? "viewer";
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "site_admin";
}

export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const admin = await isAdmin(user.id);
  if (!admin) throw new Error("Forbidden");
  return user.id;
}
