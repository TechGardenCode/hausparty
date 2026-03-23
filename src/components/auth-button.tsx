import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function AuthButton() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const initials = (user.email || "U")[0].toUpperCase();
    return (
      <Link
        href="/library"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/20 text-sm font-medium text-accent-primary"
      >
        {initials}
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="rounded-lg bg-bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
    >
      Sign in
    </Link>
  );
}
