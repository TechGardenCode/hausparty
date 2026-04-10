import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { OpenPanelComponent } from "@openpanel/nextjs";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <OpenPanelComponent
          clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!}
          scriptUrl="/api/op/op1.js"
          trackScreenViews
          trackOutgoingLinks
          trackAttributes
        />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
