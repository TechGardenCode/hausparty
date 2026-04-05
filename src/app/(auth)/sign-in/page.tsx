import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const params = new URLSearchParams();
  if (callbackUrl) params.set("callbackUrl", callbackUrl);
  redirect(`/api/auth/signin${params.toString() ? `?${params}` : ""}`);
}
