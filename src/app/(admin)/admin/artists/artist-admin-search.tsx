"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface Props {
  initialQuery: string;
}

export function ArtistAdminSearch({ initialQuery }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/admin/artists${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists..."
          className="w-full rounded border border-border-subtle bg-bg-primary py-1.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary"
        />
      </div>
      {initialQuery && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            router.push("/admin/artists");
          }}
          className="rounded px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary"
        >
          Clear
        </button>
      )}
    </form>
  );
}
