import Link from "next/link";
import { auth } from "@/lib/auth";

export async function AuthButton() {
  const session = await auth();
  const user = session?.user ?? null;

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
