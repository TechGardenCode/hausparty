import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Inbox, Disc3, Users, Shield, Download, Search, HeartPulse } from "lucide-react";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/sets", label: "Sets", icon: Disc3 },
  { href: "/admin/artists", label: "Artists", icon: Users },
  { href: "/admin/scrapers", label: "Scrapers", icon: Download },
  { href: "/admin/discovery", label: "Discovery", icon: Search },
  { href: "/admin/healing", label: "Healing", icon: HeartPulse },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user) redirect("/sign-in");

  if (!user.id) redirect("/sign-in");
  const admin = await isAdmin(user.id);
  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <Shield className="h-12 w-12 text-accent-negative" />
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-text-secondary">
            You don&apos;t have permission to access the admin area.
          </p>
          <Link
            href="/"
            className="text-sm text-accent-primary hover:underline"
          >
            Back to hausparty
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border-subtle bg-bg-surface">
        <div className="flex h-14 items-center gap-2 border-b border-border-subtle px-4">
          <Link href="/" className="text-sm font-bold tracking-tight">
            haus<span className="text-accent-primary">&middot;</span>party
          </Link>
          <span className="rounded bg-accent-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-primary">
            Admin
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border-subtle p-3">
          <span className="text-xs text-text-tertiary">{user.email}</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>
    </div>
  );
}
