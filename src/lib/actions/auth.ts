"use server";

import { signIn, signOut, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function signInAction() {
  await signIn("keycloak", { redirectTo: "/" });
}

export async function signOutAction() {
  const session = await auth();
  const idToken = (session as Record<string, unknown> | null)?.idToken as string | undefined;

  // Clear the Auth.js session cookie
  await signOut({ redirect: false });

  // Redirect to Keycloak's end-session endpoint to kill the browser SSO session.
  // The id_token_hint skips the "do you want to log out?" confirmation page.
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
  const postLogoutRedirect = encodeURIComponent(process.env.AUTH_URL || "https://hausparty.dev.techgarden.gg");
  let logoutUrl = `${issuer}/protocol/openid-connect/logout?post_logout_redirect_uri=${postLogoutRedirect}&client_id=${process.env.AUTH_KEYCLOAK_ID!}`;
  if (idToken) {
    logoutUrl += `&id_token_hint=${idToken}`;
  }

  redirect(logoutUrl);
}
