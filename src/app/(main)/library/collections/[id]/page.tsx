import { redirect, notFound } from "next/navigation";
import { Trash2, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCollectionById } from "@/lib/queries/library";
import { SetRow } from "@/components/set-row";
import { EmptyState } from "@/components/empty-state";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const collection = await getCollectionById(id, user.id);
  if (!collection) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{collection.name}</h1>
        <form
          action={async () => {
            "use server";
            const { deleteCollection: del } = await import(
              "@/lib/actions/library"
            );
            await del(id);
            redirect("/library?tab=collections");
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-bg-surface px-3 py-1.5 text-sm text-accent-negative transition-colors hover:bg-bg-surface-hover"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </form>
      </div>

      <div className="flex flex-col">
        {collection.sets.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            message="This collection is empty."
          />
        ) : (
          collection.sets.map((set) => (
            <SetRow
              key={set.id}
              slug={set.slug}
              artistNames={set.artists.map((a) => a.name)}
              eventName={set.event?.name || null}
              durationSeconds={set.duration_seconds}
              platform={set.sources[0]?.platform}
              sourceCount={set.sources.length}
              thumbnailUrl={set.thumbnailUrl}
            />
          ))
        )}
      </div>
    </div>
  );
}
