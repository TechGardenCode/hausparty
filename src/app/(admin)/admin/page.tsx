import Link from "next/link";
import { Disc3, Users, Inbox, AlertTriangle, Download, FileEdit, Search, Flag } from "lucide-react";
import { getAdminStats, getLastScraperRun, getPendingDiscoveryCount } from "@/lib/queries/admin";
import { getOpenReportCount } from "@/lib/actions/reports";
import { RefreshSearchButton } from "./refresh-search-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | hausparty",
};

export default async function AdminDashboardPage() {
  const [stats, lastRun, pendingDiscovery, openReports] = await Promise.all([
    getAdminStats(),
    getLastScraperRun(),
    getPendingDiscoveryCount(),
    getOpenReportCount(),
  ]);

  const cards = [
    {
      label: "Total Sets",
      value: stats.totalSets,
      icon: Disc3,
      href: "/admin/sets",
    },
    {
      label: "Total Artists",
      value: stats.totalArtists,
      icon: Users,
      href: "/admin/artists",
    },
    {
      label: "Draft Sets",
      value: stats.draftSets,
      icon: FileEdit,
      href: "/admin/sets?status=draft",
      highlight: stats.draftSets > 0,
    },
    {
      label: "Pending Submissions",
      value: stats.pendingSubmissions,
      icon: Inbox,
      href: "/admin/submissions",
      highlight: stats.pendingSubmissions > 0,
    },
    {
      label: "Sets Without Genres",
      value: stats.setsWithoutGenres,
      icon: AlertTriangle,
      href: "/admin/sets",
      warning: stats.setsWithoutGenres > 0,
    },
    {
      label: "Pending Discovery",
      value: pendingDiscovery,
      icon: Search,
      href: "/admin/discovery",
      highlight: pendingDiscovery > 0,
    },
    {
      label: "Open Reports",
      value: openReports,
      icon: Flag,
      href: "/admin/reports",
      warning: openReports > 0,
    },
    {
      label: "Last Scraper Run",
      value: lastRun
        ? `${lastRun.scraper_name} — ${lastRun.status}`
        : "None",
      icon: Download,
      href: "/admin/scrapers",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <RefreshSearchButton />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-surface p-5 transition-colors hover:bg-bg-surface-hover"
          >
            <div className="flex items-center gap-2">
              <card.icon
                className={`h-4 w-4 ${
                  card.warning
                    ? "text-accent-warm"
                    : card.highlight
                      ? "text-accent-primary"
                      : "text-text-tertiary"
                }`}
              />
              <span className="text-sm text-text-secondary">{card.label}</span>
            </div>
            <span
              className={`text-3xl font-bold ${
                card.warning
                  ? "text-accent-warm"
                  : card.highlight
                    ? "text-accent-primary"
                    : "text-text-primary"
              }`}
            >
              {card.value}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
