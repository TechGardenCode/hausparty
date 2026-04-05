"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Library, Settings, LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";

interface AvatarMenuProps {
  email: string;
  initials: string;
}

const menuItems = [
  { label: "Library", href: "/library", icon: Library },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function AvatarMenu({ email, initials }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  // Total focusable items: menu links + sign out button
  const totalItems = menuItems.length + 1;

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Click-outside detection
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Focus first item when menu opens
  useEffect(() => {
    if (open) {
      itemRefs.current[0]?.focus();
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = itemRefs.current.findIndex(
        (ref) => ref === document.activeElement
      );
      let nextIndex: number;
      if (e.key === "ArrowDown") {
        nextIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
      }
      itemRefs.current[nextIndex]?.focus();
      return;
    }

    // Tab past last item closes menu
    if (e.key === "Tab") {
      const currentIndex = itemRefs.current.findIndex(
        (ref) => ref === document.activeElement
      );
      if (
        (!e.shiftKey && currentIndex === totalItems - 1) ||
        (e.shiftKey && currentIndex === 0)
      ) {
        setOpen(false);
      }
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/20 text-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary/30"
      >
        {initials}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleKeyDown}
          className="absolute right-0 top-full mt-2 w-[220px] origin-top-right rounded-lg border border-border-subtle bg-bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.4)] [animation:avatar-menu-in_150ms_ease-out]"
        >
          {/* User identity row */}
          <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-medium text-accent-primary">
              {initials}
            </div>
            <span className="truncate text-xs text-text-secondary">
              {email}
            </span>
          </div>

          {/* Menu links */}
          <div className="py-1">
            {menuItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => { itemRefs.current[index] = el; }}
                role="menuitem"
                tabIndex={-1}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary focus:bg-bg-surface-hover focus:text-text-primary focus:outline-none"
              >
                <item.icon className="h-4 w-4 text-text-tertiary" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-border-subtle py-1">
            <form action={signOutAction}>
              <button
                type="submit"
                ref={(el) => { itemRefs.current[menuItems.length] = el; }}
                role="menuitem"
                tabIndex={-1}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary focus:bg-bg-surface-hover focus:text-text-primary focus:outline-none"
              >
                <LogOut className="h-4 w-4 text-text-tertiary" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
