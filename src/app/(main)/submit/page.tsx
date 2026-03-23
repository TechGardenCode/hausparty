import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitForm } from "@/components/submit-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Set | hausparty",
  description: "Submit a DJ set recording to hausparty.",
};

export default async function SubmitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Submit a Set</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Know of a set recording on YouTube or SoundCloud? Submit it and help
          grow the archive.
        </p>
      </div>
      <SubmitForm />
    </div>
  );
}
