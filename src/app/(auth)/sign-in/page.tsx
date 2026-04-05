import { signInAction } from "@/lib/actions/auth";

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Welcome back to hausparty
        </p>
      </div>
      <form action={signInAction}>
        <button
          type="submit"
          className="w-full rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-bg-primary transition-opacity hover:opacity-90"
        >
          Sign in with Keycloak
        </button>
      </form>
    </div>
  );
}
