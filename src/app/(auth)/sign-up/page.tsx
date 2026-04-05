import { redirect } from "next/navigation";

export default function SignUpPage() {
  // Registration is handled by Keycloak — redirect to sign-in
  redirect("/sign-in");
}
