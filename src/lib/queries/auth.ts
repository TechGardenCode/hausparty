// Auth queries have been consolidated into @/lib/auth-helpers.
// Re-export for backwards compatibility.
export {
  getCurrentUser,
  requireAuth,
  getUserRole,
  isAdmin,
  requireAdmin,
} from "@/lib/auth-helpers";
