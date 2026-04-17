"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Intent = "warning" | "danger";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Explanatory body. Can be a string or node (e.g. counts grid). */
  description: React.ReactNode;
  /** The confirm button label, e.g. "Delete", "Merge", "Archive". */
  confirmLabel: string;
  /** The cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Visual + color cue. `warning` = amber, `danger` = red. Defaults to `warning`. */
  intent?: Intent;
  /** Set true while the confirm action is running — disables buttons, shows spinner. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Bespoke confirmation modal matching hausparty's design tokens — portal-rendered
 * with overlay, focus trap, escape-to-cancel, body scroll lock. Use for destructive
 * or irreversible actions instead of window.confirm().
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  intent = "warning",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleCancel = useCallback(() => {
    if (!loading) onCancel();
  }, [loading, onCancel]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prior;
    };
  }, [open]);

  // Focus trap + escape key
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled])'
    );
    // Focus the cancel button by default — destructive-safe.
    focusables?.[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled])'
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
  }, [open, handleCancel]);

  if (!open || typeof document === "undefined") return null;

  const accent =
    intent === "danger"
      ? {
          iconBg: "bg-accent-negative/15",
          iconText: "text-accent-negative",
          btn: "bg-accent-negative hover:bg-accent-negative/90",
        }
      : {
          iconBg: "bg-accent-warm/15",
          iconText: "text-accent-warm",
          btn: "bg-accent-warm hover:bg-accent-warm/90",
        };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={handleCancel}
        disabled={loading}
        className="absolute inset-0 bg-black/60 [animation:drawer-overlay-in_150ms_ease-out] disabled:cursor-default"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "relative w-full max-w-md rounded-xl border border-border-subtle bg-bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
          "[animation:drawer-panel-in-right_180ms_ease-out]"
        )}
      >
        <div className="flex gap-3 p-5">
          <div
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
              accent.iconBg
            )}
          >
            <AlertTriangle className={cn("h-5 w-5", accent.iconText)} />
          </div>
          <div className="flex-1 pt-0.5">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-text-primary"
            >
              {title}
            </h2>
            <div className="mt-1.5 text-sm text-text-secondary">
              {description}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-hover hover:text-text-primary disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50",
              accent.btn
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
