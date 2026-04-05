import { redirect } from "next/navigation";

export default function SignUpPage() {
  redirect("/api/auth/login?callbackUrl=%2F");
}
