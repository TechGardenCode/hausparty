import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; redirect?: string }>;
}) {
  const { callbackUrl, redirect: redirectParam } = await searchParams;
  const redirectTo = callbackUrl || redirectParam || "/";
  redirect(`/api/auth/login?callbackUrl=${encodeURIComponent(redirectTo)}`);
}
