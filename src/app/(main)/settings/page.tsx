import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserSettings } from "@/lib/queries/user";
import { SettingsForm } from "@/components/settings-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | hausparty",
};

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user ?? null;

  if (!user?.id) redirect("/sign-in");

  const settings = await getUserSettings(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm
        initialDisplayName={settings.display_name}
        initialAvatarUrl={settings.avatar_url}
        initialAutoplay={settings.autoplay}
      />
    </div>
  );
}
