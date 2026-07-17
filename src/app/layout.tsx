import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { DashboardDataProvider } from "@/contexts/dashboard-data-context";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MurProtec — Dashboards Financiers",
  description:
    "POC dashboards Trésorerie Groupe et Reporting Financier — Murpro Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <DashboardDataProvider>
          <AppHeader />
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6">
            {children}
          </main>
        </DashboardDataProvider>
      </body>
    </html>
  );
}
