"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Menu, Search, Disc3, Tent, Music } from "lucide-react";
import { Drawer } from "./drawer";
import { SearchOverlay } from "./search-overlay";

const browseLinks = [
  { href: "/artists", label: "Artists", icon: Disc3 },
  { href: "/festivals", label: "Festivals", icon: Tent },
  { href: "/genres", label: "Genres", icon: Music },
] as const;

/**
 * Mobile-only hamburger menu rendered in the top NavBar. Opens a Drawer with
 * browse links and a search entry point. Hidden on sm+ where the desktop
 * NavBar already shows these inline.
 */
export function MobileMenu() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const openSearch = useCallback(() => {
    setDrawerOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        aria-label="Open menu"
        aria-expanded={drawerOpen}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary sm:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Drawer open={drawerOpen} onClose={closeDrawer} side="left" title="Browse" closeOnMinWidth={640}>
        <nav className="flex flex-col py-2">
          <button
            type="button"
            onClick={openSearch}
            className="flex items-center gap-3 px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
          >
            <Search className="h-4 w-4 text-text-tertiary" />
            Search sets, artists, festivals
          </button>

          <div className="my-1 h-px bg-border-subtle" />

          {browseLinks.map(({ href, label, icon: Icon }) => (
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
      </Drawer>

      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
    </>
  );
}
