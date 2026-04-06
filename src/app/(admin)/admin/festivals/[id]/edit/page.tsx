import { notFound } from "next/navigation";
import { getFestivalForEdit } from "@/lib/queries/admin";
import { FestivalEditorForm } from "./festival-editor-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Festival | hausparty Admin",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminFestivalEditPage({ params }: Props) {
  const { id } = await params;
  const festival = await getFestivalForEdit(id);

  if (!festival) notFound();

  return <FestivalEditorForm festival={festival} />;
}
