"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";

function SignUpForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";

  const [state, action, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await signUp(formData);
      return result ?? null;
    },
    null
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Join hausparty to save sets and follow artists
        </p>
      </div>
      <form action={action} className="flex flex-col gap-4">
        {redirectTo && (
          <input type="hidden" name="redirect" value={redirectTo} />
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-text-secondary">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-text-secondary">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            placeholder="••••••••"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-accent-negative">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link
          href={`/sign-in${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
          className="text-accent-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
