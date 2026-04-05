import { signIn } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get("callbackUrl") || url.searchParams.get("redirect") || "/";
  await signIn("keycloak", { redirectTo: callbackUrl });
}
