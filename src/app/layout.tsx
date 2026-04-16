import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { OpenPanelComponent } from "@openpanel/nextjs";
import { auth } from "@/lib/auth";
import { AnalyticsIdentity } from "@/components/analytics-identity";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "hausparty — Live DJ Set Discovery",
  description:
    "Discover and experience live DJ sets from festivals, raves, and club events worldwide. The definitive destination for live electronic music.",
  openGraph: {
    siteName: "hausparty",
    type: "website",
    title: "hausparty — discover live DJ sets",
    description:
      "Find and save the best live DJ sets from YouTube and SoundCloud.",
  },
  twitter: {
    card: "summary",
    title: "hausparty",
    description:
      "Find and save the best live DJ sets from YouTube and SoundCloud.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
  return (
    <html lang="en" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV=${JSON.stringify({ SENTRY_DSN: sentryDsn }).replace(/</g, "\\u003c")};`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <OpenPanelComponent
          clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!}
          scriptUrl="/api/op/op1.js"
          apiUrl="/api/op"
          trackScreenViews
          trackOutgoingLinks
          trackAttributes
        />
        <AnalyticsIdentity
          user={session?.user ? { id: session.user.id!, name: session.user.name, email: session.user.email } : null}
        />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
