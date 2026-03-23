import Link from "next/link";
import { AuthButton } from "./auth-button";
import { NavSearch } from "./nav-search";

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-primary/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          haus<span className="text-accent-primary">&middot;</span>party
        </Link>
        <div className="hidden flex-1 sm:flex">
          <NavSearch />
        </div>
        <div className="ml-auto flex items-center gap-4 sm:ml-0">
          <Link
            href="/library"
            className="hidden text-sm text-text-secondary transition-colors hover:text-text-primary sm:inline"
          >
            Library
          </Link>
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}
