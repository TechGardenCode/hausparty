import Link from "next/link";
import { Home, Search, Library } from "lucide-react";

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-bg-primary/95 backdrop-blur-sm sm:hidden">
      <div className="flex h-14 items-center justify-around">
        <Link
          href="/"
          className="flex flex-col items-center gap-0.5 text-text-secondary transition-colors hover:text-text-primary"
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link
          href="/search"
          className="flex flex-col items-center gap-0.5 text-text-secondary transition-colors hover:text-text-primary"
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px]">Search</span>
        </Link>
        <Link
          href="/library"
          className="flex flex-col items-center gap-0.5 text-text-secondary transition-colors hover:text-text-primary"
        >
          <Library className="h-5 w-5" />
          <span className="text-[10px]">Library</span>
        </Link>
      </div>
    </nav>
  );
}
