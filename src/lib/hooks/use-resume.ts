"use client";

import { useCallback, useSyncExternalStore } from "react";

export const RESUME_STORAGE_KEY = "hausparty:resume";
export const RESUME_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface ResumeEntry {
  setSlug: string;
  setTitle: string;
  thumbnailUrl: string | null;
  platform: "youtube" | "soundcloud";
  sourceId: string;
  positionSeconds: number;
  updatedAt: number;
}

export function readResume(): ResumeEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ResumeEntry>;
    if (
      !parsed.setSlug ||
      !parsed.setTitle ||
      !parsed.platform ||
      !parsed.sourceId ||
      typeof parsed.positionSeconds !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.updatedAt > RESUME_MAX_AGE_MS) return null;
    return parsed as ResumeEntry;
  } catch {
    return null;
  }
}

export function writeResume(entry: ResumeEntry) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearResume() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RESUME_STORAGE_KEY);
  } catch {
    // ignore
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyResumeChanged() {
  for (const l of listeners) l();
}

function subscribeResume(listener: Listener) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === RESUME_STORAGE_KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => listeners.delete(listener);
}

// Cache JSON-serialized snapshot so useSyncExternalStore's referential
// equality check doesn't churn the UI on every render.
let lastSnapshotRaw: string | null = null;
let lastSnapshot: ResumeEntry | null = null;

function getSnapshot(): ResumeEntry | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RESUME_STORAGE_KEY);
  if (raw === lastSnapshotRaw) return lastSnapshot;
  lastSnapshotRaw = raw;
  lastSnapshot = readResume();
  return lastSnapshot;
}

function getServerSnapshot(): ResumeEntry | null {
  return null;
}

/**
 * Subscribe to the localStorage resume slot. Returns null during SSR and
 * after `dismiss()` so consumers can render a one-shot prompt.
 */
export function useResumeEntry(): {
  entry: ResumeEntry | null;
  dismiss: () => void;
} {
  const entry = useSyncExternalStore(
    subscribeResume,
    getSnapshot,
    getServerSnapshot
  );
  const dismiss = useCallback(() => {
    clearResume();
    lastSnapshotRaw = null;
    lastSnapshot = null;
    notifyResumeChanged();
  }, []);
  return { entry, dismiss };
}
