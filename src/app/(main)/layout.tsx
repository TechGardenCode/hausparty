import { NavBar } from "@/components/nav-bar";
import { MobileNav } from "@/components/mobile-nav";
import { PlayerProvider } from "@/components/player/player-context";
import { PersistentIframe } from "@/components/player/persistent-iframe";
import { MiniPlayer } from "@/components/player/mini-player";
import { ResumePrompt } from "@/components/player/resume-prompt";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <NavBar />
      <main className="mx-auto max-w-[1200px] px-4 pb-20 pt-6 sm:pb-6">
        <PersistentIframe />
        {children}
      </main>
      <ResumePrompt />
      <MiniPlayer />
      <MobileNav />
    </PlayerProvider>
  );
}
