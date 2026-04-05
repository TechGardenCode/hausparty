import { signIn } from "@/lib/auth";

export default async function SignInPage() {
  // Auto-redirect to Keycloak — this page is only hit when
  // Auth.js middleware redirects unauthenticated users here
  await signIn("keycloak", { redirectTo: "/" });
}
