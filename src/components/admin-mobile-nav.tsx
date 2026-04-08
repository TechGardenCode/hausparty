"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Menu, LayoutDashboard, Inbox, Disc3, Users, Tent, Download, Search, HeartPulse, Flag } from "lucide-react";
import { Drawer } from "./drawer";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/sets", label: "Sets", icon: Disc3 },
  { href: "/admin/artists", label: "Artists", icon: Users },
  { href: "/admin/festivals", label: "Festivals", icon: Tent },
  { href: "/admin/scrapers", label: "Scrapers", icon: Download },
  { href: "/admin/discovery", label: "Discovery", icon: Search },
  { href: "/admin/healing", label: "Healing", icon: HeartPulse },
  { href: "/admin/reports", label: "Reports", icon: Flag },
] as const;

interface AdminMobileNavProps {
  email: string;
}

/**
 * Mobile-only admin top bar with hamburger → Drawer containing the admin nav.
 * Hidden at md+ where the sidebar is visible.
 */
export function AdminMobileNav({ email }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border-subtle bg-bg-surface px-4 md:hidden">
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Open admin menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="text-sm font-bold tracking-tight">
          haus<span className="text-accent-primary">&middot;</span>party
        </Link>
        <span className="rounded bg-accent-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-primary">
          Admin
        </span>
      </header>

      <Drawer open={open} onClose={closeDrawer} side="left" title="Admin" closeOnMinWidth={768}>
        <nav className="flex flex-col py-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={closeDrawer}
              className="flex items-center gap-3 px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
            >
              <Icon className="h-4 w-4 text-text-tertiary" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border-subtle px-4 py-3">
          <span className="text-xs text-text-tertiary">{email}</span>
        </div>
      </Drawer>
    </>
  );
}
