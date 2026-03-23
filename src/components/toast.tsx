"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 3000;
const EXIT_ANIMATION_MS = 200;

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismiss = useCallback((id: number) => {
    // Start exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextId++;
      setToasts((prev) => {
        const next = [...prev, { id, message, type, exiting: false }];
        // Keep only the most recent MAX_VISIBLE
        if (next.length > MAX_VISIBLE) {
          const removed = next.shift();
          if (removed) {
            const timer = timersRef.current.get(removed.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(removed.id);
            }
          }
        }
        return next;
      });

      const timer = setTimeout(() => {
        dismiss(id);
        timersRef.current.delete(id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
        ? XCircle
        : Info;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg transition-all duration-200",
        "bg-bg-surface text-text-primary",
        toast.exiting
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100",
        toast.type === "success" && "border-accent-positive/30",
        toast.type === "error" && "border-accent-negative/30",
        toast.type === "info" && "border-border-subtle"
      )}
      style={{
        animation: toast.exiting
          ? undefined
          : "toast-enter 0.2s ease-out forwards",
      }}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          toast.type === "success" && "text-accent-positive",
          toast.type === "error" && "text-accent-negative",
          toast.type === "info" && "text-text-secondary"
        )}
      />
      <span className="text-sm">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 shrink-0 text-text-tertiary transition-colors hover:text-text-primary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
