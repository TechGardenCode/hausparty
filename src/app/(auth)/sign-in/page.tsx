import { signIn } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; redirect?: string }>;
}) {
  const { callbackUrl, redirect: redirectParam } = await searchParams;
  const redirectTo = callbackUrl || redirectParam || "/";
  await signIn("keycloak", { redirectTo });
}
