import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/lib/db/types";

export async function getCurrentUser(): Promise<{ id: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id };
}

export async function requireAuth(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const [row] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .limit(1);
  return (row?.role as UserRole) ?? "viewer";
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === "site_admin";
}

export async function requireAdmin(): Promise<string> {
  const userId = await requireAuth();
  const admin = await isAdmin(userId);
  if (!admin) throw new Error("Forbidden");
  return userId;
}
