"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { ListPlus, Check, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addToCollection,
  removeFromCollection,
  createCollection,
} from "@/lib/actions/library";
import { useToast } from "@/components/toast";

export interface CollectionWithStatus {
  id: string;
  name: string;
  containsSet: boolean;
}

export function CollectionPicker({
  setId,
  initialCollections,
}: {
  setId: string;
  initialCollections: CollectionWithStatus[];
}) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] =
    useState<CollectionWithStatus[]>(initialCollections);
  const [newName, setNewName] = useState("");
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  function handleToggle(collectionId: string, currentlyContains: boolean) {
    // Optimistic update
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, containsSet: !c.containsSet } : c
      )
    );

    const collectionName =
      collections.find((c) => c.id === collectionId)?.name || "collection";

    startTransition(async () => {
      if (currentlyContains) {
        const result = await removeFromCollection(collectionId, setId);
        if (result && "error" in result) {
          // Revert optimistic update
          setCollections((prev) =>
            prev.map((c) =>
              c.id === collectionId ? { ...c, containsSet: true } : c
            )
          );
          toast(result.error ?? "Something went wrong", "error");
          return;
        }
        toast(`Removed from ${collectionName}`, "success");
      } else {
        const result = await addToCollection(collectionId, setId);
        if (result && "error" in result) {
          // Revert optimistic update
          setCollections((prev) =>
            prev.map((c) =>
              c.id === collectionId ? { ...c, containsSet: false } : c
            )
          );
          toast(result.error ?? "Something went wrong", "error");
          return;
        }
        toast(`Added to ${collectionName}`, "success");
      }
    });
  }

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    const result = await createCollection(trimmed);
    setCreating(false);

    if (result && "error" in result) {
      toast(result.error ?? "Failed to create collection", "error");
      return;
    }

    if (result && "id" in result && result.id) {
      const newCollection: CollectionWithStatus = {
        id: result.id,
        name: trimmed,
        containsSet: false,
      };
      setCollections((prev) =>
        [...prev, newCollection].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      toast(`Collection "${trimmed}" created`, "success");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          open
            ? "bg-accent-primary/15 text-accent-primary"
            : "bg-bg-surface text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
        )}
      >
        <ListPlus className="h-4 w-4" />
        Add to collection
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border-subtle bg-bg-surface shadow-lg">
          {collections.length === 0 && (
            <p className="px-3 py-3 text-sm text-text-tertiary">
              No collections yet
            </p>
          )}

          {collections.length > 0 && (
            <ul className="max-h-48 overflow-y-auto py-1">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => handleToggle(c.id, c.containsSet)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-surface-hover"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        c.containsSet
                          ? "border-accent-primary bg-accent-primary text-bg-primary"
                          : "border-border-subtle"
                      )}
                    >
                      {c.containsSet && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate text-text-primary">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border-subtle p-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New collection..."
                className="min-w-0 flex-1 rounded-lg bg-bg-primary px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="flex shrink-0 items-center justify-center rounded-lg bg-accent-primary p-1.5 text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
