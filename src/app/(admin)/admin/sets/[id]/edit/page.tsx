import { notFound } from "next/navigation";
import { getSetForEdit, getAllGenres } from "@/lib/queries/admin";
import { SetEditorForm } from "./set-editor-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Set | hausparty Admin",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSetPage({ params }: Props) {
  const { id } = await params;
  const [set, allGenres] = await Promise.all([
    getSetForEdit(id),
    getAllGenres(),
  ]);

  if (!set) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Set</h1>
        <a
          href="/admin/sets"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          Back to sets
        </a>
      </div>
      <SetEditorForm set={set} allGenres={allGenres} />
    </div>
  );
}
