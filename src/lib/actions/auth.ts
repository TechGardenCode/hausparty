"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInAction() {
  await signIn("keycloak");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
