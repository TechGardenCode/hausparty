"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <AlertTriangle className="h-10 w-10 text-accent-negative" />
      <h2 className="text-lg font-semibold text-text-primary">
        Something went wrong
      </h2>
      <p className="max-w-md text-center text-sm text-text-secondary">
        An unexpected error occurred. Please try again or navigate back to the
        home page.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-bg-primary transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
