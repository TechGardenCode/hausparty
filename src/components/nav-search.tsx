"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Search } from "lucide-react";
import { SearchOverlay } from "./search-overlay";

const subscribeMac = () => () => {};
const getMac = () => /Mac/.test(navigator.userAgent);
const getServerMac = () => false;

export function NavSearch() {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const isMac = useSyncExternalStore(subscribeMac, getMac, getServerMac);

  // Global Cmd/Ctrl+K keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === "k" &&
        (e.metaKey || e.ctrlKey) &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg bg-bg-surface px-3 py-1.5 text-sm text-text-tertiary transition-colors hover:bg-bg-surface-hover hover:text-text-secondary"
      >
        <Search className="h-4 w-4" />
        <span>Search sets, artists, festivals...</span>
        <kbd className="ml-auto hidden rounded border border-border-subtle bg-bg-primary px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary sm:inline-flex">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      <SearchOverlay isOpen={isOpen} onClose={handleClose} />
    </>
  );
}
