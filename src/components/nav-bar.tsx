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
        <div className="hidden items-center gap-4 sm:flex">
          <Link href="/artists" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Artists
          </Link>
          <Link href="/festivals" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Festivals
          </Link>
          <Link href="/genres" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Genres
          </Link>
        </div>
        <div className="hidden flex-1 sm:flex">
          <NavSearch />
        </div>
        <div className="ml-auto hidden items-center sm:flex">
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}
