import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  // Redirect to the Auth.js Keycloak sign-in route.
  // This is a Route Handler that can set cookies (CSRF, state).
  const params = new URLSearchParams();
  if (callbackUrl) params.set("callbackUrl", callbackUrl);
  redirect(`/api/auth/signin/keycloak?${params.toString()}`);
}
