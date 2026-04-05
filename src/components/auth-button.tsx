import Link from "next/link";
import { auth } from "@/lib/auth";
import { signInAction, signOutAction } from "@/lib/actions/auth";

export async function AuthButton() {
  const session = await auth();
  const user = session?.user ?? null;

  if (user) {
    const initials = (user.email || "U")[0].toUpperCase();
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/library"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/20 text-sm font-medium text-accent-primary"
        >
          {initials}
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm text-text-tertiary transition-colors hover:text-text-secondary"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={signInAction}>
      <button
        type="submit"
        className="rounded-lg bg-bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
      >
        Sign in
      </button>
    </form>
  );
}
