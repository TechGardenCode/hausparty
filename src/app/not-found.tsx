import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-primary">
      <h1 className="text-6xl font-bold text-text-tertiary">404</h1>
      <h2 className="text-lg font-semibold text-text-primary">
        Page not found
      </h2>
      <p className="max-w-md text-center text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-bg-primary transition-opacity hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  );
}
