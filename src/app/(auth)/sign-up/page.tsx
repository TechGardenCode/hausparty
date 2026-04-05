import { signIn } from "@/lib/auth";

export default async function SignUpPage() {
  await signIn("keycloak", { redirectTo: "/" });
}
