import { notFound } from "next/navigation";
import { getArtistWithSets } from "@/lib/queries/admin";
import { ArtistEditorForm } from "./artist-editor-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Artist | hausparty Admin",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminArtistEditPage({ params }: Props) {
  const { id } = await params;
  const artist = await getArtistWithSets(id);

  if (!artist) notFound();

  return <ArtistEditorForm artist={artist} />;
}
