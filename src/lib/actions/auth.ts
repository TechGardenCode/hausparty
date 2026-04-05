"use server";

import { signIn, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function signInAction() {
  await signIn("keycloak", { redirectTo: "/" });
}

export async function signOutAction() {
  // Clear the Auth.js session cookie first
  await signOut({ redirect: false });

  // Redirect to Keycloak's end-session endpoint to kill the browser SSO session
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
  const clientId = process.env.AUTH_KEYCLOAK_ID!;
  const postLogoutRedirect = encodeURIComponent(process.env.AUTH_URL || "https://hausparty.dev.techgarden.gg");
  const logoutUrl = `${issuer}/protocol/openid-connect/logout?client_id=${clientId}&post_logout_redirect_uri=${postLogoutRedirect}`;

  redirect(logoutUrl);
}
