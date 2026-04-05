import Link from "next/link";
import { auth } from "@/lib/auth";
import { AvatarMenu } from "./avatar-menu";

export async function AuthButton() {
  const session = await auth();
  const user = session?.user ?? null;

  if (user) {
    const initials = (user.email || "U")[0].toUpperCase();
    return <AvatarMenu email={user.email || ""} initials={initials} />;
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
