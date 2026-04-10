"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0A0F] text-white">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="max-w-md text-center text-sm text-neutral-400">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-purple-400 px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
