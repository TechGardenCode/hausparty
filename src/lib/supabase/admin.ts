import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

/**
 * Service-role Supabase client that bypasses RLS.
 * Only use in trusted server-side contexts (admin routes, background jobs).
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
