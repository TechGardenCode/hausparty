"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DrawerSide = "left" | "right";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  /** Accessible title for the drawer. Rendered as the header unless `header` is provided. */
  title?: string;
  /** Optional custom header node, replaces the default title row. */
  header?: React.ReactNode;
  /** Optional id used for aria-labelledby when no title is provided. */
  ariaLabel?: string;
  children: React.ReactNode;
  /** Max width of the panel. Defaults to w-[min(20rem,85vw)]. */
  className?: string;
  /** If set, auto-close when the viewport width reaches this pixel value (e.g. 640 for sm, 768 for md). */
  closeOnMinWidth?: number;
}

/**
 * Slide-in drawer with overlay, focus trap, escape-to-close, click-outside-to-close,
 * and body scroll lock. Used by mobile nav and admin sidebar on small viewports.
 */
export function Drawer({
  open,
  onClose,
  side = "left",
  title,
  header,
  ariaLabel,
  children,
  className,
  closeOnMinWidth,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Auto-close when viewport crosses the provided breakpoint (e.g. devtools resize)
  useEffect(() => {
    if (!open || !closeOnMinWidth) return;
    const mql = window.matchMedia(`(min-width: ${closeOnMinWidth}px)`);
    if (mql.matches) {
      handleClose();
      return;
    }
    const listener = (e: MediaQueryListEvent) => {
      if (e.matches) handleClose();
    };
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [open, closeOnMinWidth, handleClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Focus management + escape key + focus trap
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element in the panel
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleClose]);

  if (!open || typeof document === "undefined") return null;

  const sideClasses =
    side === "left"
      ? "left-0 [animation:drawer-panel-in-left_200ms_ease-out]"
      : "right-0 [animation:drawer-panel-in-right_200ms_ease-out]";

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close drawer"
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 [animation:drawer-overlay-in_150ms_ease-out]"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "absolute top-0 bottom-0 flex w-[min(20rem,85vw)] flex-col border-border-subtle bg-bg-surface shadow-[0_0_24px_rgba(0,0,0,0.5)]",
          side === "left" ? "border-r" : "border-l",
          sideClasses,
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          {header ?? (
            <h2 className="text-sm font-medium text-text-primary">{title}</h2>
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
